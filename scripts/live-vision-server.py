"""Live vision server for ExpoPilot — MJPEG stream, metrics, snapshots, recording.

Built-in camera (dev/test):  python scripts/live-vision-server.py
External USB camera (demo): python scripts/live-vision-server.py --camera 1
Booth mode:                  python scripts/live-vision-server.py --zone booth
With recording:              python scripts/live-vision-server.py --record
"""
import argparse
import base64
import json
import math
import os
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from io import BytesIO
from threading import Lock, Thread
from datetime import datetime

import cv2
import numpy as np
from ultralytics import YOLO

# Allow importing from visual-mcp
_VISUAL_MCP_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "..", "openclaw-explanation-adapter", "visual-mcp"
)
if os.path.isdir(_VISUAL_MCP_DIR):
    sys.path.insert(0, _VISUAL_MCP_DIR)
    from tools.recognize import recognize_image as _recognize_image
else:
    _recognize_image = None

RECORD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vision_recordings")


class VisionAgentBridge:
    """Periodically sends camera frames to AutoGLM for visual scene analysis."""

    def __init__(self, interval_seconds=30):
        self.interval = interval_seconds
        self.latest_description = ""
        self.last_analysis_time = 0
        self.error_count = 0
        self._lock = Lock()

    def analyze(self, jpeg_bytes):
        if _recognize_image is None:
            return
        now = time.time()
        if now - self.last_analysis_time < self.interval:
            return
        self.last_analysis_time = now

        try:
            b64 = base64.b64encode(jpeg_bytes).decode("ascii")
            result = _recognize_image(
                prompt="用一句话简洁描述这个展览场馆监控画面的场景：画面中有多少人、他们在做什么、整体氛围如何。不要超过50个字。",
                image_base64=b64,
                timeout=60,
            )
            if result.get("success"):
                with self._lock:
                    self.latest_description = result.get("text", "") or ""
                    self.error_count = 0
            else:
                with self._lock:
                    self.error_count += 1
                    if self.error_count <= 3:
                        print(f"[vision-bridge] recognize error: {result.get('error', 'unknown')}")
        except Exception as exc:
            with self._lock:
                self.error_count += 1
                if self.error_count <= 3:
                    print(f"[vision-bridge] exception: {exc}")

    def get_description(self):
        with self._lock:
            return self.latest_description


class VisionMetricsServer:
    def __init__(self, camera_index=0, zone="entry", fps=5, record=False, backend="yolo", analyze=False):
        self.zone = zone
        self.fps = fps
        self.frame_interval = 1.0 / fps
        self.record = record
        self.backend = backend
        self.analyze = analyze
        self.recording_path = None
        self.recording_writer = None
        self.recording_start_time = None
        self.recording_frame_count = 0

        self.cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open camera {camera_index}")

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, fps)

        if backend == "yolo":
            self.model = YOLO("yolov8n.pt")
            self.hog = None
            print("[vision] Backend: YOLOv8-nano")
        else:
            self.hog = cv2.HOGDescriptor()
            self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            self.model = None
            print("[vision] Backend: HOG+SVM")

        self.bridge = VisionAgentBridge() if analyze else None
        if self.bridge:
            print("[vision] Agent bridge enabled (30s interval)")

        self.tracks = {}
        self.next_track_id = 0
        self.frame_index = 0
        self.latest_metrics = None
        self.latest_jpeg = None
        self.lock = Lock()

        if zone == "booth":
            self.roi = (0.15, 0.15, 0.85, 0.85)
            self.queue_line_y = 0.45
            self.spill_line_y = 0.78
        else:
            self.roi = (0.1, 0.05, 0.9, 0.95)
            self.queue_line_y = 0.35
            self.spill_line_y = 0.75

    def _start_recording(self, frame):
        if not self.record:
            return
        os.makedirs(RECORD_DIR, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.recording_path = os.path.join(RECORD_DIR, f"vision_{self.zone}_{ts}.mp4")
        h, w = frame.shape[:2]
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        self.recording_writer = cv2.VideoWriter(self.recording_path, fourcc, self.fps, (w, h))
        self.recording_start_time = time.time()
        self.recording_frame_count = 0
        print(f"[vision] Recording started: {self.recording_path}")

    def _write_recording_frame(self, frame):
        if self.recording_writer is not None:
            self.recording_writer.write(frame)
            self.recording_frame_count += 1

    def _stop_recording(self):
        if self.recording_writer is not None:
            self.recording_writer.release()
            duration = round(time.time() - self.recording_start_time, 1) if self.recording_start_time else 0
            print(f"[vision] Recording saved: {self.recording_path} "
                  f"({self.recording_frame_count} frames, {duration}s)")
            self.recording_writer = None
            self.recording_path = None

    def detect_people(self, frame):
        if self.backend == "yolo":
            return self._detect_people_yolo(frame)
        return self._detect_people_hog(frame)

    def _detect_people_yolo(self, frame):
        results = self.model(frame, classes=[0], verbose=False)
        dets = []
        if results[0].boxes is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            confs = results[0].boxes.conf.cpu().numpy()
            for i, (box, conf) in enumerate(zip(boxes, confs)):
                x1, y1, x2, y2 = box
                dets.append({
                    "id": f"d{i}",
                    "bbox": (int(x1), int(y1), int(x2 - x1), int(y2 - y1)),
                    "score": float(conf),
                })
        return dets

    def _detect_people_hog(self, frame):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        boxes, weights = self.hog.detectMultiScale(
            gray, winStride=(8, 8), padding=(8, 8), scale=1.05
        )
        return [
            {"id": f"d{i}", "bbox": (int(x), int(y), int(w), int(h)), "score": float(w)}
            for i, ((x, y, w, h), weight) in enumerate(zip(boxes, weights))
        ]

    def update_tracks(self, detections):
        new_tracks = {}
        used_det_ids = set()

        for det in detections:
            cx = det["bbox"][0] + det["bbox"][2] / 2
            cy = det["bbox"][1] + det["bbox"][3] / 2
            det_center = np.array([cx, cy])

            best_track_id = None
            best_dist = 60
            for tid, track in self.tracks.items():
                if tid in used_det_ids:
                    continue
                dist = np.linalg.norm(det_center - track["center"])
                if dist < best_dist:
                    best_dist = dist
                    best_track_id = tid

            if best_track_id is not None:
                track = self.tracks[best_track_id]
                track["center"] = det_center
                track["bbox"] = det["bbox"]
                track["trajectory"].append(tuple(det_center))
                if len(track["trajectory"]) > 30:
                    track["trajectory"] = track["trajectory"][-30:]
                track["speed"] = self.estimate_speed(track)
                track["frames_since_seen"] = 0
                new_tracks[best_track_id] = track
                used_det_ids.add(best_track_id)
            else:
                tid = self.next_track_id
                self.next_track_id += 1
                new_tracks[tid] = {
                    "trackId": str(tid),
                    "bbox": det["bbox"],
                    "center": det_center,
                    "trajectory": [tuple(det_center)],
                    "speed": 0.0,
                    "frames_since_seen": 0,
                }

        self.tracks = new_tracks

    def estimate_speed(self, track):
        traj = track["trajectory"]
        if len(traj) < 3:
            return 0.0
        displacement = np.linalg.norm(np.array(traj[-1]) - np.array(traj[-3]))
        return round(displacement / 3, 1)

    def compute_metrics(self, frame):
        h, w = frame.shape[:2]
        self.detect_and_track(frame)
        active_tracks = list(self.tracks.values())

        people_count = len(active_tracks)
        density = round(min(1.0, people_count / 20.0), 2)

        speeds = [t["speed"] for t in active_tracks]
        avg_speed = round(sum(speeds) / len(speeds), 2) if speeds else 0.0

        slow_tracks = [t for t in active_tracks if t["speed"] <= 0.45]
        slow_ids = [t["trackId"] for t in slow_tracks]

        queue_line_px = self.queue_line_y * h
        spill_line_px = self.spill_line_y * h

        queue_candidates = [t for t in slow_tracks if t["center"][1] >= queue_line_px]
        queue_length = len(queue_candidates)

        spill_candidates = [t for t in active_tracks if t["center"][1] >= spill_line_px]
        spillover = len(spill_candidates) >= 2

        dwell_count = len(queue_candidates) if self.zone == "booth" else 0
        linger_ratio = round(dwell_count / people_count, 2) if people_count > 0 else 0.0

        visual_description = self.bridge.get_description() if self.bridge else ""

        return {
            "frameIndex": self.frame_index,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime()) + f".{int(time.time()*1000)%1000:03d}",
            "peopleCount": people_count,
            "densityScore": density,
            "avgSpeed": avg_speed,
            "queueLength": queue_length,
            "spillover": spillover,
            "dwellCount": dwell_count,
            "lingerRatio": linger_ratio,
            "visualDescription": visual_description,
            "activeTrackIds": [t["trackId"] for t in active_tracks],
            "slowTrackIds": slow_ids,
            "spilloverTrackIds": [t["trackId"] for t in spill_candidates],
            "dwellTrackIds": [t["trackId"] for t in queue_candidates] if self.zone == "booth" else [],
        }

    def detect_and_track(self, frame):
        detections = self.detect_people(frame)
        self.update_tracks(detections)
        self.frame_index += 1

    def run_loop(self):
        last_frame_time = 0
        self._start_recording_frame = None
        try:
            while True:
                now = time.time()
                if now - last_frame_time < self.frame_interval:
                    time.sleep(0.01)
                    continue
                last_frame_time = now

                ret, frame = self.cap.read()
                if not ret:
                    continue

                # Start recording on first frame if enabled
                if self.record and self.recording_writer is None:
                    self._start_recording(frame)

                # Encode JPEG for streaming
                _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                jpeg_bytes = jpeg.tobytes()

                # Send frame to agent bridge for visual analysis
                if self.bridge:
                    self.bridge.analyze(jpeg_bytes)

                # Write recording frame
                self._write_recording_frame(frame)

                metrics = self.compute_metrics(frame)
                with self.lock:
                    self.latest_metrics = metrics
                    self.latest_jpeg = jpeg_bytes
        except KeyboardInterrupt:
            pass
        finally:
            self._stop_recording()
            self.cap.release()

    def get_latest(self):
        with self.lock:
            return self.latest_metrics

    def get_latest_frame(self):
        with self.lock:
            return self.latest_jpeg

    def get_recording_info(self):
        if self.recording_writer is None:
            return None
        return {
            "path": self.recording_path,
            "frameCount": self.recording_frame_count,
            "elapsedSeconds": round(time.time() - self.recording_start_time, 1) if self.recording_start_time else 0,
        }


class MetricsHandler(BaseHTTPRequestHandler):
    server_instance = None

    def do_GET(self):
        if self.path == "/metrics":
            self._serve_metrics()
        elif self.path == "/stream":
            self._serve_stream()
        elif self.path == "/frame":
            self._serve_frame()
        elif self.path == "/recording":
            self._serve_recording_info()
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b"ok")
        else:
            self.send_response(404)
            self.end_headers()

    def _serve_metrics(self):
        metrics = self.server_instance.get_latest()
        if metrics is None:
            self.send_response(204)
            self.end_headers()
            return
        body = json.dumps(metrics, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_stream(self):
        self.send_response(200)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        try:
            while True:
                jpeg = self.server_instance.get_latest_frame()
                if jpeg is None:
                    time.sleep(0.1)
                    continue
                self.wfile.write(b"--frame\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n")
                self.wfile.write(f"Content-Length: {len(jpeg)}\r\n".encode())
                self.wfile.write(b"\r\n")
                self.wfile.write(jpeg)
                self.wfile.write(b"\r\n")
                time.sleep(0.2)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _serve_frame(self):
        jpeg = self.server_instance.get_latest_frame()
        if jpeg is None:
            self.send_response(204)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(jpeg)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(jpeg)

    def _serve_recording_info(self):
        info = self.server_instance.get_recording_info()
        if info is None:
            body = json.dumps({"recording": False}).encode("utf-8")
        else:
            body = json.dumps({"recording": True, **info}, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description="ExpoPilot Live Vision Server")
    parser.add_argument("--camera", type=int, default=0, help="Camera index (0=built-in, 1=USB)")
    parser.add_argument("--zone", choices=["entry", "booth"], default="entry")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--fps", type=int, default=5)
    parser.add_argument("--record", action="store_true", help="Record video to disk")
    parser.add_argument("--backend", choices=["yolo", "hog"], default="yolo", help="Detection backend")
    parser.add_argument("--analyze", action="store_true", help="Send frames to AutoGLM for visual analysis")
    args = parser.parse_args()

    print(f"Starting vision server: camera={args.camera} zone={args.zone} port={args.port} record={args.record} backend={args.backend} analyze={args.analyze}")
    server = VisionMetricsServer(camera_index=args.camera, zone=args.zone, fps=args.fps, record=args.record, backend=args.backend, analyze=args.analyze)
    print(f"Camera opened: {int(server.cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(server.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")

    MetricsHandler.server_instance = server

    loop_thread = Thread(target=server.run_loop, daemon=True)
    loop_thread.start()

    httpd = HTTPServer(("127.0.0.1", args.port), MetricsHandler)
    print(f"Vision metrics  → http://127.0.0.1:{args.port}/metrics")
    print(f"MJPEG stream    → http://127.0.0.1:{args.port}/stream")
    print(f"Latest frame    → http://127.0.0.1:{args.port}/frame")
    print(f"Recording info  → http://127.0.0.1:{args.port}/recording")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        server.cap.release()


if __name__ == "__main__":
    main()

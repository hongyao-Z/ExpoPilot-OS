"""Live vision metrics server for ExpoPilot.

Built-in camera (dev/test):  python scripts/live-vision-server.py
External USB camera (demo): python scripts/live-vision-server.py --camera 1
Booth mode:                  python scripts/live-vision-server.py --zone booth
"""
import argparse
import json
import math
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Lock

import cv2
import numpy as np


class VisionMetricsServer:
    def __init__(self, camera_index=0, zone="entry", fps=5):
        self.zone = zone
        self.fps = fps
        self.frame_interval = 1.0 / fps
        self.cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open camera {camera_index}")

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, fps)

        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

        self.tracks = {}
        self.next_track_id = 0
        self.frame_index = 0
        self.latest_metrics = None
        self.lock = Lock()

        # ROI: normalized [0,1] coordinates
        if zone == "booth":
            self.roi = (0.15, 0.15, 0.85, 0.85)  # booth zone - wider
            self.queue_line_y = 0.45
            self.spill_line_y = 0.78
        else:
            self.roi = (0.1, 0.05, 0.9, 0.95)    # entry zone - taller
            self.queue_line_y = 0.35
            self.spill_line_y = 0.75

    def detect_people(self, frame):
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
            best_dist = 60  # max matching distance in pixels
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

                metrics = self.compute_metrics(frame)
                with self.lock:
                    self.latest_metrics = metrics
        except KeyboardInterrupt:
            pass
        finally:
            self.cap.release()

    def get_latest(self):
        with self.lock:
            return self.latest_metrics


class MetricsHandler(BaseHTTPRequestHandler):
    server_instance = None

    def do_GET(self):
        if self.path == "/metrics":
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
        elif self.path == "/health":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"ok")
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, fmt, *args):
        pass  # silent


def main():
    parser = argparse.ArgumentParser(description="ExpoPilot Live Vision Server")
    parser.add_argument("--camera", type=int, default=0, help="Camera index (0=built-in, 1=USB)")
    parser.add_argument("--zone", choices=["entry", "booth"], default="entry")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--fps", type=int, default=5)
    args = parser.parse_args()

    print(f"Starting vision server: camera={args.camera} zone={args.zone} port={args.port}")
    server = VisionMetricsServer(camera_index=args.camera, zone=args.zone, fps=args.fps)
    print(f"Camera opened: {int(server.cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(server.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")

    MetricsHandler.server_instance = server

    import threading
    thread = threading.Thread(target=server.run_loop, daemon=True)
    thread.start()

    httpd = HTTPServer(("127.0.0.1", args.port), MetricsHandler)
    print(f"Vision metrics at http://127.0.0.1:{args.port}/metrics")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        server.cap.release()


if __name__ == "__main__":
    main()

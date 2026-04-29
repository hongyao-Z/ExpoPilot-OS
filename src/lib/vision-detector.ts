import { getVisionInputSource } from './vision-config'
import { loadVisionDetectionReplayPayload } from './vision-video-loader'
import type { VisionDetectionFrame, VisionDetectionReplayPayload, VisionInputSource } from './vision-types'

export interface VisionDetectorDescriptor {
  provider: 'offline-json-fallback'
  executionMode: 'replay-json'
}

export interface VisionDetector {
  descriptor: VisionDetectorDescriptor
  detect: (baseUrl: string) => Promise<VisionDetectionReplayPayload>
}

function isPoint(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

function isBoundingBox(value: unknown): value is [number, number, number, number] {
  return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

export function normalizeVisionDetectionReplayPayload(payload: VisionDetectionReplayPayload): VisionDetectionReplayPayload {
  return {
    cameraId: payload.cameraId,
    zoneHint: payload.zoneHint,
    frameRate: payload.frameRate,
    frames: [...payload.frames]
      .filter((frame) => Number.isFinite(frame.frameIndex) && typeof frame.timestamp === 'string' && Array.isArray(frame.detections))
      .sort((left, right) => left.frameIndex - right.frameIndex)
      .map((frame): VisionDetectionFrame => ({
        frameIndex: frame.frameIndex,
        timestamp: frame.timestamp,
        detections: frame.detections.filter(
          (item) =>
            typeof item.detectionId === 'string' &&
            isBoundingBox(item.bbox) &&
            typeof item.score === 'number' &&
            Number.isFinite(item.score) &&
            item.class === 'person' &&
            isPoint(item.centerPoint),
        ),
      })),
  }
}

export function createDetectionReplayDetector(source: VisionInputSource = getVisionInputSource('entry-detection-replay')): VisionDetector {
  return {
    descriptor: {
      provider: 'offline-json-fallback',
      executionMode: 'replay-json',
    },
    async detect(baseUrl: string) {
      const payload = await loadVisionDetectionReplayPayload(baseUrl, source)
      return normalizeVisionDetectionReplayPayload(payload)
    },
  }
}

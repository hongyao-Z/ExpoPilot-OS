import { getVisionInputSource } from './vision-config'
import { loadVisionTrackingReplayPayload } from './vision-video-loader'
import type { VisionInputSource, VisionPoint, VisionTrackingFrame, VisionTrackingReplayPayload } from './vision-types'

export interface VisionTrackerDescriptor {
  provider: 'offline-json-fallback'
  executionMode: 'replay-json'
  algorithm: 'bytetrack-ready'
}

export interface VisionTracker {
  descriptor: VisionTrackerDescriptor
  track: (baseUrl: string) => Promise<VisionTrackingReplayPayload>
}

function isPoint(value: unknown): value is VisionPoint {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

function isBoundingBox(value: unknown): value is [number, number, number, number] {
  return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

export function normalizeVisionTrackingReplayPayload(payload: VisionTrackingReplayPayload): VisionTrackingReplayPayload {
  return {
    cameraId: payload.cameraId,
    zoneHint: payload.zoneHint,
    frameRate: payload.frameRate,
    frames: [...payload.frames]
      .filter((frame) => Number.isFinite(frame.frameIndex) && typeof frame.timestamp === 'string' && Array.isArray(frame.tracks))
      .sort((left, right) => left.frameIndex - right.frameIndex)
      .map((frame): VisionTrackingFrame => ({
        frameIndex: frame.frameIndex,
        timestamp: frame.timestamp,
        tracks: frame.tracks.filter(
          (item) =>
            typeof item.trackId === 'string' &&
            isBoundingBox(item.bbox) &&
            isPoint(item.centerPoint) &&
            Array.isArray(item.trajectory) &&
            item.trajectory.every((point) => isPoint(point)) &&
            typeof item.speedEstimate === 'number' &&
            Number.isFinite(item.speedEstimate),
        ),
      })),
  }
}

export function createTrackingReplayTracker(source: VisionInputSource = getVisionInputSource('entry-tracking-replay')): VisionTracker {
  return {
    descriptor: {
      provider: 'offline-json-fallback',
      executionMode: 'replay-json',
      algorithm: 'bytetrack-ready',
    },
    async track(baseUrl: string) {
      const payload = await loadVisionTrackingReplayPayload(baseUrl, source)
      return normalizeVisionTrackingReplayPayload(payload)
    },
  }
}

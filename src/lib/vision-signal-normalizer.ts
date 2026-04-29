import { getPrimaryVisionInputSource } from './vision-config'
import { loadVisionReplayPayload } from './vision-video-loader'
import type { VisionReplayPayload, VisionSignal } from './vision-types'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export async function loadVisionReplaySignals(baseUrl: string, zoneId: string): Promise<VisionSignal[]> {
  const source = getPrimaryVisionInputSource()
  const payload = await loadVisionReplayPayload(baseUrl, source)
  return normalizeVisionReplayPayload(payload, zoneId)
}

export function normalizeVisionReplayPayload(payload: VisionReplayPayload, zoneId: string): VisionSignal[] {
  return [...payload.signals]
    .filter((item) => {
      return (
        typeof item.signalId === 'string' &&
        typeof item.timestamp === 'string' &&
        isFiniteNumber(item.peopleCount) &&
        isFiniteNumber(item.densityScore) &&
        isFiniteNumber(item.avgSpeed) &&
        isFiniteNumber(item.queueLength) &&
        typeof item.spillover === 'boolean' &&
        isFiniteNumber(item.confidence)
      )
    })
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
    .map((item) => ({
      signalId: item.signalId,
      sourceMode: 'camera' as const,
      cameraId: payload.cameraId,
      zoneId,
      timestamp: item.timestamp,
      peopleCount: item.peopleCount,
      densityScore: Number(item.densityScore.toFixed(2)),
      avgSpeed: Number(item.avgSpeed.toFixed(2)),
      queueLength: item.queueLength,
      spillover: item.spillover,
      confidence: Number(item.confidence.toFixed(2)),
    }))
}

import type { VisionRuntimeConfig, VisionTrack, VisionTrackingFrame, VisionTrackingReplayPayload } from './vision-types'

export interface VisionMetricsFrame {
  frameIndex: number
  timestamp: string
  peopleCount: number
  densityScore: number
  avgSpeed: number
  queueLength: number
  spillover: boolean
  dwellCount: number
  lingerRatio: number
  activeTrackIds: string[]
  slowTrackIds: string[]
  spilloverTrackIds: string[]
  dwellTrackIds: string[]
}

export function buildVisionMetricsTimeline(
  trackingPayload: VisionTrackingReplayPayload,
  config: VisionRuntimeConfig,
): VisionMetricsFrame[] {
  return trackingPayload.frames.map((frame) => buildVisionMetricsFrame(frame, config))
}

function buildVisionMetricsFrame(frame: VisionTrackingFrame, config: VisionRuntimeConfig): VisionMetricsFrame {
  const activeTrackIds = frame.tracks.map((track) => track.trackId)
  const peopleCount = computePeopleCount(frame)
  const avgSpeed = computeAverageSpeed(frame)
  const queueLineThreshold = normalizeLineThreshold(config.region.queueLine)
  const spilloverLineThreshold = normalizeLineThreshold(config.region.spilloverLine)
  const densityScore = computeDensityScore(peopleCount, config)
  const slowTrackIds = frame.tracks
    .filter((track) => isSlowTrack(track, config.thresholds.avgSpeedThreshold))
    .map((track) => track.trackId)
  const dwellTrackIds = frame.tracks
    .filter((track) => isBoothDwellCandidate(track, config, queueLineThreshold))
    .map((track) => track.trackId)
  const spilloverTrackIds = computeSpilloverTrackIds(frame, spilloverLineThreshold)

  return {
    frameIndex: frame.frameIndex,
    timestamp: frame.timestamp,
    peopleCount,
    densityScore,
    avgSpeed,
    queueLength: computeQueueLength(frame.tracks, config.thresholds.avgSpeedThreshold, queueLineThreshold, config.zoneType),
    spillover: computeSpillover(spilloverTrackIds),
    dwellCount: dwellTrackIds.length,
    lingerRatio: computeLingerRatio(dwellTrackIds.length, peopleCount),
    activeTrackIds,
    slowTrackIds,
    spilloverTrackIds,
    dwellTrackIds,
  }
}

function computePeopleCount(frame: VisionTrackingFrame) {
  return frame.tracks.length
}

function computeDensityScore(peopleCount: number, config: VisionRuntimeConfig) {
  const thresholdPeopleCount = config.thresholds.peopleCountThreshold
  const densityCapacity =
    typeof thresholdPeopleCount === 'number' && thresholdPeopleCount > 0
      ? Math.max(1, Math.ceil(thresholdPeopleCount / Math.max(config.thresholds.densityThreshold, 0.1)))
      : Math.max(1, Math.ceil(config.thresholds.queueLengthThreshold / Math.max(config.thresholds.densityThreshold, 0.1)))

  return Number(Math.min(1, peopleCount / densityCapacity).toFixed(2))
}

function computeAverageSpeed(frame: VisionTrackingFrame) {
  if (frame.tracks.length === 0) return 0
  const totalSpeed = frame.tracks.reduce((sum, track) => sum + track.speedEstimate, 0)
  return Number((totalSpeed / frame.tracks.length).toFixed(2))
}

function computeQueueLength(
  tracks: VisionTrack[],
  avgSpeedThreshold: number,
  queueLineThreshold: number,
  zoneType: VisionRuntimeConfig['zoneType'],
) {
  if (zoneType !== 'entry') return 0
  return tracks.filter((track) => isQueueCandidate(track, avgSpeedThreshold, queueLineThreshold)).length
}

function computeLingerRatio(dwellCount: number, peopleCount: number) {
  if (peopleCount === 0) return 0
  return Number((dwellCount / peopleCount).toFixed(2))
}

function computeSpillover(spilloverTrackIds: string[]) {
  return spilloverTrackIds.length >= 2
}

function computeSpilloverTrackIds(frame: VisionTrackingFrame, spilloverLineThreshold: number) {
  return frame.tracks.filter((track) => track.centerPoint[1] >= spilloverLineThreshold).map((track) => track.trackId)
}

function isSlowTrack(track: VisionTrack, avgSpeedThreshold: number) {
  return track.speedEstimate <= avgSpeedThreshold
}

function isQueueCandidate(track: VisionTrack, avgSpeedThreshold: number, queueLineThreshold: number) {
  const isSlow = isSlowTrack(track, avgSpeedThreshold)
  const isInsideQueueDepth = track.centerPoint[1] >= queueLineThreshold
  return isSlow && isInsideQueueDepth
}

function isBoothDwellCandidate(track: VisionTrack, config: VisionRuntimeConfig, queueLineThreshold: number) {
  if (config.zoneType !== 'booth') return false
  const isSlow = isSlowTrack(track, config.thresholds.avgSpeedThreshold)
  const isInsideCoreArea = track.centerPoint[1] >= queueLineThreshold
  return isSlow && isInsideCoreArea
}

function normalizeLineThreshold(line: [number, number][]) {
  if (line.length === 0) return 0
  const total = line.reduce((sum, point) => sum + point[1], 0)
  return total / line.length
}

import { BOOTH_A_CAMERA_VISION_CONFIG, ENTRY_CAMERA_VISION_CONFIG } from './vision-config'
import type { VisionMetricsFrame } from './vision-metrics'
import type { VisionEventCandidate, VisionSignal, VisionThresholdConfig } from './vision-types'

function matchesEntranceCongestionFrame(frame: VisionMetricsFrame, thresholds: VisionThresholdConfig) {
  return (
    frame.queueLength >= thresholds.queueLengthThreshold &&
    frame.densityScore >= thresholds.densityThreshold &&
    frame.avgSpeed <= thresholds.avgSpeedThreshold &&
    frame.spillover === thresholds.spilloverRequired
  )
}

function matchesBoothHeatupFrame(frame: VisionMetricsFrame, thresholds: VisionThresholdConfig) {
  return (
    frame.peopleCount >= (thresholds.peopleCountThreshold ?? 0) &&
    frame.densityScore >= thresholds.densityThreshold &&
    frame.avgSpeed <= thresholds.avgSpeedThreshold &&
    frame.dwellCount >= (thresholds.dwellCountThreshold ?? 0) &&
    frame.lingerRatio >= (thresholds.lingerRatioThreshold ?? 0)
  )
}

export function adaptVisionMetricsToEntranceCongestion(
  metricsTimeline: VisionMetricsFrame[],
  projectId: string,
  zoneId: string,
  cameraId = ENTRY_CAMERA_VISION_CONFIG.sources[0]?.cameraId ?? 'entry-camera-01',
  thresholds: VisionThresholdConfig = ENTRY_CAMERA_VISION_CONFIG.thresholds,
  existingSignals: Array<{ timestamp: string }> = [],
): VisionEventCandidate | null {
  return adaptMetricsTimeline(metricsTimeline, existingSignals, thresholds, (frame) =>
    matchesEntranceCongestionFrame(frame, thresholds)
      ? createEntranceEventCandidate(frame, projectId, zoneId, cameraId, thresholds.consecutiveWindowsRequired)
      : null,
  )
}

export function adaptVisionMetricsToBoothHeatup(
  metricsTimeline: VisionMetricsFrame[],
  projectId: string,
  zoneId: string,
  cameraId = BOOTH_A_CAMERA_VISION_CONFIG.sources[0]?.cameraId ?? 'booth-a-camera-01',
  thresholds: VisionThresholdConfig = BOOTH_A_CAMERA_VISION_CONFIG.thresholds,
  existingSignals: Array<{ timestamp: string }> = [],
): VisionEventCandidate | null {
  return adaptMetricsTimeline(metricsTimeline, existingSignals, thresholds, (frame) =>
    matchesBoothHeatupFrame(frame, thresholds)
      ? createBoothEventCandidate(frame, projectId, zoneId, cameraId, thresholds.consecutiveWindowsRequired)
      : null,
  )
}

export function adaptVisionSignalsToEntranceCongestion(
  signals: VisionSignal[],
  projectId: string,
  zoneId: string,
  thresholds: VisionThresholdConfig = ENTRY_CAMERA_VISION_CONFIG.thresholds,
): VisionEventCandidate | null {
  const metricsTimeline = signals.map((signal, index): VisionMetricsFrame => ({
    frameIndex: index,
    timestamp: signal.timestamp,
    peopleCount: signal.peopleCount,
    densityScore: signal.densityScore,
    avgSpeed: signal.avgSpeed,
    queueLength: signal.queueLength,
    spillover: signal.spillover,
    dwellCount: signal.dwellCount ?? 0,
    lingerRatio: signal.lingerRatio ?? 0,
    activeTrackIds: [],
    slowTrackIds: [],
    spilloverTrackIds: [],
    dwellTrackIds: [],
  }))

  return adaptVisionMetricsToEntranceCongestion(metricsTimeline, projectId, zoneId, signals[0]?.cameraId, thresholds)
}

function adaptMetricsTimeline(
  metricsTimeline: VisionMetricsFrame[],
  existingSignals: Array<{ timestamp: string }>,
  thresholds: VisionThresholdConfig,
  createCandidate: (frame: VisionMetricsFrame) => VisionEventCandidate | null,
): VisionEventCandidate | null {
  let consecutiveMatched = 0
  let lastTriggeredAt = getLastTriggeredAt(existingSignals)

  for (const frame of metricsTimeline) {
    const candidate = createCandidate(frame)
    if (!candidate) {
      consecutiveMatched = 0
      continue
    }

    consecutiveMatched += 1
    if (consecutiveMatched < thresholds.consecutiveWindowsRequired) continue

    const currentAt = new Date(frame.timestamp).getTime()
    if (Number.isFinite(lastTriggeredAt) && currentAt - lastTriggeredAt < thresholds.cooldownMs) {
      continue
    }

    lastTriggeredAt = currentAt
    return candidate
  }

  return null
}

function createEntranceEventCandidate(
  frame: VisionMetricsFrame,
  projectId: string,
  zoneId: string,
  cameraId: string,
  confirmedWindows: number,
): VisionEventCandidate {
  const severity: 'high' | 'critical' = frame.queueLength >= 14 || frame.densityScore >= 0.85 ? 'critical' : 'high'
  const triggerPoints = [
    'source = camera',
    'queue_length_high',
    'density_high',
    'spillover_detected',
    'speed_drop',
    `confirmed_for_${confirmedWindows}_windows`,
  ]
  const confidence = computeSignalConfidence(frame, ENTRY_CAMERA_VISION_CONFIG.thresholds)

  return {
    matchedSignal: {
      signalId: `entry-metric-${frame.frameIndex}`,
      sourceMode: 'camera',
      cameraId,
      zoneId,
      timestamp: frame.timestamp,
      peopleCount: frame.peopleCount,
      densityScore: frame.densityScore,
      avgSpeed: frame.avgSpeed,
      queueLength: frame.queueLength,
      spillover: frame.spillover,
      dwellCount: frame.dwellCount,
      lingerRatio: frame.lingerRatio,
      confidence,
    },
    triggerPoints,
    signal: {
      signal_id: `sig-camera-metric-${cameraId}-${frame.frameIndex}`,
      project_id: projectId,
      zone_id: zoneId,
      timestamp: frame.timestamp,
      source: `camera:${cameraId}`,
      idempotencyKey: `camera-${projectId}-${cameraId}-${frame.frameIndex}`,
      signal_type: 'entrance_congestion',
      severity,
      summary: `入口摄像头指标连续 ${confirmedWindows} 个窗口命中：排队人数 ${frame.queueLength}、密度 ${frame.densityScore}、平均速度 ${frame.avgSpeed}、外溢 ${frame.spillover ? '是' : '否'}。`,
      confidence,
      input_mode: 'recorded',
      raw_rules: triggerPoints,
    },
  }
}

function createBoothEventCandidate(
  frame: VisionMetricsFrame,
  projectId: string,
  zoneId: string,
  cameraId: string,
  confirmedWindows: number,
): VisionEventCandidate {
  const severity: 'high' | 'critical' = frame.dwellCount >= 5 || frame.lingerRatio >= 0.8 ? 'critical' : 'high'
  const triggerPoints = [
    'source = camera',
    'booth_people_high',
    'booth_density_high',
    'booth_speed_drop',
    'booth_dwell_cluster',
    `confirmed_for_${confirmedWindows}_windows`,
  ]
  const confidence = computeSignalConfidence(frame, BOOTH_A_CAMERA_VISION_CONFIG.thresholds)

  return {
    matchedSignal: {
      signalId: `booth-metric-${frame.frameIndex}`,
      sourceMode: 'camera',
      cameraId,
      zoneId,
      timestamp: frame.timestamp,
      peopleCount: frame.peopleCount,
      densityScore: frame.densityScore,
      avgSpeed: frame.avgSpeed,
      queueLength: frame.queueLength,
      spillover: frame.spillover,
      dwellCount: frame.dwellCount,
      lingerRatio: frame.lingerRatio,
      confidence,
    },
    triggerPoints,
    signal: {
      signal_id: `sig-camera-metric-${cameraId}-${frame.frameIndex}`,
      project_id: projectId,
      zone_id: zoneId,
      timestamp: frame.timestamp,
      source: `camera:${cameraId}`,
      idempotencyKey: `camera-${projectId}-${cameraId}-${frame.frameIndex}`,
      signal_type: 'booth_heatup',
      severity,
      summary: `展台摄像头指标连续 ${confirmedWindows} 个窗口命中：人数 ${frame.peopleCount}、密度 ${frame.densityScore}、平均速度 ${frame.avgSpeed}、驻留人数 ${frame.dwellCount}、驻留占比 ${frame.lingerRatio}。`,
      confidence,
      input_mode: 'recorded',
      raw_rules: triggerPoints,
    },
  }
}

function computeSignalConfidence(frame: VisionMetricsFrame, thresholds: VisionThresholdConfig) {
  const densityWeight = frame.densityScore
  const speedWeight = Math.min(1, Math.max(0, (thresholds.avgSpeedThreshold - frame.avgSpeed + 0.2) / 0.2))
  const peopleWeight =
    typeof thresholds.peopleCountThreshold === 'number' && thresholds.peopleCountThreshold > 0
      ? Math.min(1, frame.peopleCount / thresholds.peopleCountThreshold)
      : Math.min(1, frame.queueLength / Math.max(1, thresholds.queueLengthThreshold + 4))
  const dwellWeight =
    typeof thresholds.dwellCountThreshold === 'number' && thresholds.dwellCountThreshold > 0
      ? Math.min(1, frame.dwellCount / thresholds.dwellCountThreshold)
      : frame.spillover
        ? 1
        : 0

  return Number(((densityWeight + speedWeight + peopleWeight + dwellWeight) / 4).toFixed(2))
}

function getLastTriggeredAt(existingSignals: Array<{ timestamp: string }>) {
  if (existingSignals.length === 0) return Number.NaN
  const timestamps = existingSignals.map((signal) => new Date(signal.timestamp).getTime()).filter((value) => Number.isFinite(value))
  if (timestamps.length === 0) return Number.NaN
  return Math.max(...timestamps)
}

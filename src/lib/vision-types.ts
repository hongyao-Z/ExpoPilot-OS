export type VisionZoneHint = 'entry' | 'booth'
export type VisionSignalType = 'entrance_congestion' | 'booth_heatup'

export interface VisionSignal {
  signalId: string
  sourceMode: 'camera'
  cameraId: string
  zoneId: string
  timestamp: string
  peopleCount: number
  densityScore: number
  avgSpeed: number
  queueLength: number
  spillover: boolean
  dwellCount?: number
  lingerRatio?: number
  confidence: number
}

export type VisionInputSourceKind = 'signal-replay-json' | 'detection-json' | 'tracking-json' | 'replay-video' | 'live-camera'

export interface VisionInputSource {
  sourceId: string
  kind: VisionInputSourceKind
  cameraId: string
  label: string
  path: string
  enabled: boolean
}

export interface VisionThresholdConfig {
  queueLengthThreshold: number
  densityThreshold: number
  avgSpeedThreshold: number
  spilloverRequired: boolean
  peopleCountThreshold?: number
  dwellCountThreshold?: number
  lingerRatioThreshold?: number
  consecutiveWindowsRequired: number
  cooldownMs: number
  speedWindowSize: number
}

export interface VisionRegionConfig {
  roiPolygon: Array<[number, number]>
  queueLine: [number, number][]
  spilloverLine: [number, number][]
}

export interface VisionRuntimeConfig {
  configId: string
  zoneType: VisionZoneHint
  zoneHint: VisionZoneHint
  projectHint?: string
  primarySourceId: string
  fallbackSourceIds: string[]
  sources: VisionInputSource[]
  thresholds: VisionThresholdConfig
  region: VisionRegionConfig
}

export interface VisionReplayPayload {
  cameraId: string
  zoneHint: VisionZoneHint
  signals: Array<{
    signalId: string
    timestamp: string
    peopleCount: number
    densityScore: number
    avgSpeed: number
    queueLength: number
    spillover: boolean
    dwellCount?: number
    lingerRatio?: number
    confidence: number
  }>
}

export type VisionObjectClass = 'person'
export type VisionBoundingBox = [number, number, number, number]
export type VisionPoint = [number, number]

export interface VisionDetection {
  detectionId: string
  bbox: VisionBoundingBox
  score: number
  class: VisionObjectClass
  centerPoint: VisionPoint
}

export interface VisionDetectionFrame {
  frameIndex: number
  timestamp: string
  detections: VisionDetection[]
}

export interface VisionDetectionReplayPayload {
  cameraId: string
  zoneHint: VisionZoneHint
  frameRate: number
  frames: VisionDetectionFrame[]
}

export interface VisionTrack {
  trackId: string
  bbox: VisionBoundingBox
  centerPoint: VisionPoint
  trajectory: VisionPoint[]
  speedEstimate: number
}

export interface VisionTrackingFrame {
  frameIndex: number
  timestamp: string
  tracks: VisionTrack[]
}

export interface VisionTrackingReplayPayload {
  cameraId: string
  zoneHint: VisionZoneHint
  frameRate: number
  frames: VisionTrackingFrame[]
}

export interface VisionEventCandidate {
  signal: {
    signal_id: string
    project_id: string
    zone_id: string
    timestamp: string
    source: string
    idempotencyKey: string
    signal_type: VisionSignalType
    severity: 'high' | 'critical'
    summary: string
    confidence: number
    input_mode: 'recorded'
    raw_rules: string[]
  }
  matchedSignal: VisionSignal
  triggerPoints: string[]
}

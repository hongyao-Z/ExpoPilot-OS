import type { VisionInputSource, VisionRuntimeConfig, VisionZoneHint } from './vision-types'

export const ENTRY_CAMERA_VISION_CONFIG: VisionRuntimeConfig = {
  configId: 'vision-entry-camera-route-a',
  zoneType: 'entry',
  zoneHint: 'entry',
  projectHint: 'project-spring-2026',
  primarySourceId: 'entry-signal-replay',
  fallbackSourceIds: ['entry-detection-replay', 'entry-tracking-replay'],
  sources: [
    {
      sourceId: 'entry-signal-replay',
      kind: 'signal-replay-json',
      cameraId: 'entry-camera-01',
      label: '入口摄像头结构化信号回放',
      path: '/data/vision/entry-camera-demo.json',
      enabled: true,
    },
    {
      sourceId: 'entry-detection-replay',
      kind: 'detection-json',
      cameraId: 'entry-camera-01',
      label: '入口摄像头检测结果回放',
      path: '/data/vision/entry-detection-demo.json',
      enabled: true,
    },
    {
      sourceId: 'entry-tracking-replay',
      kind: 'tracking-json',
      cameraId: 'entry-camera-01',
      label: '入口摄像头跟踪结果回放',
      path: '/data/vision/entry-tracking-demo.json',
      enabled: true,
    },
    {
      sourceId: 'entry-video-replay',
      kind: 'replay-video',
      cameraId: 'entry-camera-01',
      label: '入口摄像头离线视频',
      path: '/data/vision/entry-camera-demo.mp4',
      enabled: true,
    },
    {
      sourceId: 'entry-live-camera',
      kind: 'live-camera',
      cameraId: 'entry-camera-01',
      label: '入口摄像头实时流',
      path: 'http://127.0.0.1:8765/stream',
      enabled: true,
    },
  ],
  thresholds: {
    queueLengthThreshold: 10,
    densityThreshold: 0.72,
    avgSpeedThreshold: 0.45,
    spilloverRequired: true,
    consecutiveWindowsRequired: 3,
    cooldownMs: 180000,
    speedWindowSize: 3,
  },
  region: {
    roiPolygon: [
      [0.12, 0.14],
      [0.86, 0.14],
      [0.94, 0.94],
      [0.08, 0.94],
    ],
    queueLine: [
      [0.18, 0.36],
      [0.82, 0.36],
    ],
    spilloverLine: [
      [0.14, 0.78],
      [0.86, 0.78],
    ],
  },
}

export const BOOTH_A_CAMERA_VISION_CONFIG: VisionRuntimeConfig = {
  configId: 'vision-booth-a-camera-route-a',
  zoneType: 'booth',
  zoneHint: 'booth',
  projectHint: 'project-spring-2026',
  primarySourceId: 'booth-a-tracking-replay',
  fallbackSourceIds: ['booth-a-detection-replay'],
  sources: [
    {
      sourceId: 'booth-a-detection-replay',
      kind: 'detection-json',
      cameraId: 'booth-a-camera-01',
      label: '展台 A 摄像头检测结果回放',
      path: '/data/vision/booth-a-detection-demo.json',
      enabled: true,
    },
    {
      sourceId: 'booth-a-tracking-replay',
      kind: 'tracking-json',
      cameraId: 'booth-a-camera-01',
      label: '展台 A 摄像头跟踪结果回放',
      path: '/data/vision/booth-a-tracking-demo.json',
      enabled: true,
    },
    {
      sourceId: 'booth-a-video-replay',
      kind: 'replay-video',
      cameraId: 'booth-a-camera-01',
      label: '展台 A 摄像头离线视频',
      path: '/data/vision/booth-a-camera-demo.mp4',
      enabled: false,
    },
    {
      sourceId: 'booth-a-live-camera',
      kind: 'live-camera',
      cameraId: 'booth-a-camera-01',
      label: '展台 A 摄像头实时流',
      path: 'http://127.0.0.1:8765/stream',
      enabled: true,
    },
  ],
  thresholds: {
    queueLengthThreshold: 0,
    densityThreshold: 0.72,
    avgSpeedThreshold: 0.24,
    spilloverRequired: false,
    peopleCountThreshold: 5,
    dwellCountThreshold: 4,
    lingerRatioThreshold: 0.65,
    consecutiveWindowsRequired: 3,
    cooldownMs: 180000,
    speedWindowSize: 3,
  },
  region: {
    roiPolygon: [
      [0.18, 0.18],
      [0.84, 0.18],
      [0.86, 0.86],
      [0.16, 0.86],
    ],
    queueLine: [
      [0.22, 0.44],
      [0.78, 0.44],
    ],
    spilloverLine: [
      [0.2, 0.84],
      [0.8, 0.84],
    ],
  },
}

export function getVisionConfigByZoneType(zoneType: VisionZoneHint): VisionRuntimeConfig {
  return zoneType === 'booth' ? BOOTH_A_CAMERA_VISION_CONFIG : ENTRY_CAMERA_VISION_CONFIG
}

export function getVisionInputSource(sourceId: string, config: VisionRuntimeConfig = ENTRY_CAMERA_VISION_CONFIG): VisionInputSource {
  const source = config.sources.find((item) => item.sourceId === sourceId)
  if (!source) {
    throw new Error(`Unknown vision input source: ${sourceId}`)
  }

  return source
}

export function getPrimaryVisionInputSource(config: VisionRuntimeConfig = ENTRY_CAMERA_VISION_CONFIG): VisionInputSource {
  return getVisionInputSource(config.primarySourceId, config)
}

export function getFallbackVisionInputSources(config: VisionRuntimeConfig = ENTRY_CAMERA_VISION_CONFIG): VisionInputSource[] {
  return config.fallbackSourceIds.map((sourceId) => getVisionInputSource(sourceId, config))
}

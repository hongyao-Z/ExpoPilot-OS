import type { VisionMetricsFrame } from './vision-metrics'

export interface LiveVisionSourceDescriptor {
  provider: 'live-opencv-server'
  url: string
}

export interface LiveVisionSource {
  descriptor: LiveVisionSourceDescriptor
  fetchLatest: () => Promise<VisionMetricsFrame | null>
  fetchTimeline: (maxFrames?: number) => Promise<VisionMetricsFrame[]>
  fetchLatestFrame: () => Promise<ArrayBuffer | null>
  getStreamUrl: () => string
  getFrameUrl: () => string
}

const DEFAULT_URL = 'http://127.0.0.1:8765'
const DEFAULT_MAX_FRAMES = 60

let timelineBuffer: VisionMetricsFrame[] = []

export function createLiveVisionSource(url = DEFAULT_URL): LiveVisionSource {
  return {
    descriptor: { provider: 'live-opencv-server', url },
    fetchLatest: () => fetchLatestMetrics(url),
    fetchTimeline: (maxFrames = DEFAULT_MAX_FRAMES) => fetchMetricsTimeline(url, maxFrames),
    fetchLatestFrame: () => fetchLatestFrame(url),
    getStreamUrl: () => `${url}/stream`,
    getFrameUrl: () => `${url}/frame`,
  }
}

async function fetchLatestMetrics(url: string): Promise<VisionMetricsFrame | null> {
  try {
    const response = await fetch(`${url}/metrics`)
    if (response.status === 204) return null
    if (!response.ok) return null
    const frame = (await response.json()) as VisionMetricsFrame
    timelineBuffer.push(frame)
    if (timelineBuffer.length > 300) timelineBuffer = timelineBuffer.slice(-300)
    return frame
  } catch {
    return null
  }
}

async function fetchMetricsTimeline(url: string, maxFrames: number): Promise<VisionMetricsFrame[]> {
  const latest = await fetchLatestMetrics(url)
  if (!latest) return timelineBuffer.slice(-maxFrames)
  return timelineBuffer.slice(-maxFrames)
}

async function fetchLatestFrame(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(`${url}/frame`)
    if (!response.ok) return null
    return response.arrayBuffer()
  } catch {
    return null
  }
}

export function clearLiveTimeline(): void {
  timelineBuffer = []
}

export function getLiveTimelineBuffer(): VisionMetricsFrame[] {
  return timelineBuffer
}

export async function checkLiveVisionHealth(url = DEFAULT_URL): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`)
    return response.ok
  } catch {
    return false
  }
}

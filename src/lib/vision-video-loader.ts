import type { VisionDetectionReplayPayload, VisionInputSource, VisionReplayPayload, VisionTrackingReplayPayload } from './vision-types'

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

export function resolveVisionAssetUrl(baseUrl: string, path: string) {
  if (path.startsWith('camera://')) return path
  const normalizedBase = normalizeBaseUrl(baseUrl)
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${normalizedBase}${normalizedPath}`
}

async function loadJsonAsset<T>(baseUrl: string, source: VisionInputSource | string): Promise<T> {
  const path = typeof source === 'string' ? source : source.path
  const url = resolveVisionAssetUrl(baseUrl, path)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load vision asset: ${response.status} ${url}`)
  }

  return (await response.json()) as T
}

export function resolveReplayVideoUrl(baseUrl: string, source: VisionInputSource) {
  return resolveVisionAssetUrl(baseUrl, source.path)
}

export function loadVisionReplayPayload(baseUrl: string, source: VisionInputSource | string) {
  return loadJsonAsset<VisionReplayPayload>(baseUrl, source)
}

export function loadVisionDetectionReplayPayload(baseUrl: string, source: VisionInputSource | string) {
  return loadJsonAsset<VisionDetectionReplayPayload>(baseUrl, source)
}

export function loadVisionTrackingReplayPayload(baseUrl: string, source: VisionInputSource | string) {
  return loadJsonAsset<VisionTrackingReplayPayload>(baseUrl, source)
}

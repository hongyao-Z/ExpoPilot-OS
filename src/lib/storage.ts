export function loadJson<T>(key: string): T | null {
  const raw = window.localStorage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function saveJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function removeKey(key: string) {
  window.localStorage.removeItem(key)
}

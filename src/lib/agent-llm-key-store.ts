import type { LlmProviderId } from './agent-llm-config'

const KEY_PREFIX = 'expopilot:llm:apikey:'

function storageKey(providerId: string): string {
  return `${KEY_PREFIX}${providerId}`
}

function readEnv(): Record<string, string | undefined> {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {}
}

export function getApiKey(providerId: LlmProviderId): string | null {
  const env = readEnv()
  const envKey = env.VITE_AGENT_LLM_API_KEY?.trim()
  if (envKey) return envKey

  try {
    const stored = window.localStorage.getItem(storageKey(providerId))
    if (stored?.trim()) return stored.trim()
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }

  return null
}

export function setApiKey(providerId: LlmProviderId, key: string): void {
  try {
    if (key.trim()) {
      window.localStorage.setItem(storageKey(providerId), key.trim())
    } else {
      window.localStorage.removeItem(storageKey(providerId))
    }
  } catch {
    // localStorage unavailable
  }
}

export function clearApiKey(providerId: LlmProviderId): void {
  try {
    window.localStorage.removeItem(storageKey(providerId))
  } catch {
    // localStorage unavailable
  }
}

export function listConfiguredProviders(): LlmProviderId[] {
  const all: LlmProviderId[] = ['anthropic', 'openai', 'openai-compatible']
  return all.filter((id) => getApiKey(id) !== null)
}

export function hasAnyApiKey(): boolean {
  return listConfiguredProviders().length > 0
}

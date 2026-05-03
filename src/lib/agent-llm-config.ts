import type { LlmApi, LlmProviderConfig } from './agent-llm-types'
import { getApiKey } from './agent-llm-key-store'

export type LlmProviderId = 'anthropic' | 'openai' | 'openai-compatible'

const DEFAULT_PROVIDER: LlmProviderId = 'anthropic'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TEMPERATURE = 0.3
const DEFAULT_TIMEOUT_MS = 30000
const DEFAULT_RETRY_MAX = 2
const DEFAULT_RETRY_BACKOFF_MS = 1000

function normalizeProvider(value: string | undefined): LlmProviderId {
  if (value === 'anthropic' || value === 'openai' || value === 'openai-compatible') return value
  return DEFAULT_PROVIDER
}

function normalizeApi(provider: LlmProviderId): LlmApi {
  if (provider === 'anthropic') return 'anthropic-messages'
  return 'openai-completions'
}

function resolveBaseUrl(provider: LlmProviderId, envOverride?: string): string {
  if (envOverride?.trim()) return envOverride.trim().replace(/\/$/, '')
  if (provider === 'anthropic') return 'https://api.anthropic.com'
  if (provider === 'openai') return 'https://api.openai.com'
  return 'http://127.0.0.1:8010'
}

function resolveModel(provider: LlmProviderId, envModel?: string): string {
  if (envModel?.trim()) return envModel.trim()
  if (provider === 'anthropic') return 'claude-sonnet-4-20250514'
  if (provider === 'openai') return 'gpt-4o'
  return 'default-model'
}

function readEnv(): Record<string, string | undefined> {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {}
}

export function loadLlmConfig(): LlmProviderConfig | null {
  const env = readEnv()
  if (env.VITE_AGENT_LLM_ENABLED === 'false') return null

  const providerId = normalizeProvider(env.VITE_AGENT_LLM_PROVIDER)
  const apiKey = getApiKey(providerId)
  if (!apiKey) return null

  return {
    id: providerId,
    baseUrl: resolveBaseUrl(providerId, env.VITE_AGENT_LLM_BASE_URL),
    apiKey,
    api: normalizeApi(providerId),
    model: resolveModel(providerId, env.VITE_AGENT_LLM_MODEL),
    headers: undefined,
    timeoutMs: Number(env.VITE_AGENT_LLM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    maxTokens: Number(env.VITE_AGENT_LLM_MAX_TOKENS || DEFAULT_MAX_TOKENS),
    temperature: Number(env.VITE_AGENT_LLM_TEMPERATURE || DEFAULT_TEMPERATURE),
    jsonMode: env.VITE_AGENT_LLM_JSON_MODE !== 'false',
    retry: {
      maxRetries: Number(env.VITE_AGENT_LLM_RETRY_MAX || DEFAULT_RETRY_MAX),
      backoffMs: Number(env.VITE_AGENT_LLM_RETRY_BACKOFF_MS || DEFAULT_RETRY_BACKOFF_MS),
    },
  }
}

export function isLlmDecisionEnabled(): boolean {
  const env = readEnv()
  if (env.VITE_AGENT_LLM_ENABLED === 'false') return false
  return env.VITE_AGENT_LLM_DECISION_ENABLED !== 'false'
}

export function isLlmExplanationEnabled(): boolean {
  const env = readEnv()
  if (env.VITE_AGENT_LLM_ENABLED === 'false') return false
  return env.VITE_AGENT_LLM_EXPLANATION_ENABLED !== 'false'
}

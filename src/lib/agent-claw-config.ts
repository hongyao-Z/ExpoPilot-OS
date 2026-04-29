export type AgentClawRuntimeKind = 'openclaw' | 'autoclaw' | 'openclaw_compatible'
export type AgentClawMode = 'placeholder' | 'http'

export interface AgentClawExplanationConfig {
  runtimeKind: AgentClawRuntimeKind
  mode: AgentClawMode
  providerLabel: string
  endpoint?: string
  baseUrl?: string
  endpointPath?: string
  authHeaderName?: string
  authHeaderValue?: string
  extraHeaders?: Record<string, string>
  timeoutMs: number
}

const DEFAULT_AGENT_CLAW_EXPLANATION_CONFIG: AgentClawExplanationConfig = {
  runtimeKind: 'openclaw_compatible',
  mode: 'placeholder',
  providerLabel: 'OpenClaw Adapter',
  endpoint: undefined,
  baseUrl: undefined,
  endpointPath: undefined,
  authHeaderName: undefined,
  authHeaderValue: undefined,
  extraHeaders: undefined,
  timeoutMs: 8000,
}

function normalizeRuntimeKind(value: string | undefined): AgentClawRuntimeKind {
  if (value === 'openclaw' || value === 'autoclaw' || value === 'openclaw_compatible') {
    return value
  }

  return DEFAULT_AGENT_CLAW_EXPLANATION_CONFIG.runtimeKind
}

function normalizeMode(value: string | undefined): AgentClawMode {
  if (value === 'http' || value === 'placeholder') {
    return value
  }

  return DEFAULT_AGENT_CLAW_EXPLANATION_CONFIG.mode
}

function normalizeHeaders(value: string | undefined): Record<string, string> | undefined {
  if (!value?.trim()) {
    return undefined
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined
    }

    const headers = Object.entries(parsed).reduce<Record<string, string>>((result, [key, headerValue]) => {
      if (typeof headerValue === 'string' && key.trim().length > 0) {
        result[key] = headerValue
      }
      return result
    }, {})

    return Object.keys(headers).length > 0 ? headers : undefined
  } catch {
    return undefined
  }
}

export function getActiveAgentClawExplanationConfig(): AgentClawExplanationConfig {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env

  return {
    runtimeKind: normalizeRuntimeKind(env?.VITE_AGENT_CLAW_RUNTIME_KIND),
    mode: normalizeMode(env?.VITE_AGENT_CLAW_MODE),
    providerLabel: env?.VITE_AGENT_CLAW_PROVIDER_LABEL || DEFAULT_AGENT_CLAW_EXPLANATION_CONFIG.providerLabel,
    endpoint: env?.VITE_AGENT_CLAW_ENDPOINT,
    baseUrl: env?.VITE_AGENT_CLAW_BASE_URL,
    endpointPath: env?.VITE_AGENT_CLAW_ENDPOINT_PATH,
    authHeaderName: env?.VITE_AGENT_CLAW_AUTH_HEADER_NAME,
    authHeaderValue: env?.VITE_AGENT_CLAW_AUTH_HEADER_VALUE,
    extraHeaders: normalizeHeaders(env?.VITE_AGENT_CLAW_EXTRA_HEADERS_JSON),
    timeoutMs: Number(env?.VITE_AGENT_CLAW_TIMEOUT_MS || DEFAULT_AGENT_CLAW_EXPLANATION_CONFIG.timeoutMs),
  }
}

export function isAgentClawTransportEnabled(config: AgentClawExplanationConfig): boolean {
  if (config.mode !== 'http') {
    return false
  }

  return Boolean(config.endpoint || config.baseUrl)
}

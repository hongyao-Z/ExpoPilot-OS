import type { AgentContext } from './agent-context-builder'
import type { AgentExplanationSet, AgentLifecycleState } from './agent-decision-adapter'
import { isAgentClawTransportEnabled, type AgentClawExplanationConfig, type AgentClawRuntimeKind } from './agent-claw-config'

const CLAW_EXPLANATION_KEYS = ['why_event', 'why_action', 'why_assignee', 'why_state'] as const

type ClawExplanationKey = (typeof CLAW_EXPLANATION_KEYS)[number]

export interface ClawExplanationInput {
  context: AgentContext
  decisionSummary: {
    contextId: string
    state: AgentLifecycleState
    eventType?: string
    eventLabel: string
    actionLabel: string
    assigneeLabel: string
    sourceModeLabel: string
    triggerPoints: string[]
    mode: AgentContext['mode']
  }
}

export interface ClawExplanationRequest {
  runtimeKind: AgentClawRuntimeKind
  contextId: string
  eventType?: string
  state: AgentLifecycleState
  mode: AgentContext['mode']
  eventLabel: string
  actionLabel: string
  assigneeLabel: string
  sourceModeLabel: string
  triggerPoints: string[]
  slots: ['why_event', 'why_action', 'why_assignee', 'why_state']
  visualDescription?: string
}

export type ClawExplanationOutput = AgentExplanationSet
export type ClawExplanationFailureReason = 'unavailable' | 'timeout' | 'bad_response' | 'invalid_payload'

export interface PreparedClawExplanationTransport {
  url: string
  method: 'POST'
  headers: Record<string, string>
  body: string
  timeoutMs: number
}

export interface ClawExplanationError extends Error {
  reason: ClawExplanationFailureReason
}

export function buildClawExplanationRequest(
  input: ClawExplanationInput,
  config: AgentClawExplanationConfig,
): ClawExplanationRequest {
  return {
    runtimeKind: config.runtimeKind,
    contextId: input.decisionSummary.contextId,
    eventType: input.decisionSummary.eventType,
    state: input.decisionSummary.state,
    mode: input.decisionSummary.mode,
    eventLabel: input.decisionSummary.eventLabel,
    actionLabel: input.decisionSummary.actionLabel,
    assigneeLabel: input.decisionSummary.assigneeLabel,
    sourceModeLabel: input.decisionSummary.sourceModeLabel,
    triggerPoints: input.decisionSummary.triggerPoints,
    slots: ['why_event', 'why_action', 'why_assignee', 'why_state'],
  }
}

export function parseClawExplanationJson(raw: string): unknown {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('claw explanation payload is empty')
  }

  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('claw explanation payload is not valid JSON')
  }
}

export function normalizeClawExplanationPayload(payload: unknown): ClawExplanationOutput {
  if (!isPlainObject(payload)) {
    throw new Error('claw explanation payload must be an object')
  }

  const keys = Object.keys(payload)

  if (keys.length !== CLAW_EXPLANATION_KEYS.length) {
    throw new Error('claw explanation payload must contain exactly four fields')
  }

  for (const key of CLAW_EXPLANATION_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) {
      throw new Error(`claw explanation payload is missing field: ${key}`)
    }
  }

  for (const key of keys) {
    if (!CLAW_EXPLANATION_KEYS.includes(key as ClawExplanationKey)) {
      throw new Error(`claw explanation payload contains extra field: ${key}`)
    }
  }

  const normalized = {} as Record<ClawExplanationKey, string>

  for (const key of CLAW_EXPLANATION_KEYS) {
    const value = payload[key]

    if (typeof value !== 'string') {
      throw new Error(`claw explanation field must be a string: ${key}`)
    }

    normalized[key] = value
  }

  return normalized
}

export function parseAndNormalizeClawExplanation(raw: string): ClawExplanationOutput {
  return normalizeClawExplanationPayload(parseClawExplanationJson(raw))
}

export function prepareRemoteClawExplanationTransport(
  input: ClawExplanationInput,
  config: AgentClawExplanationConfig,
): PreparedClawExplanationTransport {
  if (!isAgentClawTransportEnabled(config)) {
    throw createClawExplanationError('unavailable', 'remote claw explanation transport is not enabled')
  }

  const request = buildClawExplanationRequest(input, config)
  return {
    url: buildClawExplanationUrl(config),
    method: 'POST',
    headers: buildClawExplanationHeaders(config),
    body: JSON.stringify(request),
    timeoutMs: config.timeoutMs,
  }
}

export async function resolveRemoteClawExplanation(
  input: ClawExplanationInput,
  config: AgentClawExplanationConfig,
): Promise<ClawExplanationOutput> {
  const transport = prepareRemoteClawExplanationTransport(input, config)
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), transport.timeoutMs)

  try {
    const response = await fetch(transport.url, {
      method: transport.method,
      headers: transport.headers,
      body: transport.body,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw createClawExplanationError(
        'bad_response',
        `remote claw explanation request failed: ${response.status} ${response.statusText}`,
      )
    }

    const raw = await response.text()

    try {
      return parseAndNormalizeClawExplanation(raw)
    } catch (error) {
      throw createClawExplanationError(
        'invalid_payload',
        error instanceof Error ? error.message : 'remote claw explanation payload is invalid',
      )
    }
  } catch (error) {
    if (isClawExplanationError(error)) {
      throw error
    }

    if (isAbortError(error)) {
      throw createClawExplanationError('timeout', 'remote claw explanation request timed out')
    }

    throw createClawExplanationError(
      'unavailable',
      error instanceof Error ? error.message : 'remote claw explanation runtime unavailable',
    )
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function resolveRemoteClawPlaceholder(
  input: ClawExplanationInput,
  config: AgentClawExplanationConfig,
): Promise<ClawExplanationOutput> {
  if (config.mode === 'placeholder') {
    const request = buildClawExplanationRequest(input, config)
    throw createClawExplanationError(
      'unavailable',
      `remote claw explanation runtime unavailable in placeholder mode: ${request.runtimeKind}:${request.contextId}`,
    )
  }

  return resolveRemoteClawExplanation(input, config)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function buildClawExplanationUrl(config: AgentClawExplanationConfig): string {
  if (config.endpoint) {
    return config.endpoint
  }

  if (!config.baseUrl) {
    throw createClawExplanationError('unavailable', 'remote claw explanation baseUrl is missing')
  }

  const endpointPath = config.endpointPath ?? '/explanations'

  try {
    return new URL(endpointPath, config.baseUrl).toString()
  } catch {
    throw createClawExplanationError('unavailable', 'remote claw explanation URL is invalid')
  }
}

function buildClawExplanationHeaders(config: AgentClawExplanationConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.extraHeaders ?? {}),
  }

  if (config.authHeaderName && config.authHeaderValue) {
    headers[config.authHeaderName] = config.authHeaderValue
  }

  return headers
}

function createClawExplanationError(reason: ClawExplanationFailureReason, message: string): ClawExplanationError {
  const error = new Error(message) as ClawExplanationError
  error.reason = reason
  return error
}

function isClawExplanationError(error: unknown): error is ClawExplanationError {
  return error instanceof Error && 'reason' in error
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

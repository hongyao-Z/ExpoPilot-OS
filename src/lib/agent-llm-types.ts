export type LlmApi = 'anthropic-messages' | 'openai-completions'

export type LlmFailureReason =
  | 'unavailable'
  | 'timeout'
  | 'bad_response'
  | 'invalid_payload'
  | 'rate_limited'
  | 'auth_error'

export interface LlmSuccess {
  ok: true
  rawText: string
  model: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export interface LlmFailure {
  ok: false
  reason: LlmFailureReason
  detail: string
}

export type LlmResponse = LlmSuccess | LlmFailure

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmChatOptions {
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
  signal?: AbortSignal
}

export interface LlmProviderConfig {
  id: string
  baseUrl: string
  apiKey: string
  api: LlmApi
  model: string
  headers?: Record<string, string>
  timeoutMs: number
  maxTokens: number
  temperature: number
  jsonMode: boolean
  retry: {
    maxRetries: number
    backoffMs: number
  }
}

export interface LlmDecisionOutput {
  state: string
  actionLabel: string
  assigneeLabel: string
  whyEvent: string
  whyAction: string
  whyAssignee: string
  whyState: string
  confidence: number
  requiresApproval: boolean
}

export interface LlmExplanationOutput {
  why_event: string
  why_action: string
  why_assignee: string
  why_state: string
}

export interface LlmProvider {
  readonly providerId: string
  readonly modelId: string
  chat(messages: LlmChatMessage[], options?: LlmChatOptions): Promise<LlmResponse>
}

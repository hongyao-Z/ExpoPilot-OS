import type { LlmProvider, LlmProviderConfig, LlmFailure } from './agent-llm-types'
import { createAnthropicProvider } from './agent-llm-claude'
import { createOpenAiProvider } from './agent-llm-openai'

export type { LlmProvider }

export function createLlmProvider(config: LlmProviderConfig): LlmProvider {
  switch (config.api) {
    case 'anthropic-messages':
      return createAnthropicProvider(config)
    case 'openai-completions':
      return createOpenAiProvider(config)
    default:
      return createAnthropicProvider(config)
  }
}

export function isLlmFailure(response: unknown): response is LlmFailure {
  if (typeof response !== 'object' || response === null) return false
  return 'ok' in response && response.ok === false
}

export function llmFailureMessage(reason: string, detail: string): string {
  return `${reason}: ${detail}`
}

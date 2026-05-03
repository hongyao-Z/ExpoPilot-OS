import type { LlmProvider, LlmProviderConfig, LlmChatMessage, LlmChatOptions, LlmResponse } from './agent-llm-types'

function buildOpenAiBody(messages: LlmChatMessage[], config: LlmProviderConfig, options?: LlmChatOptions): string {
  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: options?.maxTokens ?? config.maxTokens,
    temperature: options?.temperature ?? config.temperature,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  }

  if (options?.jsonMode || config.jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  return JSON.stringify(body)
}

function classifyHttpStatus(status: number): LlmResponse | null {
  if (status === 200) return null
  if (status === 401 || status === 403) return { ok: false, reason: 'auth_error', detail: `OpenAI API 认证失败 (${status})` }
  if (status === 429) return { ok: false, reason: 'rate_limited', detail: `OpenAI API 请求限流 (${status})` }
  return { ok: false, reason: 'bad_response', detail: `OpenAI API 返回错误状态 (${status})` }
}

export function createOpenAiProvider(config: LlmProviderConfig): LlmProvider {
  return {
    providerId: config.id,
    modelId: config.model,

    async chat(messages: LlmChatMessage[], options?: LlmChatOptions): Promise<LlmResponse> {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), config.timeoutMs)
      const signal = options?.signal ?? controller.signal

      try {
        const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            ...(config.headers ?? {}),
          },
          body: buildOpenAiBody(messages, config, options),
          signal,
        })

        const statusError = classifyHttpStatus(response.status)
        if (statusError) return statusError

        const raw = (await response.json()) as Record<string, unknown>

        const choices = raw.choices as Array<{ message?: { content?: string } }> | undefined
        const rawText = choices?.[0]?.message?.content

        if (!rawText) {
          return { ok: false, reason: 'invalid_payload', detail: 'OpenAI 响应无文本内容' }
        }

        const usage = raw.usage as
          | { prompt_tokens?: number; completion_tokens?: number }
          | undefined

        return {
          ok: true,
          rawText,
          model: (raw.model as string) ?? config.model,
          usage: usage
            ? { inputTokens: usage.prompt_tokens ?? 0, outputTokens: usage.completion_tokens ?? 0 }
            : undefined,
        }
      } catch (error) {
        if (signal.aborted && config.timeoutMs > 0) {
          return { ok: false, reason: 'timeout', detail: `OpenAI 请求超时 (${config.timeoutMs}ms)` }
        }
        return {
          ok: false,
          reason: 'unavailable',
          detail: error instanceof Error ? error.message : 'unknown error',
        }
      } finally {
        window.clearTimeout(timeoutId)
      }
    },
  }
}

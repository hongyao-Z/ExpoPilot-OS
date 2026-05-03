import type { LlmProvider, LlmProviderConfig, LlmChatMessage, LlmChatOptions, LlmResponse } from './agent-llm-types'

function buildAnthropicBody(messages: LlmChatMessage[], config: LlmProviderConfig, options?: LlmChatOptions): string {
  const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const chatMessages = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }))

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: options?.maxTokens ?? config.maxTokens,
    temperature: options?.temperature ?? config.temperature,
    messages: chatMessages,
  }

  if (systemMessages.length > 0) {
    body.system = systemMessages.length === 1 ? systemMessages[0] : systemMessages
  }

  if (options?.jsonMode || config.jsonMode) {
    body.tool_choice = { type: 'tool', name: 'output_decision' }
    body.tools = [
      {
        name: 'output_decision',
        description: '输出结构化的 Agent 决策或解释结果',
        input_schema: {
          type: 'object',
          properties: {
            output: {
              type: 'object',
              description: '完整的决策或解释 JSON 对象',
            },
          },
          required: ['output'],
        },
      },
    ]
  }

  return JSON.stringify(body)
}

function classifyHttpStatus(status: number): LlmResponse | null {
  if (status === 200) return null
  if (status === 401 || status === 403) return { ok: false, reason: 'auth_error', detail: `Anthropic API 认证失败 (${status})` }
  if (status === 429) return { ok: false, reason: 'rate_limited', detail: `Anthropic API 请求限流 (${status})` }
  return { ok: false, reason: 'bad_response', detail: `Anthropic API 返回错误状态 (${status})` }
}

export function createAnthropicProvider(config: LlmProviderConfig): LlmProvider {
  return {
    providerId: config.id,
    modelId: config.model,

    async chat(messages: LlmChatMessage[], options?: LlmChatOptions): Promise<LlmResponse> {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), config.timeoutMs)
      const signal = options?.signal ?? controller.signal

      try {
        const response = await fetch(`${config.baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            ...(config.headers ?? {}),
          },
          body: buildAnthropicBody(messages, config, options),
          signal,
        })

        const statusError = classifyHttpStatus(response.status)
        if (statusError) return statusError

        const raw = (await response.json()) as Record<string, unknown>

        if (!raw.content || !Array.isArray(raw.content)) {
          return { ok: false, reason: 'invalid_payload', detail: 'Anthropic 响应缺 content 数组' }
        }

        const content = raw.content as Array<{ type: string; text?: string; input?: Record<string, unknown> }>

        let rawText: string | null = null

        for (const block of content) {
          if (block.type === 'tool_use' && block.input) {
            const nested = block.input as Record<string, unknown>
            rawText = typeof nested.output === 'string' ? nested.output : JSON.stringify(nested.output ?? nested)
            break
          }
        }

        if (rawText === null) {
          for (const block of content) {
            if (block.type === 'text' && block.text) {
              rawText = block.text
              break
            }
          }
        }

        if (rawText === null) {
          return { ok: false, reason: 'invalid_payload', detail: 'Anthropic 响应无文本内容' }
        }

        const usage = raw.usage as { input_tokens?: number; output_tokens?: number } | undefined

        return {
          ok: true,
          rawText,
          model: (raw.model as string) ?? config.model,
          usage: usage
            ? { inputTokens: usage.input_tokens ?? 0, outputTokens: usage.output_tokens ?? 0 }
            : undefined,
        }
      } catch (error) {
        if (signal.aborted && config.timeoutMs > 0) {
          return { ok: false, reason: 'timeout', detail: `Anthropic 请求超时 (${config.timeoutMs}ms)` }
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

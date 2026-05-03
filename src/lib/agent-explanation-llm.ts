import type { AgentContext } from './agent-context-builder'
import type { AgentExplanationSet, AgentLifecycleState } from './agent-decision-adapter'
import { loadLlmConfig } from './agent-llm-config'
import { createLlmProvider } from './agent-llm-provider'
import { buildExplanationPrompt, type LlmExplanationPromptContext } from './agent-llm-prompts'
import { parseExplanationResponse } from './agent-llm-parser'
import type { EventOperationalItem } from '../domain/types'
import type { LlmFailure, LlmExplanationOutput } from './agent-llm-types'

function isLlmError(result: LlmFailure | LlmExplanationOutput): result is LlmFailure {
  return 'ok' in result && result.ok === false
}

function buildExplanationPromptContext(
  context: AgentContext,
  state: AgentLifecycleState,
  focusEvent?: EventOperationalItem,
): LlmExplanationPromptContext {
  return {
    projectTitle: focusEvent?.event.project_id ?? '当前项目',
    eventType: focusEvent?.event.event_type ?? 'unknown',
    eventTitle: focusEvent?.event.title ?? '当前无重点事件',
    eventSummary: focusEvent?.event.summary ?? '',
    severity: focusEvent?.event.severity ?? 'medium',
    sourceLabel: focusEvent?.source_label ?? '未知输入',
    triggerPoints: focusEvent?.trigger_points ?? [],
    zoneName: focusEvent?.zone_name ?? '未知区域',
    recommendedAction: focusEvent?.event.recommended_action ?? '等待生成建议',
    assigneeLabel: focusEvent?.assignee_name ?? '等待推荐执行人',
    taskType: focusEvent?.task?.task_type ?? '未创建',
    taskStatus: focusEvent?.task?.status ?? '无任务',
    lifecycleState: state,
    mode: context.mode,
  }
}

export async function buildLlmExplanations(
  context: AgentContext,
  state: AgentLifecycleState,
  focusEvent?: EventOperationalItem,
): Promise<AgentExplanationSet> {
  const config = loadLlmConfig()
  if (!config) {
    throw new Error('LLM 配置不可用（缺少 API Key 或未启用），已回退到模板解释')
  }

  const provider = createLlmProvider(config)
  const promptCtx = buildExplanationPromptContext(context, state, focusEvent)
  const messages = buildExplanationPrompt(promptCtx)
  const response = await provider.chat(messages, { jsonMode: true, temperature: 0.2, maxTokens: config.maxTokens })

  if (!response.ok) {
    throw new Error(`LLM 解释请求失败: ${response.reason} - ${response.detail}`)
  }

  const parsed = parseExplanationResponse(response.rawText)
  if (isLlmError(parsed)) {
    throw new Error(`LLM 解释解析失败: ${parsed.detail}`)
  }

  return {
    why_event: parsed.why_event,
    why_action: parsed.why_action,
    why_assignee: parsed.why_assignee,
    why_state: parsed.why_state,
  }
}

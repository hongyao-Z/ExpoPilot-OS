import type { EventOperationalItem } from '../domain/types'
import type { AgentContext } from './agent-context-builder'
import type { AgentDecisionBase } from './agent-decision-providers'
import type { AgentLifecycleState, AgentExplanationSet } from './agent-decision-adapter'
import type { AgentExplanationSourceKey } from './agent-explanation-config'
import { loadLlmConfig } from './agent-llm-config'
import { createLlmProvider } from './agent-llm-provider'
import { buildDecisionPrompt, type LlmDecisionPromptContext } from './agent-llm-prompts'
import { parseDecisionResponse } from './agent-llm-parser'
import { getAgentDecisionProducerLabel, type AgentDecisionProducerKey } from './agent-decision-config'
import type { LlmFailure, LlmDecisionOutput } from './agent-llm-types'

function isLlmError(result: LlmFailure | LlmDecisionOutput): result is LlmFailure {
  return 'ok' in result && result.ok === false
}

function buildDecisionPromptContext(
  context: AgentContext,
  focusEvent: EventOperationalItem | undefined,
  snapshot?: { zones: { zone_id: string; name: string; zone_type: string; heat: number; density: number }[]; staff: { staff_id: string; name: string; title: string; assigned_zone_id: string; shift_status: string; skills: string[] }[]; tasks: { task_id: string; task_type: string; status: string; assignee_id: string; action_summary: string; project_id: string }[] },
): LlmDecisionPromptContext {
  const projectTitle = focusEvent?.event.project_id ?? '当前项目'
  const projectStatus = 'running'

  const eventEntry = focusEvent
    ? {
        eventType: focusEvent.event.event_type,
        title: focusEvent.event.title,
        summary: focusEvent.event.summary,
        severity: focusEvent.event.severity,
        status: focusEvent.event.status,
        sourceLabel: focusEvent.source_label,
        recommendedAction: focusEvent.event.recommended_action,
        recommendedAssignee: focusEvent.assignee_name ?? focusEvent.event.recommended_assignee_id,
        triggerPoints: focusEvent.trigger_points,
        zoneName: focusEvent.zone_name,
      }
    : undefined

  const zones = (snapshot?.zones ?? []).map((z) => ({
    name: z.name,
    zoneType: z.zone_type,
    heat: z.heat,
    density: z.density,
  }))

  const staffList = (snapshot?.staff ?? []).map((s) => ({
    name: s.name,
    title: s.title,
    zoneName: snapshot?.zones.find((z) => z.zone_id === s.assigned_zone_id)?.name ?? '未分配',
    shiftStatus: s.shift_status,
    skills: s.skills,
  }))

  const tasksList = (snapshot?.tasks ?? [])
    .filter((t) => t.project_id === focusEvent?.event.project_id)
    .map((t) => ({
      taskType: t.task_type,
      status: t.status,
      assigneeName: snapshot?.staff.find((s) => s.staff_id === t.assignee_id)?.name ?? t.assignee_id,
      actionSummary: t.action_summary,
    }))

  let decisionSought: string
  if (focusEvent?.operational_state === 'pending_confirmation' || !focusEvent?.task) {
    decisionSought = '请判断应如何处置此事件：推荐动作、推荐执行人、是否需要人工批准。'
  } else if (focusEvent.operational_state === 'assigned' && focusEvent.task) {
    decisionSought = '任务已派发，请判断当前生命周期状态（dispatched/waiting_feedback/reviewing）并给出后续建议。'
  } else {
    decisionSought = '请评估当前整体态势并给出建议。'
  }

  return {
    projectTitle,
    projectStatus,
    mode: context.mode,
    priorityLabel: context.priorityLabel,
    focusZoneLabel: context.focusZoneLabel,
    event: eventEntry,
    zones,
    staff: staffList,
    tasks: tasksList,
    decisionSought,
  }
}

export async function buildLlmAgentDecision(
  context: AgentContext,
  focusEvent: EventOperationalItem | undefined,
  snapshot?: {
    zones: { zone_id: string; name: string; zone_type: string; heat: number; density: number }[]
    staff: { staff_id: string; name: string; title: string; assigned_zone_id: string; shift_status: string; skills: string[] }[]
    tasks: { task_id: string; task_type: string; status: string; assignee_id: string; action_summary: string; project_id: string }[]
  },
): Promise<AgentDecisionBase> {
  const config = loadLlmConfig()
  if (!config) {
    throw new Error('LLM 配置不可用（缺少 API Key 或未启用），已回退到 mock_agent')
  }

  const provider = createLlmProvider(config)
  const promptCtx = buildDecisionPromptContext(context, focusEvent, snapshot)
  const messages = buildDecisionPrompt(promptCtx)
  const response = await provider.chat(messages, { jsonMode: true, temperature: config.temperature, maxTokens: config.maxTokens })

  if (!response.ok) {
    throw new Error(`LLM 决策请求失败: ${response.reason} - ${response.detail}`)
  }

  const parsed = parseDecisionResponse(response.rawText)
  if (isLlmError(parsed)) {
    throw new Error(`LLM 决策解析失败: ${parsed.detail}`)
  }

  const producerLabel = getAgentDecisionProducerLabel('llm')
  const producer: AgentDecisionProducerKey = 'llm'

  const lifecycleState: AgentLifecycleState = VALID_STATES.includes(parsed.state as AgentLifecycleState)
    ? (parsed.state as AgentLifecycleState)
    : 'recommending'

  const explanations: AgentExplanationSet = {
    why_event: parsed.whyEvent,
    why_action: parsed.whyAction,
    why_assignee: parsed.whyAssignee,
    why_state: parsed.whyState,
  }

  const eventId = focusEvent?.event.event_id ?? 'no-event'

  return {
    decisionId: ['decision', context.projectId ?? 'no-project', eventId, lifecycleState, context.mode, producer].join(':'),
    contextId: ['context', context.projectId ?? 'no-project', eventId, context.priorityLabel || 'no-priority'].join(':'),
    producer,
    state: lifecycleState,
    focusZoneLabel: context.focusZoneLabel,
    eventLabel: focusEvent?.event.title ?? '当前无重点事件',
    actionLabel: parsed.actionLabel,
    assigneeLabel: parsed.assigneeLabel,
    explanations,
    explanationSource: 'fallback_template' as AgentExplanationSourceKey,
    explanationIsFallback: true,
    logs: [],
    statusSummary: `LLM Agent 已生成决策：${parsed.actionLabel} → ${parsed.assigneeLabel}（置信度 ${parsed.confidence.toFixed(2)}）`,
    primaryActionLabel: context.mode === 'auto' ? 'Agent 自动派发' : '人工确认并派发',
    primaryActionEnabled: Boolean(focusEvent && lifecycleState === 'recommending'),
    confidence: parsed.confidence,
    requiresApproval: parsed.requiresApproval,
    fallbackReason: undefined,
    producerMeta: {
      origin: 'direct',
      providerLabel: producerLabel,
      notes: `LLM 模型: ${response.model}，输入 tokens: ${response.usage?.inputTokens ?? 0}，输出 tokens: ${response.usage?.outputTokens ?? 0}`,
    },
  }
}

const VALID_STATES: AgentLifecycleState[] = ['observing', 'recommending', 'dispatched', 'waiting_feedback', 'reviewing']

import type { AgentContext } from './agent-context-builder'
import { getAgentDecisionProducerLabel, type AgentDecisionProducerKey } from './agent-decision-config'
import type { AgentDecision, AgentExplanationSet, AgentLifecycleState, AgentLogItem } from './agent-decision-adapter'
import type { AgentExplanationSourceKey } from './agent-explanation-config'
import { resolveAgentExplanations } from './agent-explanation-providers'

export type AgentDecisionBase = Omit<
  AgentDecision,
  | 'toolIntent'
  | 'toolCalls'
  | 'autoExecutionEligible'
  | 'autoExecutionReason'
  | 'effectivePrimaryActionLabel'
  | 'effectivePrimaryActionEnabled'
  | 'effectiveMode'
  | 'canAutoExecute'
  | 'approvalRequired'
  | 'riskLevel'
  | 'boundaryReason'
  | 'effectiveConfidence'
>

export async function resolveAgentDecisionBase(
  context: AgentContext,
  preferredProducer: AgentDecisionProducerKey,
  preferredExplanationSource: AgentExplanationSourceKey,
): Promise<AgentDecisionBase> {
  switch (preferredProducer) {
    case 'mock_agent':
      return resolveWithFallback(
        context,
        () => buildMockAgentDecision(context, preferredExplanationSource),
        'mock_agent',
      )
    case 'remote_agent_placeholder':
      return resolveRemotePlaceholderDecision(context, preferredExplanationSource)
    case 'local_rule_based':
    default:
      return buildLocalRuleBasedDecision(context, preferredExplanationSource)
  }
}

export async function buildLocalRuleBasedDecision(
  context: AgentContext,
  preferredExplanationSource: AgentExplanationSourceKey,
): Promise<AgentDecisionBase> {
  const state = deriveLifecycleState(context.focusEvent)
  const explanationResult = await resolveAgentExplanations(context, state, preferredExplanationSource)

  return createDecisionBase(context, {
    producer: 'local_rule_based',
    state,
    explanations: explanationResult.explanations,
    explanationSource: explanationResult.source,
    explanationIsFallback: explanationResult.isFallback,
    logs: buildLogs(context.focusEvent, state),
    statusSummary: buildLocalRuleBasedStatusSummary(context.mode, state, context.priorityLabel),
    primaryActionLabel: buildPrimaryActionLabel(context.mode, state),
    confidence: 0.82,
    requiresApproval: context.mode === 'assist' && state === 'recommending',
    producerMeta: {
      origin: 'direct',
      providerLabel: getAgentDecisionProducerLabel('local_rule_based'),
      notes: '当前为本地规则决策输出。',
    },
  })
}

export async function buildMockAgentDecision(
  context: AgentContext,
  preferredExplanationSource: AgentExplanationSourceKey,
): Promise<AgentDecisionBase> {
  const state = deriveLifecycleState(context.focusEvent)
  const explanationResult = await resolveAgentExplanations(context, state, preferredExplanationSource)

  return createDecisionBase(context, {
    producer: 'mock_agent',
    state,
    explanations: explanationResult.explanations,
    explanationSource: explanationResult.source,
    explanationIsFallback: explanationResult.isFallback,
    logs: buildLogs(context.focusEvent, state),
    statusSummary: buildMockAgentStatusSummary(context.mode, state, context.priorityLabel),
    primaryActionLabel: buildPrimaryActionLabel(context.mode, state),
    confidence: computeMockAgentConfidence(context.focusEvent, state),
    requiresApproval: context.mode === 'assist' && state === 'recommending',
    producerMeta: {
      origin: 'direct',
      providerLabel: getAgentDecisionProducerLabel('mock_agent'),
      notes: '当前为本地模拟 Agent 输出，结构上贴近未来远端决策结果。',
    },
  })
}

export function buildRemoteAgentPlaceholderDecision(context: AgentContext): AgentDecisionBase {
  void context
  throw new Error('remote_agent_placeholder 当前未接入真实远端决策服务。')
}

async function resolveRemotePlaceholderDecision(
  context: AgentContext,
  preferredExplanationSource: AgentExplanationSourceKey,
): Promise<AgentDecisionBase> {
  try {
    return buildRemoteAgentPlaceholderDecision(context)
  } catch (remoteError) {
    const remoteReason = toErrorMessage(remoteError)

    try {
      return attachFallbackMetadata(
        await buildMockAgentDecision(context, preferredExplanationSource),
        'remote_agent_placeholder',
        `remote_agent_placeholder 当前未接入真实远端，因此已回退到 mock_agent：${remoteReason}`,
      )
    } catch (mockError) {
      const mockReason = toErrorMessage(mockError)
      return attachFallbackMetadata(
        await buildLocalRuleBasedDecision(context, preferredExplanationSource),
        'remote_agent_placeholder',
        `remote_agent_placeholder 当前未接入真实远端，且 mock_agent 构建失败，因此已回退到 local_rule_based：${remoteReason}；mock_agent 失败原因：${mockReason}`,
      )
    }
  }
}

async function resolveWithFallback(
  context: AgentContext,
  producerFactory: () => Promise<AgentDecisionBase> | AgentDecisionBase,
  fallbackFrom: AgentDecisionProducerKey,
): Promise<AgentDecisionBase> {
  try {
    return await producerFactory()
  } catch (error) {
    return attachFallbackMetadata(
      await buildLocalRuleBasedDecision(context, 'fallback_template'),
      fallbackFrom,
      `${fallbackFrom} 构建失败，当前已回退到 local_rule_based：${toErrorMessage(error)}`,
    )
  }
}

function attachFallbackMetadata(
  decision: AgentDecisionBase,
  fallbackFrom: AgentDecisionProducerKey,
  fallbackReason: string,
): AgentDecisionBase {
  return {
    ...decision,
    fallbackReason,
    producerMeta: {
      ...(decision.producerMeta ?? {
        providerLabel: getAgentDecisionProducerLabel(decision.producer),
      }),
      origin: 'fallback',
      providerLabel: getAgentDecisionProducerLabel(decision.producer),
      fallbackFrom,
      notes: fallbackReason,
    },
  }
}

function createDecisionBase(
  context: AgentContext,
  options: {
    producer: AgentDecisionProducerKey
    state: AgentLifecycleState
    explanations: AgentExplanationSet
    explanationSource: AgentDecision['explanationSource']
    explanationIsFallback: AgentDecision['explanationIsFallback']
    logs: AgentLogItem[]
    statusSummary: string
    primaryActionLabel: string
    confidence: number
    requiresApproval: boolean
    producerMeta: NonNullable<AgentDecision['producerMeta']>
  },
): AgentDecisionBase {
  const eventId = context.focusEvent?.event.event_id ?? 'no-event'

  return {
    decisionId: ['decision', context.projectId ?? 'no-project', eventId, options.state, context.mode, options.producer].join(':'),
    contextId: ['context', context.projectId ?? 'no-project', eventId, context.priorityLabel || 'no-priority'].join(':'),
    producer: options.producer,
    state: options.state,
    focusZoneLabel: context.focusZoneLabel,
    eventLabel: context.focusEvent?.event.title ?? '当前无重点事件',
    actionLabel: context.focusEvent?.task?.action_summary ?? context.focusEvent?.event.recommended_action ?? '等待生成建议',
    assigneeLabel: context.focusEvent?.assignee_name ?? context.focusEvent?.event.recommended_assignee_id ?? '等待推荐执行人',
    explanations: options.explanations,
    explanationSource: options.explanationSource,
    explanationIsFallback: options.explanationIsFallback,
    logs: options.logs,
    statusSummary: options.statusSummary,
    primaryActionLabel: options.primaryActionLabel,
    primaryActionEnabled: Boolean(context.focusEvent && options.state === 'recommending'),
    confidence: options.confidence,
    requiresApproval: options.requiresApproval,
    fallbackReason: undefined,
    producerMeta: options.producerMeta,
  }
}

function deriveLifecycleState(focusEvent: AgentContext['focusEvent']): AgentLifecycleState {
  if (!focusEvent) return 'observing'

  const taskStatus = focusEvent.task?.status

  if (taskStatus === 'completed' || taskStatus === 'exception') return 'reviewing'
  if (focusEvent.operational_state === 'closed' || focusEvent.operational_state === 'need_support') return 'reviewing'
  if (taskStatus === 'received' || taskStatus === 'processing') return 'waiting_feedback'
  if (taskStatus === 'created') return 'dispatched'
  if (!focusEvent.task) return 'recommending'
  return 'observing'
}

function buildLogs(focusEvent: AgentContext['focusEvent'], state: AgentLifecycleState): AgentLogItem[] {
  if (!focusEvent) return []

  const items: AgentLogItem[] = []
  const event = focusEvent.event
  const task = focusEvent.task
  const assigneeLabel = focusEvent.assignee_name ?? event.recommended_assignee_id ?? '待定执行人'

  items.push({
    at: event.timestamp,
    stage: 'observed',
    label: '识别事件',
    detail: event.event_type,
  })

  items.push({
    at: event.timestamp,
    stage: 'recommended',
    label: '生成建议',
    detail: `${event.recommended_action || '等待生成建议'} / ${assigneeLabel}`,
  })

  if (task?.dispatched_at) {
    items.push({
      at: task.dispatched_at,
      stage: 'dispatched',
      label: '派发任务',
      detail: `${task.task_type} / ${focusEvent.assignee_name ?? task.assignee_id}`,
    })
  }

  if (focusEvent.latest_feedback_at) {
    items.push({
      at: focusEvent.latest_feedback_at,
      stage: 'feedback',
      label: '收到反馈',
      detail: focusEvent.latest_feedback?.type ?? focusEvent.latest_feedback_label,
    })
  }

  if (state === 'reviewing' && focusEvent.latest_feedback_at) {
    items.push({
      at: focusEvent.latest_feedback_at,
      stage: 'reviewing',
      label: '进入复盘阶段',
      detail: '等待复盘汇总',
    })
  }

  return items.sort((left, right) => {
    const leftAt = new Date(left.at).getTime()
    const rightAt = new Date(right.at).getTime()
    if (leftAt !== rightAt) return leftAt - rightAt
    return stageOrder[left.stage] - stageOrder[right.stage]
  })
}

function buildLocalRuleBasedStatusSummary(mode: AgentContext['mode'], state: AgentLifecycleState, priorityLabel: string) {
  if (mode === 'assist' && state === 'recommending') {
    return `当前仅生成建议，等待人工确认。当前优先级：${priorityLabel}。`
  }

  if (mode === 'auto' && state === 'recommending') {
    return `当前可由 Agent 直接执行 demo 派发。当前优先级：${priorityLabel}。`
  }

  switch (state) {
    case 'observing':
      return `Agent 正在持续观察现场输入。当前优先级：${priorityLabel}。`
    case 'dispatched':
      return `任务已经派发，Agent 正在等待执行端进入接收或处理中状态。当前优先级：${priorityLabel}。`
    case 'waiting_feedback':
      return `任务已进入执行链路，Agent 正在等待终态反馈。当前优先级：${priorityLabel}。`
    case 'reviewing':
      return `事件已进入复盘阶段，Agent 正在整理闭环结果。当前优先级：${priorityLabel}。`
    case 'recommending':
    default:
      return `当前已生成建议，等待进入派发动作。当前优先级：${priorityLabel}。`
  }
}

function buildMockAgentStatusSummary(mode: AgentContext['mode'], state: AgentLifecycleState, priorityLabel: string) {
  if (mode === 'assist' && state === 'recommending') {
    return `Mock Agent 已完成当前建议生成，等待人工批准。当前优先级：${priorityLabel}。`
  }

  if (mode === 'auto' && state === 'recommending') {
    return `Mock Agent 已准备进入受控自动执行判断。当前优先级：${priorityLabel}。`
  }

  switch (state) {
    case 'observing':
      return `Mock Agent 正在监听现场输入，等待新的焦点事件。当前优先级：${priorityLabel}。`
    case 'dispatched':
      return `Mock Agent 识别到任务已经派发，当前关注执行端是否开始响应。当前优先级：${priorityLabel}。`
    case 'waiting_feedback':
      return `Mock Agent 当前正等待终态反馈，以便决定是否进入复盘。当前优先级：${priorityLabel}。`
    case 'reviewing':
      return `Mock Agent 已把当前事件切到 reviewing，准备整理闭环结果。当前优先级：${priorityLabel}。`
    case 'recommending':
    default:
      return `Mock Agent 已完成建议生成，等待进入派发动作。当前优先级：${priorityLabel}。`
  }
}

function buildPrimaryActionLabel(mode: AgentContext['mode'], state: AgentLifecycleState) {
  if (state === 'recommending') {
    return mode === 'auto' ? 'Agent 自动派发 demo 任务' : '人工确认并派发'
  }

  if (state === 'dispatched') {
    return mode === 'auto' ? 'Agent 已派发当前任务' : '人工已确认当前任务'
  }

  if (state === 'waiting_feedback') {
    return mode === 'auto' ? 'Agent 正在等待执行反馈' : '人工正在跟进执行反馈'
  }

  if (state === 'reviewing') {
    return mode === 'auto' ? 'Agent 正在整理复盘' : '人工正在查看复盘'
  }

  return mode === 'auto' ? 'Agent 等待可执行事件' : '等待人工确认事件'
}

function computeMockAgentConfidence(focusEvent: AgentContext['focusEvent'], state: AgentLifecycleState) {
  if (!focusEvent) return 0.36
  if (state === 'reviewing') return 0.91
  if (state === 'waiting_feedback') return 0.84
  if (state === 'dispatched') return 0.8
  if (state === 'recommending') return focusEvent.trigger_points.length >= 3 ? 0.78 : 0.72
  return 0.68
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'unknown error'
}

const stageOrder: Record<AgentLogItem['stage'], number> = {
  observed: 0,
  recommended: 1,
  dispatched: 2,
  feedback: 3,
  reviewing: 4,
}

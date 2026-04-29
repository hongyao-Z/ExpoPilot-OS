import type { EventOperationalItem } from '../domain/types'
import type { AgentContext } from './agent-context-builder'
import { getActiveAgentClawExplanationConfig } from './agent-claw-config'
import { resolveRemoteClawPlaceholder, type ClawExplanationInput } from './agent-claw-explanation'
import { getAgentExplanationSourceLabel, type AgentExplanationSourceKey } from './agent-explanation-config'
import type { AgentExplanationSet, AgentLifecycleState } from './agent-decision-adapter'

export interface AgentResolvedExplanations {
  explanations: AgentExplanationSet
  source: AgentExplanationSourceKey
  isFallback: boolean
}

export async function resolveAgentExplanations(
  context: AgentContext,
  state: AgentLifecycleState,
  preferredSource: AgentExplanationSourceKey,
): Promise<AgentResolvedExplanations> {
  switch (preferredSource) {
    case 'mock_reasoner':
      return resolveWithTemplateFallback(
        () => buildMockReasonerExplanations(context.focusEvent, state),
        () => buildFallbackTemplateExplanations(context.focusEvent, state),
        'mock_reasoner',
      )
    case 'remote_claw_placeholder':
      return resolveWithTemplateFallback(
        () => resolveRemoteClawPlaceholder(buildClawExplanationInput(context, state), getActiveAgentClawExplanationConfig()),
        () => buildFallbackTemplateExplanations(context.focusEvent, state),
        'remote_claw_placeholder',
      )
    case 'fallback_template':
    default:
      return {
        explanations: buildFallbackTemplateExplanations(context.focusEvent, state),
        source: 'fallback_template',
        isFallback: false,
      }
  }
}

async function resolveWithTemplateFallback(
  resolver: () => Promise<AgentExplanationSet> | AgentExplanationSet,
  fallbackBuilder: () => AgentExplanationSet,
  source: AgentExplanationSourceKey,
): Promise<AgentResolvedExplanations> {
  try {
    return {
      explanations: await resolver(),
      source,
      isFallback: false,
    }
  } catch {
    // Any claw explanation parse/shape/type error stays inside the provider boundary
    // and falls back to the local template source.
    return {
      explanations: fallbackBuilder(),
      source: 'fallback_template',
      isFallback: true,
    }
  }
}

function buildClawExplanationInput(context: AgentContext, state: AgentLifecycleState): ClawExplanationInput {
  const focusEvent = context.focusEvent

  return {
    context,
    decisionSummary: {
      contextId: ['context', context.projectId ?? 'no-project', focusEvent?.event.event_id ?? 'no-event', context.priorityLabel || 'no-priority'].join(':'),
      state,
      eventType: focusEvent?.event.event_type,
      eventLabel: focusEvent?.event.title ?? '当前无重点事件',
      actionLabel: focusEvent?.task?.action_summary ?? focusEvent?.event.recommended_action ?? '等待生成建议',
      assigneeLabel: focusEvent?.assignee_name ?? focusEvent?.event.recommended_assignee_id ?? '等待推荐执行人',
      sourceModeLabel: sourceModeLabelFromValue(focusEvent?.source_mode ?? 'unknown'),
      triggerPoints: focusEvent?.trigger_points ?? [],
      mode: context.mode,
    },
  }
}

export function buildFallbackTemplateExplanations(
  focusEvent: EventOperationalItem | undefined,
  state: AgentLifecycleState,
): AgentExplanationSet {
  if (!focusEvent) {
    return {
      why_event: '当前没有焦点事件，Agent 保持观察状态，等待新的入口拥堵、展台升温或区域失衡信号。',
      why_action: '当前没有可执行事件，暂不生成动作建议。',
      why_assignee: '当前没有任务或推荐执行对象，暂不展示执行人建议。',
      why_state: '当前无可处理事件，因此状态保持为 observing。',
    }
  }

  const triggerSummary = focusEvent.trigger_points.length > 0 ? focusEvent.trigger_points.join('、') : '当前状态不足以生成完整解释'
  const sourceModeLabel = sourceModeLabelFromValue(focusEvent.source_mode)
  const recommendedAction = focusEvent.event.recommended_action || '等待生成建议'
  const taskType = focusEvent.task?.task_type
  const assigneeLabel = focusEvent.assignee_name ?? focusEvent.event.recommended_assignee_id

  return {
    why_event:
      focusEvent.event.event_type === 'entrance_congestion'
        ? `事件类型为 entrance_congestion，触发依据包括 ${triggerSummary}，当前输入模式为${sourceModeLabel}，因此按入口拥堵处理。`
        : `当前事件类型为 ${focusEvent.event.event_type}，触发依据包括 ${triggerSummary}，当前输入模式为${sourceModeLabel}。`,
    why_action: taskType
      ? `当前事件推荐动作为“${recommendedAction}”，已落地的任务类型也是“${taskType}”，因此 Agent 维持这条动作建议。`
      : `当前事件记录的推荐动作为“${recommendedAction}”，因此 Agent 先给出该处置建议。`,
    why_assignee: focusEvent.task
      ? `当前任务已经派发给 ${assigneeLabel ?? '当前执行对象'}，Agent 沿用现有派发结果，不额外编造新的匹配原因。`
      : assigneeLabel
        ? `当前事件记录里已有推荐执行对象 ${assigneeLabel}，Agent 直接使用现有推荐结果。`
        : '当前状态不足以生成完整解释，需要先生成任务或写入推荐执行对象。',
    why_state: buildTemplateStateExplanation(focusEvent, state),
  }
}

export function buildMockReasonerExplanations(
  focusEvent: EventOperationalItem | undefined,
  state: AgentLifecycleState,
): AgentExplanationSet {
  if (!focusEvent) {
    return {
      why_event: 'Mock Reasoner 当前没有锁定焦点事件，因此保持观察，不主动生成事件结论。',
      why_action: 'Mock Reasoner 没有看到可执行事件，当前不输出动作建议。',
      why_assignee: 'Mock Reasoner 没拿到任务或推荐执行对象，暂不输出执行人判断。',
      why_state: 'Mock Reasoner 看到当前没有待处理事件，因此保持 observing。',
    }
  }

  const triggerSummary = focusEvent.trigger_points.length > 0 ? focusEvent.trigger_points.join('、') : '当前状态不足以生成完整解释'
  const sourceModeLabel = sourceModeLabelFromValue(focusEvent.source_mode)
  const recommendedAction = focusEvent.event.recommended_action || '等待生成建议'
  const assigneeLabel = focusEvent.assignee_name ?? focusEvent.event.recommended_assignee_id ?? '待定执行人'

  return {
    why_event: `Mock Reasoner 先读取到事件类型 ${focusEvent.event.event_type}，再结合 ${triggerSummary} 与 ${sourceModeLabel} 输入，确认这是当前需要优先处理的焦点事件。`,
    why_action: focusEvent.task
      ? `Mock Reasoner 观察到任务已经落地为“${focusEvent.task.task_type}”，并且与事件建议动作“${recommendedAction}”一致，因此继续沿用原处置方向。`
      : `Mock Reasoner 当前先采纳事件已有建议动作“${recommendedAction}”，将其作为下一步最可执行的处置方向。`,
    why_assignee: focusEvent.task
      ? `Mock Reasoner 读取到当前任务执行对象为 ${assigneeLabel}，因此保持现有执行对象，而不是额外改派。`
      : `Mock Reasoner 当前优先沿用事件里已有的推荐执行对象 ${assigneeLabel}，而不是补造新的技能匹配结果。`,
    why_state: buildMockStateExplanation(focusEvent, state),
  }
}

function buildTemplateStateExplanation(focusEvent: EventOperationalItem, state: AgentLifecycleState) {
  switch (state) {
    case 'recommending':
      return '当前已识别到焦点事件，但还没有关联任务，因此 Agent 处于 recommending，等待确认是否派发。'
    case 'dispatched':
      return '当前任务已创建并完成派发，但还没有收到接收或处理中反馈，因此 Agent 处于 dispatched。'
    case 'waiting_feedback':
      return `当前任务已进入 ${focusEvent.task?.status === 'processing' ? 'processing' : 'received'}，说明执行端已接单或处理中，但还没有终态反馈，因此 Agent 继续等待反馈。`
    case 'reviewing':
      return focusEvent.task?.status === 'completed' || focusEvent.task?.status === 'exception'
        ? '当前任务已经完成或反馈异常，系统进入复盘或后续收尾阶段，因此 Agent 处于 reviewing。'
        : '当前事件已经进入收尾阶段，Agent 将重点转向复盘和后续总结。'
    case 'observing':
    default:
      return '当前没有可处理事件，Agent 保持观察状态。'
  }
}

function buildMockStateExplanation(focusEvent: EventOperationalItem, state: AgentLifecycleState) {
  switch (state) {
    case 'recommending':
      return 'Mock Reasoner 已确认这是当前最需要处理的事件，但任务尚未创建，因此保持 recommending 并等待批准或自动执行资格。'
    case 'dispatched':
      return 'Mock Reasoner 观察到任务已经创建完成，下一步重点转为等待执行端进入接收或处理中。'
    case 'waiting_feedback':
      return `Mock Reasoner 看到任务当前状态为 ${focusEvent.task?.status ?? 'unknown'}，说明执行链已启动，但还没有终态反馈。`
    case 'reviewing':
      return 'Mock Reasoner 判断当前事件已经进入完成、异常或收尾阶段，因此转向 reviewing。'
    case 'observing':
    default:
      return 'Mock Reasoner 当前没有锁定新的待处理事件，因此保持 observing。'
  }
}

function sourceModeLabelFromValue(mode: EventOperationalItem['source_mode'] | 'camera') {
  switch (mode) {
    case 'realtime':
      return '实时输入'
    case 'recorded':
      return '预录输入'
    case 'manual':
      return '人工输入'
    case 'sandbox':
      return '模拟输入'
    case 'mixed':
      return '混合输入'
    case 'camera':
      return '摄像头感知'
    case 'unknown':
    default:
      return '未知输入'
  }
}

export function buildExplanationSourceSummary(source: AgentExplanationSourceKey, isFallback: boolean) {
  const label = getAgentExplanationSourceLabel(source)
  return isFallback ? `解释来源：${label}（当前为 fallback）` : `解释来源：${label}`
}

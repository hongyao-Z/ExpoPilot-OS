import type { AgentContext } from './agent-context-builder'
import type { AgentDecision } from './agent-decision-adapter'

export type AgentToolName = 'dispatch_task' | 'request_human_confirmation' | 'append_agent_log'
export type AgentToolTargetType = 'event' | 'task' | 'decision' | 'cockpit'
export type AgentToolIntent = AgentToolName | 'idle'

const DEMO_PROJECT_ID = 'project-spring-2026'
const DEMO_EVENT_TYPE = 'entrance_congestion'
const DEMO_ACTION_LABEL = '补位'
const DEMO_ASSIGNEE_LABEL = '执行人员 1'

export interface AgentToolCall {
  toolCallId: string
  decisionId: string
  toolName: AgentToolName
  targetType: AgentToolTargetType
  targetId: string
  intentLabel: string
  requestedMode: AgentContext['mode']
  approvalRequired: boolean
  executable: boolean
  arguments: Record<string, string | number | boolean | undefined>
  producer: AgentDecision['producer']
}

export interface AutoExecutionEligibility {
  eligible: boolean
  reason: string
}

export function resolvePrimaryToolIntent(context: AgentContext, decision: Pick<AgentDecision, 'state' | 'logs'>): AgentToolIntent {
  if (decision.state === 'recommending') {
    return context.mode === 'assist' ? 'request_human_confirmation' : 'dispatch_task'
  }

  if (decision.logs.length > 0) return 'append_agent_log'
  return 'idle'
}

export function buildAgentToolCalls(
  context: AgentContext,
  decision: Pick<AgentDecision, 'decisionId' | 'producer' | 'state' | 'eventLabel' | 'actionLabel' | 'assigneeLabel' | 'logs'>,
): AgentToolCall[] {
  const calls: AgentToolCall[] = []
  const eventId = context.focusEvent?.event.event_id
  const taskId = context.focusEvent?.task?.task_id
  const primaryIntent = resolvePrimaryToolIntent(context, decision)

  if (decision.state === 'recommending' && eventId) {
    calls.push({
      toolCallId: `${decision.decisionId}:dispatch_task`,
      decisionId: decision.decisionId,
      toolName: 'dispatch_task',
      targetType: 'event',
      targetId: eventId,
      intentLabel: `派发任务 / ${decision.actionLabel}`,
      requestedMode: context.mode,
      approvalRequired: context.mode === 'assist',
      executable: true,
      arguments: {
        eventId,
        assigneeIdOrLabel: context.focusEvent?.assignee_name ?? context.focusEvent?.event.recommended_assignee_id,
        actionLabel: decision.actionLabel,
      },
      producer: decision.producer,
    })
  }

  if (decision.state === 'recommending' && context.mode === 'assist') {
    calls.push({
      toolCallId: `${decision.decisionId}:request_human_confirmation`,
      decisionId: decision.decisionId,
      toolName: 'request_human_confirmation',
      targetType: 'decision',
      targetId: decision.decisionId,
      intentLabel: `请求人工确认 / ${decision.eventLabel}`,
      requestedMode: context.mode,
      approvalRequired: true,
      executable: true,
      arguments: {
        eventLabel: decision.eventLabel,
        actionLabel: decision.actionLabel,
        assigneeLabel: decision.assigneeLabel,
      },
      producer: decision.producer,
    })
  }

  if (decision.logs.length > 0) {
    calls.push({
      toolCallId: `${decision.decisionId}:append_agent_log`,
      decisionId: decision.decisionId,
      toolName: 'append_agent_log',
      targetType: taskId ? 'task' : 'cockpit',
      targetId: taskId ?? decision.decisionId,
      intentLabel: `追加 Agent 日志 / ${decision.logs.length} 条`,
      requestedMode: context.mode,
      approvalRequired: false,
      executable: true,
      arguments: {
        decisionId: decision.decisionId,
        logCount: decision.logs.length,
        latestStage: decision.logs[decision.logs.length - 1]?.stage,
        primaryIntent,
      },
      producer: decision.producer,
    })
  }

  return calls
}

export function evaluateAutoExecutionEligibility(
  context: AgentContext,
  decision: Pick<AgentDecision, 'state' | 'actionLabel' | 'assigneeLabel' | 'toolCalls'>,
): AutoExecutionEligibility {
  if (context.mode !== 'auto') {
    return {
      eligible: false,
      reason: '当前为 Assist 模式，需由人工批准后才执行派发。',
    }
  }

  if (context.projectId !== DEMO_PROJECT_ID) {
    return {
      eligible: false,
      reason: '当前项目不是 demo 项目，Auto 仅在春季消费展的受控场景下开放。',
    }
  }

  if (!context.focusEvent) {
    return {
      eligible: false,
      reason: '当前没有焦点事件，Auto 模式暂时只展示建议。',
    }
  }

  if (decision.state !== 'recommending') {
    return {
      eligible: false,
      reason: `当前状态为 ${decision.state}，Auto 仅在 recommending 阶段开放受控自动执行。`,
    }
  }

  if (context.focusEvent.event.event_type !== DEMO_EVENT_TYPE) {
    return {
      eligible: false,
      reason: '当前事件不是 entrance_congestion，Auto 受控执行范围未覆盖该事件类型。',
    }
  }

  if (decision.actionLabel !== DEMO_ACTION_LABEL) {
    return {
      eligible: false,
      reason: '当前建议动作不是“补位”，Auto 受控执行范围未覆盖该任务类型。',
    }
  }

  if (decision.assigneeLabel !== DEMO_ASSIGNEE_LABEL) {
    return {
      eligible: false,
      reason: '当前推荐执行人不是 demo 既定执行对象，Auto 已降级为仅展示建议。',
    }
  }

  const dispatchCall = decision.toolCalls.find((call) => call.toolName === 'dispatch_task')

  if (!dispatchCall) {
    return {
      eligible: false,
      reason: '当前决策还没有可执行的 dispatch_task 工具调用，Auto 仅保留建议态。',
    }
  }

  if (!dispatchCall.executable) {
    return {
      eligible: false,
      reason: '当前 dispatch_task 工具调用不可执行，Auto 仅保留建议态。',
    }
  }

  if (dispatchCall.approvalRequired) {
    return {
      eligible: false,
      reason: '当前派发仍要求人工审批，Auto 不能直接执行。',
    }
  }

  return {
    eligible: true,
    reason: '当前满足 demo Auto 条件：春季消费展 / entrance_congestion / 补位 / 执行人员 1，且无需人工审批，可执行一次受控自动派发。',
  }
}

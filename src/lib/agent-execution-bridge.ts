import type { AgentContext } from './agent-context-builder'
import type { AgentDecision } from './agent-decision-adapter'
import type { AgentToolCall, AgentToolName } from './agent-tools'

export type AgentToolExecutionStatus = 'ready' | 'blocked' | 'approved' | 'executed' | 'skipped' | 'failed'
export type AgentToolApprovalState = 'not_required' | 'required' | 'approved' | 'rejected'

export interface AgentToolExecutionResult {
  toolCallId: string
  decisionId: string
  toolName: AgentToolName
  status: AgentToolExecutionStatus
  approvalState: AgentToolApprovalState
  executed: boolean
  detail: string
  fallbackReason?: string
  executedAt?: string
}

export interface ExecuteAgentToolCallInput {
  context: AgentContext
  decision: AgentDecision
  toolCall: AgentToolCall
  dispatchEvent?: (eventId: string, assigneeId?: string) => void
  assigneeId?: string
  approvalGranted?: boolean
  alreadyExecuted?: boolean
}

export function executeAgentToolCall(input: ExecuteAgentToolCallInput): AgentToolExecutionResult {
  switch (input.toolCall.toolName) {
    case 'request_human_confirmation':
      return executeHumanConfirmation(input)
    case 'append_agent_log':
      return executeAppendAgentLog(input)
    case 'dispatch_task':
    default:
      return executeDispatchTask(input)
  }
}

function executeHumanConfirmation(input: ExecuteAgentToolCallInput): AgentToolExecutionResult {
  if (!input.toolCall.executable || !input.decision.effectivePrimaryActionEnabled) {
    return {
      toolCallId: input.toolCall.toolCallId,
      decisionId: input.decision.decisionId,
      toolName: input.toolCall.toolName,
      status: 'blocked',
      approvalState: 'required',
      executed: false,
      detail: input.decision.boundaryReason,
      fallbackReason: 'request_human_confirmation_not_executable',
    }
  }

  if (!input.decision.approvalRequired) {
    return {
      toolCallId: input.toolCall.toolCallId,
      decisionId: input.decision.decisionId,
      toolName: input.toolCall.toolName,
      status: 'skipped',
      approvalState: 'not_required',
      executed: false,
      detail: '当前统一风控边界不要求额外人工审批，本次确认步骤已跳过。',
      fallbackReason: 'approval_not_required_by_risk_policy',
    }
  }

  return {
    toolCallId: input.toolCall.toolCallId,
    decisionId: input.decision.decisionId,
    toolName: input.toolCall.toolName,
    status: 'approved',
    approvalState: 'approved',
    executed: false,
    detail: `人工已批准当前建议：${input.decision.actionLabel} / ${input.decision.assigneeLabel}。`,
    executedAt: new Date().toISOString(),
  }
}

function executeAppendAgentLog(input: ExecuteAgentToolCallInput): AgentToolExecutionResult {
  return {
    toolCallId: input.toolCall.toolCallId,
    decisionId: input.decision.decisionId,
    toolName: input.toolCall.toolName,
    status: 'executed',
    approvalState: 'not_required',
    executed: true,
    detail: `当前桥接层已消费 ${input.decision.logs.length} 条 Agent 日志，可继续用于审计映射。`,
    executedAt: new Date().toISOString(),
  }
}

function executeDispatchTask(input: ExecuteAgentToolCallInput): AgentToolExecutionResult {
  if (!input.toolCall.executable) {
    return {
      toolCallId: input.toolCall.toolCallId,
      decisionId: input.decision.decisionId,
      toolName: input.toolCall.toolName,
      status: 'blocked',
      approvalState: input.decision.approvalRequired ? 'required' : 'not_required',
      executed: false,
      detail: input.decision.boundaryReason,
      fallbackReason: 'dispatch_task_not_executable',
    }
  }

  if (!input.decision.effectivePrimaryActionEnabled) {
    return {
      toolCallId: input.toolCall.toolCallId,
      decisionId: input.decision.decisionId,
      toolName: input.toolCall.toolName,
      status: input.alreadyExecuted ? 'skipped' : 'blocked',
      approvalState: input.decision.approvalRequired ? 'approved' : 'not_required',
      executed: false,
      detail: input.decision.boundaryReason,
      fallbackReason: input.alreadyExecuted ? 'decision_already_executed' : 'dispatch_blocked_by_risk_policy',
    }
  }

  if (input.decision.approvalRequired && !input.approvalGranted) {
    return {
      toolCallId: input.toolCall.toolCallId,
      decisionId: input.decision.decisionId,
      toolName: input.toolCall.toolName,
      status: 'blocked',
      approvalState: 'required',
      executed: false,
      detail: input.decision.boundaryReason,
      fallbackReason: 'approval_required_before_dispatch',
    }
  }

  if (input.decision.effectiveMode === 'auto' && !input.decision.canAutoExecute) {
    return {
      toolCallId: input.toolCall.toolCallId,
      decisionId: input.decision.decisionId,
      toolName: input.toolCall.toolName,
      status: 'blocked',
      approvalState: 'not_required',
      executed: false,
      detail: input.decision.boundaryReason,
      fallbackReason: 'auto_execution_not_eligible',
    }
  }

  if (!input.dispatchEvent) {
    return {
      toolCallId: input.toolCall.toolCallId,
      decisionId: input.decision.decisionId,
      toolName: input.toolCall.toolName,
      status: 'failed',
      approvalState: input.decision.approvalRequired ? 'approved' : 'not_required',
      executed: false,
      detail: '当前页面没有提供 dispatchEvent 执行入口，桥接层无法完成派发。',
      fallbackReason: 'missing_dispatch_executor',
    }
  }

  const eventId = typeof input.toolCall.arguments.eventId === 'string' ? input.toolCall.arguments.eventId : undefined
  if (!eventId) {
    return {
      toolCallId: input.toolCall.toolCallId,
      decisionId: input.decision.decisionId,
      toolName: input.toolCall.toolName,
      status: 'failed',
      approvalState: input.decision.approvalRequired ? 'approved' : 'not_required',
      executed: false,
      detail: '当前 dispatch_task 缺少 eventId，桥接层无法调用现有派发入口。',
      fallbackReason: 'missing_event_id',
    }
  }

  try {
    input.dispatchEvent(eventId, input.assigneeId)
    return {
      toolCallId: input.toolCall.toolCallId,
      decisionId: input.decision.decisionId,
      toolName: input.toolCall.toolName,
      status: 'executed',
      approvalState: input.decision.approvalRequired ? 'approved' : 'not_required',
      executed: true,
      detail: `桥接层已通过现有派发入口执行 ${input.decision.actionLabel} / ${input.decision.assigneeLabel}。`,
      executedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      toolCallId: input.toolCall.toolCallId,
      decisionId: input.decision.decisionId,
      toolName: input.toolCall.toolName,
      status: 'failed',
      approvalState: input.decision.approvalRequired ? 'approved' : 'not_required',
      executed: false,
      detail: `桥接层调用现有派发入口失败：${toErrorMessage(error)}`,
      fallbackReason: 'dispatch_executor_failed',
    }
  }
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'unknown error'
}

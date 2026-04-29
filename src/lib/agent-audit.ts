import type { AgentContext } from './agent-context-builder'
import type { AgentDecision } from './agent-decision-adapter'
import type { AgentToolCall } from './agent-tools'
import type { AgentToolExecutionResult } from './agent-execution-bridge'
import type { AgentRollbackResult } from './agent-rollback'

export type AgentAuditStage = 'decision' | 'risk' | 'visibility' | 'approval' | 'execution' | 'degraded' | 'takeover'
export type AgentAuditActor = 'agent' | 'human' | 'system'

export interface AgentAuditRecord {
  auditId: string
  projectId: string | null
  contextId: string
  decisionId: string
  toolCallId: string | null
  stage: AgentAuditStage
  actor: AgentAuditActor
  action: string
  detail: string
  createdAt: string
}

function createAgentAuditRecord(input: {
  auditId: string
  projectId: string | null
  contextId: string
  decisionId: string
  toolCallId?: string | null
  stage: AgentAuditStage
  actor: AgentAuditActor
  action: string
  detail: string
  createdAt: string
}): AgentAuditRecord {
  return {
    auditId: input.auditId,
    projectId: input.projectId,
    contextId: input.contextId,
    decisionId: input.decisionId,
    toolCallId: input.toolCallId ?? null,
    stage: input.stage,
    actor: input.actor,
    action: input.action,
    detail: input.detail,
    createdAt: input.createdAt,
  }
}

export function findDispatchToolCall(toolCalls: AgentToolCall[]) {
  return toolCalls.find((toolCall) => toolCall.toolName === 'dispatch_task') ?? null
}

export function buildDerivedAgentAuditRecords(context: AgentContext, decision: AgentDecision): AgentAuditRecord[] {
  const fallbackAt = new Date().toISOString()
  const eventAt = context.focusEvent?.event.timestamp ?? fallbackAt
  const dispatchToolCall = findDispatchToolCall(decision.toolCalls)
  const projectId = context.projectId ?? null
  const records: AgentAuditRecord[] = []

  records.push(
    createAgentAuditRecord({
      auditId: `${decision.decisionId}:decision`,
      projectId,
      contextId: decision.contextId,
      decisionId: decision.decisionId,
      toolCallId: null,
      stage: 'decision',
      actor: 'agent',
      action: 'decision_created',
      detail: `Agent 已生成 ${decision.state} 决策，当前建议动作为“${decision.actionLabel}”，风险等级为 ${decision.riskLevel}。`,
      createdAt: eventAt,
    }),
  )

  records.push(
    createAgentAuditRecord({
      auditId: `${decision.decisionId}:risk`,
      projectId,
      contextId: decision.contextId,
      decisionId: decision.decisionId,
      toolCallId: dispatchToolCall?.toolCallId ?? null,
      stage: 'risk',
      actor: 'system',
      action: 'risk_evaluated',
      detail: `当前风控边界判定为 ${decision.riskLevel}，effectiveMode=${decision.effectiveMode}，approvalRequired=${decision.approvalRequired ? 'true' : 'false'}。`,
      createdAt: fallbackAt,
    }),
  )

  if (context.focusEvent) {
    records.push(
      createAgentAuditRecord({
        auditId: `${decision.decisionId}:visibility`,
        projectId,
        contextId: decision.contextId,
        decisionId: decision.decisionId,
        toolCallId: dispatchToolCall?.toolCallId ?? null,
        stage: 'visibility',
        actor: 'system',
        action: 'suggestion_visible',
        detail: `驾驶舱已展示当前建议：${decision.eventLabel} / ${decision.actionLabel} / ${decision.assigneeLabel}。`,
        createdAt: eventAt,
      }),
    )
  }

  if (context.mode === 'auto' && decision.effectiveMode === 'assist') {
    records.push(
      createAgentAuditRecord({
        auditId: `${decision.decisionId}:degraded`,
        projectId,
        contextId: decision.contextId,
        decisionId: decision.decisionId,
        toolCallId: dispatchToolCall?.toolCallId ?? null,
        stage: 'degraded',
        actor: 'system',
        action: 'auto_degraded',
        detail: decision.boundaryReason,
        createdAt: fallbackAt,
      }),
    )
  }

  return sortAgentAuditRecords(records)
}

export function createApprovalRequestedAuditRecord(
  projectId: string | null,
  decision: AgentDecision,
  toolCallId?: string | null,
): AgentAuditRecord {
  return createAgentAuditRecord({
    auditId: `${decision.decisionId}:approval-requested:${Date.now()}`,
    projectId,
    contextId: decision.contextId,
    decisionId: decision.decisionId,
    toolCallId: toolCallId ?? null,
    stage: 'approval',
    actor: 'system',
    action: 'approval_requested',
    detail: `当前建议进入人工批准边界：${decision.actionLabel} / ${decision.assigneeLabel}。`,
    createdAt: new Date().toISOString(),
  })
}

export function createApprovalAuditRecordFromResult(
  projectId: string | null,
  decision: AgentDecision,
  result: AgentToolExecutionResult,
): AgentAuditRecord {
  return createAgentAuditRecord({
    auditId: `${decision.decisionId}:approval:${Date.now()}`,
    projectId,
    contextId: decision.contextId,
    decisionId: decision.decisionId,
    toolCallId: result.toolCallId,
    stage: result.status === 'approved' ? 'approval' : 'degraded',
    actor: result.status === 'approved' ? 'human' : 'system',
    action: result.status === 'approved' ? 'approval_granted' : 'approval_not_completed',
    detail: result.detail,
    createdAt: result.executedAt ?? new Date().toISOString(),
  })
}

export function createExecutionAuditRecordFromResult(
  projectId: string | null,
  decision: AgentDecision,
  result: AgentToolExecutionResult,
): AgentAuditRecord {
  const isExecuted = result.status === 'executed'

  return createAgentAuditRecord({
    auditId: `${decision.decisionId}:${isExecuted ? 'execution' : 'degraded'}:${Date.now()}`,
    projectId,
    contextId: decision.contextId,
    decisionId: decision.decisionId,
    toolCallId: result.toolCallId,
    stage: isExecuted ? 'execution' : 'degraded',
    actor: isExecuted ? (result.toolName === 'append_agent_log' ? 'system' : 'agent') : 'system',
    action: isExecuted ? 'tool_execution_result' : 'tool_execution_blocked',
    detail: result.detail,
    createdAt: result.executedAt ?? new Date().toISOString(),
  })
}

export function createRollbackAuditRecord(
  projectId: string | null,
  decision: AgentDecision,
  rollback: AgentRollbackResult,
  toolCallId?: string | null,
): AgentAuditRecord {
  return createAgentAuditRecord({
    auditId: `${decision.decisionId}:rollback:${Date.now()}`,
    projectId,
    contextId: decision.contextId,
    decisionId: decision.decisionId,
    toolCallId: toolCallId ?? null,
    stage: 'degraded',
    actor: 'system',
    action: rollback.auditAction ?? 'rollback_applied',
    detail: `${rollback.rollbackReason} 当前状态：${rollback.postActionStateLabel}。`,
    createdAt: new Date().toISOString(),
  })
}

export function createHumanTakeoverAuditRecord(projectId: string | null, decision: AgentDecision, detail: string): AgentAuditRecord {
  return createAgentAuditRecord({
    auditId: `${decision.decisionId}:takeover:${Date.now()}`,
    projectId,
    contextId: decision.contextId,
    decisionId: decision.decisionId,
    toolCallId: null,
    stage: 'takeover',
    actor: 'human',
    action: 'human_takeover',
    detail,
    createdAt: new Date().toISOString(),
  })
}

export function sortAgentAuditRecords(records: AgentAuditRecord[]) {
  return [...records].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
}

export function summarizeAgentAudit(records: AgentAuditRecord[]) {
  if (records.length === 0) {
    return '当前还没有 Agent 审计记录。'
  }

  const latest = records[records.length - 1]

  switch (latest.stage) {
    case 'decision':
      return '最近一条审计记录：Agent 已生成当前决策。'
    case 'risk':
      return '最近一条审计记录：当前风控边界已完成评估。'
    case 'visibility':
      return '最近一条审计记录：当前建议已经进入驾驶舱展示。'
    case 'approval':
      return '最近一条审计记录：人工批准流程已有更新。'
    case 'execution':
      return '最近一条审计记录：Agent 已执行一次受控自动派发。'
    case 'degraded':
      switch (latest.action) {
        case 'auto_degraded':
          return '最近一条审计记录：当前 Auto 已按风控边界降级为 Assist。'
        case 'auto_failed_fallback':
          return '最近一条审计记录：Auto 执行失败，已退回人工处理。'
        case 'approval_blocked_fallback':
          return '最近一条审计记录：审批未通过，当前已回到建议态。'
        case 'rollback_applied':
          return '最近一条审计记录：当前已应用控制面回退语义。'
        default:
          return '最近一条审计记录：当前工具桥接未执行，系统已保留人工处理语义。'
      }
    case 'takeover':
      return '最近一条审计记录：人工已接管当前建议。'
    default:
      return latest.detail
  }
}

import type { AgentContext } from './agent-context-builder'
import type { AgentDecision } from './agent-decision-adapter'
import type { AgentToolExecutionResult } from './agent-execution-bridge'
import type { AgentTakeoverPolicyResult } from './agent-takeover-policy'

export type AgentRollbackAuditAction = 'rollback_applied' | 'auto_failed_fallback' | 'approval_blocked_fallback' | null

export interface AgentRollbackResult {
  rollbackRequired: boolean
  rollbackReason: string
  postActionMode: AgentContext['mode']
  postActionStateLabel: string
  controlsLocked: boolean
  humanOwnerRequired: boolean
  auditAction: AgentRollbackAuditAction
}

export function evaluateAgentRollback(input: {
  decision: AgentDecision
  result: AgentToolExecutionResult
  takeoverPolicy: AgentTakeoverPolicyResult
}): AgentRollbackResult {
  const { decision, result, takeoverPolicy } = input

  if (result.status === 'executed') {
    return {
      rollbackRequired: false,
      rollbackReason: '当前建议已执行完成，不需要额外回退。',
      postActionMode: decision.effectiveMode,
      postActionStateLabel: '当前建议已执行完成',
      controlsLocked: true,
      humanOwnerRequired: false,
      auditAction: null,
    }
  }

  if (result.status === 'approved') {
    return {
      rollbackRequired: false,
      rollbackReason: '当前已完成人工批准，可继续执行当前建议。',
      postActionMode: 'assist',
      postActionStateLabel: '已人工批准，等待继续执行',
      controlsLocked: false,
      humanOwnerRequired: true,
      auditAction: null,
    }
  }

  if (result.status === 'skipped') {
    const controlsLocked = takeoverPolicy.controlsLocked || result.fallbackReason === 'decision_already_executed'

    return {
      rollbackRequired: false,
      rollbackReason: result.detail,
      postActionMode: decision.effectiveMode,
      postActionStateLabel: controlsLocked ? '当前 controls 已锁定' : '当前建议未发生执行变更',
      controlsLocked,
      humanOwnerRequired: takeoverPolicy.humanOwnerRequired,
      auditAction: null,
    }
  }

  if (isApprovalBlocked(result)) {
    return {
      rollbackRequired: true,
      rollbackReason: result.detail,
      postActionMode: 'assist',
      postActionStateLabel: '审批未完成，等待人工处理',
      controlsLocked: false,
      humanOwnerRequired: true,
      auditAction: 'approval_blocked_fallback',
    }
  }

  if (result.status === 'failed' && decision.effectiveMode === 'auto') {
    return {
      rollbackRequired: true,
      rollbackReason: `Auto 执行失败，系统已退回 Assist：${result.detail}`,
      postActionMode: 'assist',
      postActionStateLabel: 'Auto 失败 / 转人工处理',
      controlsLocked: false,
      humanOwnerRequired: true,
      auditAction: 'auto_failed_fallback',
    }
  }

  if (result.status === 'blocked' || result.status === 'failed') {
    return {
      rollbackRequired: true,
      rollbackReason: result.detail,
      postActionMode: 'assist',
      postActionStateLabel: '当前建议已回退为人工处理',
      controlsLocked: false,
      humanOwnerRequired: true,
      auditAction: 'rollback_applied',
    }
  }

  return {
    rollbackRequired: false,
    rollbackReason: result.detail,
    postActionMode: decision.effectiveMode,
    postActionStateLabel: decision.postActionStateLabel ?? '当前建议等待人工处理',
    controlsLocked: takeoverPolicy.controlsLocked,
    humanOwnerRequired: takeoverPolicy.humanOwnerRequired,
    auditAction: null,
  }
}

function isApprovalBlocked(result: AgentToolExecutionResult) {
  return (
    result.status === 'blocked' &&
    (result.toolName === 'request_human_confirmation' ||
      result.fallbackReason === 'approval_required_before_dispatch' ||
      result.approvalState === 'required')
  )
}


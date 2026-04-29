import type { AgentContext, AgentMode } from './agent-context-builder'
import { getAgentDecisionProducerLabel } from './agent-decision-config'
import { getAgentExplanationSourceLabel } from './agent-explanation-config'
import type { AgentDecision, AgentExplanationSet, AgentLifecycleState, AgentLogItem } from './agent-decision-adapter'
import type { AgentAuditRecord } from './agent-audit'
import { summarizeAgentAudit } from './agent-audit'

export type { AgentMode } from './agent-context-builder'
export type { AgentDecision, AgentExplanationSet, AgentLifecycleState, AgentLogItem } from './agent-decision-adapter'
export type { AgentAuditRecord } from './agent-audit'

export interface AgentCockpitViewModel {
  mode: AgentMode
  state: AgentLifecycleState
  focusZoneLabel: string
  eventLabel: string
  actionLabel: string
  assigneeLabel: string
  explanations: AgentExplanationSet
  logs: AgentLogItem[]
  statusSummary: string
  primaryActionLabel: string
  primaryActionEnabled: boolean
  actionReason: string
  auditSummary: string
  auditRecords: AgentAuditRecord[]
  takeoverAvailable: boolean
  takeoverLabel: string
  decisionProducerLabel: string
  decisionMetaSummary: string
  explanationSourceLabel: string
  explanationFallbackLabel: string
  riskLevelLabel: string
  takeoverStatusLabel: string
  controlsStatusLabel: string
  postActionOwnerLabel: string
}

export function buildAgentCockpitViewModel(
  context: AgentContext,
  decision: AgentDecision,
  auditRecords: AgentAuditRecord[],
): AgentCockpitViewModel {
  const latestBoundaryAudit = findLatestBoundaryAudit(auditRecords)

  return {
    mode: context.mode,
    state: decision.state,
    focusZoneLabel: decision.focusZoneLabel,
    eventLabel: decision.eventLabel,
    actionLabel: decision.actionLabel,
    assigneeLabel: decision.assigneeLabel,
    explanations: decision.explanations,
    logs: decision.logs,
    statusSummary: decision.statusSummary,
    primaryActionLabel: decision.effectivePrimaryActionLabel,
    primaryActionEnabled: decision.effectivePrimaryActionEnabled,
    actionReason: decision.boundaryReason,
    auditSummary: summarizeAgentAudit(auditRecords),
    auditRecords,
    takeoverAvailable: Boolean(decision.takeoverAllowed),
    takeoverLabel: '人工接管当前建议',
    decisionProducerLabel: decision.producerMeta?.providerLabel ?? getAgentDecisionProducerLabel(decision.producer),
    decisionMetaSummary: buildDecisionMetaSummary(decision),
    explanationSourceLabel: `解释来源：${getAgentExplanationSourceLabel(decision.explanationSource)}`,
    explanationFallbackLabel: decision.explanationIsFallback ? '当前解释已回退到模板来源' : '当前解释未发生 fallback',
    riskLevelLabel: riskLevelLabel(decision.riskLevel),
    takeoverStatusLabel: buildTakeoverStatusLabel(decision, latestBoundaryAudit),
    controlsStatusLabel: buildControlsStatusLabel(decision, latestBoundaryAudit),
    postActionOwnerLabel: buildPostActionOwnerLabel(decision, latestBoundaryAudit),
  }
}

function findLatestBoundaryAudit(auditRecords: AgentAuditRecord[]) {
  return [...auditRecords]
    .reverse()
    .find((record) =>
      ['human_takeover', 'rollback_applied', 'auto_failed_fallback', 'approval_blocked_fallback'].includes(record.action),
    )
}

function buildTakeoverStatusLabel(decision: AgentDecision, latestBoundaryAudit?: AgentAuditRecord) {
  switch (latestBoundaryAudit?.action) {
    case 'human_takeover':
      return '当前已人工接管'
    case 'auto_failed_fallback':
      return '当前已从 Auto 回退为 Assist'
    case 'approval_blocked_fallback':
      return '当前审批未完成，系统保持建议态'
    case 'rollback_applied':
      return '当前已应用控制面回退语义'
    default:
      return decision.takeoverAllowed ? `当前可人工接管：${decision.takeoverReason ?? decision.boundaryReason}` : '当前无需人工接管'
  }
}

function buildControlsStatusLabel(decision: AgentDecision, latestBoundaryAudit?: AgentAuditRecord) {
  if (decision.controlsLocked || !decision.effectivePrimaryActionEnabled) {
    return '当前 controls 已锁定'
  }

  if (latestBoundaryAudit?.action === 'human_takeover') {
    return '当前 controls 已转为人工主导'
  }

  if (latestBoundaryAudit?.action === 'approval_blocked_fallback') {
    return '当前 controls 等待人工批准'
  }

  return '当前 controls 可继续执行'
}

function buildPostActionOwnerLabel(decision: AgentDecision, latestBoundaryAudit?: AgentAuditRecord) {
  if (
    latestBoundaryAudit &&
    ['human_takeover', 'rollback_applied', 'auto_failed_fallback', 'approval_blocked_fallback'].includes(latestBoundaryAudit.action)
  ) {
    return '后续应由人工处理'
  }

  return decision.humanOwnerRequired ? '后续应由人工处理' : '当前仍由 Agent 控制面推进'
}

function buildDecisionMetaSummary(decision: AgentDecision) {
  const producerLabel = decision.producerMeta?.providerLabel ?? getAgentDecisionProducerLabel(decision.producer)
  const confidenceLabel =
    typeof decision.effectiveConfidence === 'number' ? `有效置信度 ${decision.effectiveConfidence.toFixed(2)}` : '有效置信度未提供'
  const approvalLabel = decision.approvalRequired
    ? '当前边界要求人工批准'
    : decision.canAutoExecute
      ? '当前边界允许受控 Auto 执行'
      : '当前边界阻断执行'

  if (decision.fallbackReason) {
    return `当前决策来源：${producerLabel}。${confidenceLabel}，风险 ${riskLevelLabel(decision.riskLevel)}，${approvalLabel}。Fallback：${decision.fallbackReason}`
  }

  return `当前决策来源：${producerLabel}。${confidenceLabel}，风险 ${riskLevelLabel(decision.riskLevel)}，${approvalLabel}。`
}

function riskLevelLabel(level: AgentDecision['riskLevel']) {
  switch (level) {
    case 'low':
      return '低'
    case 'medium':
      return '中'
    case 'high':
    default:
      return '高'
  }
}

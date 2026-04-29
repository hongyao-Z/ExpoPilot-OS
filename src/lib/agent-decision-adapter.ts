import type { AgentContext } from './agent-context-builder'
import { getActiveAgentDecisionProducer, type AgentDecisionProducerKey } from './agent-decision-config'
import { getActiveAgentExplanationSource, type AgentExplanationSourceKey } from './agent-explanation-config'
import {
  buildAgentToolCalls,
  evaluateAutoExecutionEligibility,
  resolvePrimaryToolIntent,
  type AgentToolCall,
  type AgentToolIntent,
} from './agent-tools'
import { resolveAgentDecisionBase } from './agent-decision-providers'
import { evaluateAgentRiskPolicy, type AgentRiskLevel } from './agent-risk-policy'
import { evaluateAgentTakeoverPolicy } from './agent-takeover-policy'

export type AgentLifecycleState = 'observing' | 'recommending' | 'dispatched' | 'waiting_feedback' | 'reviewing'

export interface AgentExplanationSet {
  why_event: string
  why_action: string
  why_assignee: string
  why_state: string
}

export interface AgentLogItem {
  at: string
  stage: 'observed' | 'recommended' | 'dispatched' | 'feedback' | 'reviewing'
  label: string
  detail: string
}

export interface AgentProducerMeta {
  origin: 'direct' | 'fallback'
  providerLabel: string
  fallbackFrom?: AgentDecisionProducerKey
  notes?: string
}

export interface AgentDecision {
  decisionId: string
  contextId: string
  producer: AgentDecisionProducerKey
  toolIntent: AgentToolIntent
  toolCalls: AgentToolCall[]
  state: AgentLifecycleState
  focusZoneLabel: string
  eventLabel: string
  actionLabel: string
  assigneeLabel: string
  explanations: AgentExplanationSet
  explanationSource: AgentExplanationSourceKey
  explanationIsFallback: boolean
  logs: AgentLogItem[]
  statusSummary: string
  primaryActionLabel: string
  primaryActionEnabled: boolean
  confidence?: number
  requiresApproval?: boolean
  fallbackReason?: string
  producerMeta?: AgentProducerMeta
  autoExecutionEligible: boolean
  autoExecutionReason: string
  effectivePrimaryActionLabel: string
  effectivePrimaryActionEnabled: boolean
  effectiveMode: AgentContext['mode']
  canAutoExecute: boolean
  approvalRequired: boolean
  riskLevel: AgentRiskLevel
  boundaryReason: string
  effectiveConfidence: number | null
  takeoverAllowed?: boolean
  takeoverReason?: string
  takeoverPostMode?: AgentContext['mode']
  controlsLocked?: boolean
  humanOwnerRequired?: boolean
  postActionStateLabel?: string
}

export async function buildAgentDecision(
  context: AgentContext,
  preferredProducer: AgentDecisionProducerKey = getActiveAgentDecisionProducer(),
  options?: {
    executedDecisionIds?: Record<string, true>
  },
  preferredExplanationSource: AgentExplanationSourceKey = getActiveAgentExplanationSource(),
): Promise<AgentDecision> {
  const baseDecision = await resolveAgentDecisionBase(context, preferredProducer, preferredExplanationSource)
  const toolIntent = resolvePrimaryToolIntent(context, baseDecision)
  const toolCalls = buildAgentToolCalls(context, baseDecision)
  const autoEligibility = evaluateAutoExecutionEligibility(context, {
    state: baseDecision.state,
    actionLabel: baseDecision.actionLabel,
    assigneeLabel: baseDecision.assigneeLabel,
    toolCalls,
  })
  const dispatchToolCall = toolCalls.find((call) => call.toolName === 'dispatch_task') ?? null
  const alreadyExecuted = Boolean(options?.executedDecisionIds?.[baseDecision.decisionId])
  const riskPolicy = evaluateAgentRiskPolicy({
    mode: context.mode,
    producer: baseDecision.producer,
    confidence: baseDecision.confidence,
    requiresApproval: baseDecision.requiresApproval,
    fallbackReason: baseDecision.fallbackReason,
    toolIntent,
    actionLabel: baseDecision.actionLabel,
    autoExecutionEligible: autoEligibility.eligible,
    autoExecutionReason: autoEligibility.reason,
    dispatchToolCall,
    alreadyExecuted,
  })
  const takeoverPolicy = evaluateAgentTakeoverPolicy({
    mode: context.mode,
    state: baseDecision.state,
    effectiveMode: riskPolicy.effectiveMode,
    canAutoExecute: riskPolicy.canAutoExecute,
    approvalRequired: riskPolicy.approvalRequired,
    riskLevel: riskPolicy.riskLevel,
    fallbackReason: riskPolicy.fallbackReason,
    boundaryReason: riskPolicy.boundaryReason,
    effectivePrimaryActionEnabled: riskPolicy.effectivePrimaryActionEnabled,
    alreadyExecuted,
  })

  return {
    ...baseDecision,
    toolIntent,
    toolCalls,
    autoExecutionEligible: autoEligibility.eligible,
    autoExecutionReason: autoEligibility.reason,
    effectivePrimaryActionLabel: riskPolicy.effectivePrimaryActionLabel,
    effectivePrimaryActionEnabled: riskPolicy.effectivePrimaryActionEnabled && !takeoverPolicy.controlsLocked,
    effectiveMode: riskPolicy.effectiveMode,
    canAutoExecute: riskPolicy.canAutoExecute,
    approvalRequired: riskPolicy.approvalRequired,
    riskLevel: riskPolicy.riskLevel,
    boundaryReason: riskPolicy.boundaryReason,
    effectiveConfidence: riskPolicy.effectiveConfidence,
    takeoverAllowed: takeoverPolicy.takeoverAllowed,
    takeoverReason: takeoverPolicy.takeoverReason,
    takeoverPostMode: takeoverPolicy.postTakeoverMode,
    controlsLocked: takeoverPolicy.controlsLocked,
    humanOwnerRequired: takeoverPolicy.humanOwnerRequired,
    postActionStateLabel: takeoverPolicy.postActionStateLabel,
  }
}

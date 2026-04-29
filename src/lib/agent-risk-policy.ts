import type { AgentContext } from './agent-context-builder'
import type { AgentDecisionProducerKey } from './agent-decision-config'
import type { AgentToolCall, AgentToolIntent } from './agent-tools'

export type AgentRiskLevel = 'low' | 'medium' | 'high'

export interface AgentRiskPolicyInput {
  mode: AgentContext['mode']
  producer: AgentDecisionProducerKey
  confidence?: number
  requiresApproval?: boolean
  fallbackReason?: string
  toolIntent: AgentToolIntent
  actionLabel: string
  autoExecutionEligible: boolean
  autoExecutionReason: string
  dispatchToolCall: Pick<AgentToolCall, 'toolCallId' | 'toolName' | 'approvalRequired' | 'executable'> | null
  alreadyExecuted: boolean
}

export interface AgentRiskPolicyResult {
  effectiveMode: AgentContext['mode']
  canAutoExecute: boolean
  approvalRequired: boolean
  riskLevel: AgentRiskLevel
  effectiveConfidence: number | null
  fallbackReason?: string
  boundaryReason: string
  effectivePrimaryActionLabel: string
  effectivePrimaryActionEnabled: boolean
}

const AUTO_CONFIDENCE_THRESHOLD = 0.75
const AUTO_ALLOWED_PRODUCERS: AgentDecisionProducerKey[] = ['local_rule_based', 'mock_agent']

export function evaluateAgentRiskPolicy(input: AgentRiskPolicyInput): AgentRiskPolicyResult {
  const effectiveConfidence =
    typeof input.confidence === 'number' && Number.isFinite(input.confidence)
      ? Number(input.confidence.toFixed(2))
      : null
  const hasDispatchTool = Boolean(input.dispatchToolCall)
  const dispatchExecutable = Boolean(input.dispatchToolCall?.executable)
  const hasFallback = Boolean(input.fallbackReason)
  const producerAllowsAuto = AUTO_ALLOWED_PRODUCERS.includes(input.producer)
  const confidenceAllowsAuto = effectiveConfidence !== null && effectiveConfidence >= AUTO_CONFIDENCE_THRESHOLD

  const canAutoExecute =
    input.mode === 'auto' &&
    input.toolIntent === 'dispatch_task' &&
    input.autoExecutionEligible &&
    producerAllowsAuto &&
    confidenceAllowsAuto &&
    !input.requiresApproval &&
    !hasFallback &&
    dispatchExecutable &&
    !input.alreadyExecuted

  const approvalRequired = !canAutoExecute && dispatchExecutable && !input.alreadyExecuted
  const effectiveMode: AgentContext['mode'] = canAutoExecute ? 'auto' : 'assist'

  const boundaryReason = buildBoundaryReason(input, {
    hasDispatchTool,
    dispatchExecutable,
    hasFallback,
    producerAllowsAuto,
    confidenceAllowsAuto,
    effectiveConfidence,
    canAutoExecute,
  })

  return {
    effectiveMode,
    canAutoExecute,
    approvalRequired,
    riskLevel: deriveRiskLevel({
      canAutoExecute,
      approvalRequired,
      hasFallback,
      producerAllowsAuto,
      confidenceAllowsAuto,
    }),
    effectiveConfidence,
    fallbackReason: input.fallbackReason,
    boundaryReason,
    effectivePrimaryActionLabel: buildPrimaryActionLabel(input, {
      hasDispatchTool,
      dispatchExecutable,
      canAutoExecute,
    }),
    effectivePrimaryActionEnabled: dispatchExecutable && !input.alreadyExecuted,
  }
}

function buildBoundaryReason(
  input: AgentRiskPolicyInput,
  state: {
    hasDispatchTool: boolean
    dispatchExecutable: boolean
    hasFallback: boolean
    producerAllowsAuto: boolean
    confidenceAllowsAuto: boolean
    effectiveConfidence: number | null
    canAutoExecute: boolean
  },
) {
  if (!state.hasDispatchTool) {
    return '当前没有可执行的 dispatch_task 工具调用，系统仅保留建议展示。'
  }

  if (!state.dispatchExecutable) {
    return '当前 dispatch_task 工具调用不可执行，系统已阻断本轮派发。'
  }

  if (input.alreadyExecuted) {
    return '当前 decision 已在本页会话内执行过一次，不允许重复执行。'
  }

  if (state.canAutoExecute) {
    return input.autoExecutionReason
  }

  if (input.mode === 'assist') {
    if (input.requiresApproval) {
      return '当前为 Assist 模式，且决策来源要求人工批准后再执行。'
    }

    if (state.hasFallback && input.fallbackReason) {
      return `当前决策来源已发生回退，需改为人工批准：${input.fallbackReason}`
    }

    if (!state.producerAllowsAuto) {
      return '当前决策来源不在 Auto 白名单内，当前按 Assist 处理并要求人工批准。'
    }

    if (!state.confidenceAllowsAuto) {
      return `当前置信度 ${formatConfidence(state.effectiveConfidence)} 低于 Auto 阈值 ${AUTO_CONFIDENCE_THRESHOLD.toFixed(2)}，需人工批准。`
    }

    if (!input.autoExecutionEligible) {
      return input.autoExecutionReason
    }

    return '当前按 Assist 模式处理，需人工批准后才执行。'
  }

  if (state.hasFallback && input.fallbackReason) {
    return `当前决策来源已发生回退，Auto 已自动降级为 Assist：${input.fallbackReason}`
  }

  if (!state.producerAllowsAuto) {
    return '当前决策来源不在 Auto 白名单内，系统已自动降级为 Assist。'
  }

  if (!state.confidenceAllowsAuto) {
    return `当前置信度 ${formatConfidence(state.effectiveConfidence)} 低于 Auto 阈值 ${AUTO_CONFIDENCE_THRESHOLD.toFixed(2)}，系统已自动降级为 Assist。`
  }

  if (input.requiresApproval) {
    return '当前决策明确要求人工批准，Auto 已自动降级为 Assist。'
  }

  return input.autoExecutionReason
}

function buildPrimaryActionLabel(
  input: AgentRiskPolicyInput,
  state: {
    hasDispatchTool: boolean
    dispatchExecutable: boolean
    canAutoExecute: boolean
  },
) {
  if (!state.hasDispatchTool || !state.dispatchExecutable) {
    return '当前无可执行派发'
  }

  if (input.alreadyExecuted) {
    return input.mode === 'auto' ? '当前已执行自动派发' : '当前已执行派发'
  }

  if (state.canAutoExecute) {
    return '执行 Agent 自动派发'
  }

  return '人工批准并执行'
}

function deriveRiskLevel(input: {
  canAutoExecute: boolean
  approvalRequired: boolean
  hasFallback: boolean
  producerAllowsAuto: boolean
  confidenceAllowsAuto: boolean
}): AgentRiskLevel {
  if (input.canAutoExecute) return 'low'

  if (input.approvalRequired) {
    if (input.hasFallback || !input.producerAllowsAuto || !input.confidenceAllowsAuto) {
      return 'high'
    }

    return 'medium'
  }

  return 'high'
}

function formatConfidence(value: number | null) {
  return value === null ? '未提供' : value.toFixed(2)
}

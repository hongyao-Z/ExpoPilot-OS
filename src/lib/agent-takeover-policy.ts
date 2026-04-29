import type { AgentContext } from './agent-context-builder'
import type { AgentLifecycleState } from './agent-decision-adapter'
import type { AgentRiskLevel } from './agent-risk-policy'

export interface AgentTakeoverPolicyInput {
  mode: AgentContext['mode']
  state: AgentLifecycleState
  effectiveMode: AgentContext['mode']
  canAutoExecute: boolean
  approvalRequired: boolean
  riskLevel: AgentRiskLevel
  fallbackReason?: string
  boundaryReason: string
  effectivePrimaryActionEnabled: boolean
  alreadyExecuted: boolean
}

export interface AgentTakeoverPolicyResult {
  takeoverAllowed: boolean
  takeoverReason: string
  postTakeoverMode: AgentContext['mode']
  controlsLocked: boolean
  humanOwnerRequired: boolean
  postActionStateLabel: string
}

export function evaluateAgentTakeoverPolicy(input: AgentTakeoverPolicyInput): AgentTakeoverPolicyResult {
  const postTakeoverMode: AgentContext['mode'] = 'assist'

  if (input.alreadyExecuted) {
    return {
      takeoverAllowed: false,
      takeoverReason: '当前 decision 已执行完成，不再允许人工接管。',
      postTakeoverMode,
      controlsLocked: true,
      humanOwnerRequired: false,
      postActionStateLabel: '当前建议已执行完成',
    }
  }

  if (input.state === 'observing') {
    return {
      takeoverAllowed: false,
      takeoverReason: '当前仍处于观察态，没有需要人工接管的执行建议。',
      postTakeoverMode,
      controlsLocked: true,
      humanOwnerRequired: false,
      postActionStateLabel: '当前保持观察',
    }
  }

  const takeoverAllowed =
    input.mode === 'auto' ||
    Boolean(input.fallbackReason) ||
    (input.effectiveMode === 'assist' && (input.approvalRequired || input.riskLevel === 'high'))

  const controlsLocked = input.alreadyExecuted || (!input.effectivePrimaryActionEnabled && !input.approvalRequired)

  if (!takeoverAllowed) {
    return {
      takeoverAllowed: false,
      takeoverReason: input.boundaryReason,
      postTakeoverMode,
      controlsLocked,
      humanOwnerRequired: input.approvalRequired,
      postActionStateLabel: input.approvalRequired ? '等待人工批准' : '当前无需人工接管',
    }
  }

  return {
    takeoverAllowed: true,
    takeoverReason: buildTakeoverReason(input),
    postTakeoverMode,
    controlsLocked,
    humanOwnerRequired: true,
    postActionStateLabel: input.approvalRequired ? '人工主导 / 等待人工批准' : '人工主导处理中',
  }
}

function buildTakeoverReason(input: AgentTakeoverPolicyInput) {
  if (input.fallbackReason) {
    return `当前已发生边界回退，建议人工接管：${input.fallbackReason}`
  }

  if (input.mode === 'auto' && input.canAutoExecute) {
    return '当前建议原本可由 Auto 执行，现允许人工主动接管并转为人工主导。'
  }

  if (input.approvalRequired) {
    return '当前建议已进入人工审批边界，可由人工接管并继续批准/执行。'
  }

  return input.boundaryReason
}

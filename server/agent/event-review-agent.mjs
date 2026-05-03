import { guardEventReviewOutput } from '../schemas/guards.mjs'

function resolveRiskLevel(input) {
  if (input?.riskLevel) return input.riskLevel
  if (input?.eventType === 'false_positive') return 'low'
  if (input?.eventType === 'high_risk_congestion') return 'high'
  if (input?.eventType === 'fire_lane_blocked') return 'high'
  return 'medium_high'
}

export function reviewEvent(input = {}) {
  const evidence = input.evidence?.length
    ? input.evidence
    : ['入口 A 人流密度持续上升', '排队长度超过预设阈值', '闸机设备状态正常']

  const output = {
    agent: 'EventReviewAgent',
    decision: input.title ? `${input.title}存在现场处置风险` : '入口 A 存在人流拥堵风险',
    riskLevel: resolveRiskLevel(input),
    evidence,
    uncertainty: '当前为 demo 数据，未接入真实摄像头',
    requiresManagerConfirmation: true,
  }

  return guardEventReviewOutput(output)
}

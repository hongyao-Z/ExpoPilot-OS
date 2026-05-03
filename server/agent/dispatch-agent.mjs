import { guardDispatchOutput } from '../schemas/guards.mjs'

function resolveAction(input) {
  if (input?.expectedAction) return input.expectedAction
  if (input?.eventType === 'equipment_failure') return '派发技术支持检查设备'
  if (input?.eventType === 'staff_missing') return '调度备用工作人员补位'
  if (input?.eventType === 'fire_lane_blocked') return '通知安保协同清理通道'
  if (input?.eventType === 'false_positive') return '保持观察，不创建任务'
  return '增派入口引导员进行分流'
}

function resolveFallback(input) {
  if (input?.expectedFallback) return input.expectedFallback
  if (input?.riskLevel === 'high' || input?.eventType === 'high_risk_congestion') {
    return '若 5 分钟内未缓解，建议增加安保协同'
  }
  return '若现场压力继续上升，项目经理可追加安保协同'
}

export function recommendDispatch(input = {}) {
  const output = {
    agent: 'DispatchAgent',
    recommendedAction: resolveAction(input),
    recommendedAssignee: input.recommendedAssignee ?? '入口引导员',
    backupAssignee: input.backupAssignee ?? '安保协同',
    reason: input.reason?.length
      ? input.reason
      : ['岗位与入口分流任务匹配', '当前负载较低', '距离入口 A 较近'],
    riskNote: input.riskNote ?? '需要持续观察备用通道压力',
    fallback: resolveFallback(input),
    requiresManagerConfirmation: true,
  }

  return guardDispatchOutput(output)
}

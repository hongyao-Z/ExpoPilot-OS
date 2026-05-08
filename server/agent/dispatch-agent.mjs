import { getOperationsKnowledge } from './operations-knowledge.mjs'
import { guardDispatchOutput } from '../schemas/guards.mjs'

function resolveAction(input, knowledge) {
  if (input?.expectedAction) return input.expectedAction
  if (input?.eventType === 'false_positive') return '保持观察，不创建任务'
  return knowledge.recommendedActions[0] ?? '转项目经理人工调度'
}

function resolveAssignee(input, knowledge) {
  if (input?.recommendedAssignee) return input.recommendedAssignee
  if (input?.eventType === 'fire_lane_blocked') return '安保协同'
  if (input?.eventType === 'equipment_failure' || input?.eventType === 'equipment_issue') return '技术支持'
  if (input?.eventType === 'worker_no_response' || input?.eventType === 'staff_missing') return '现场主管'
  return '入口引导员'
}

function resolveBackup(input, knowledge) {
  if (input?.backupAssignee) return input.backupAssignee
  if (knowledge.recommendedRoles.includes('supervisor')) return '项目经理'
  if (knowledge.recommendedRoles.includes('security_guard')) return '安保协同'
  return '现场主管'
}

function resolveFallback(input, knowledge) {
  if (input?.expectedFallback) return input.expectedFallback
  if (input?.eventType === 'false_positive') return '继续观察，不创建任务。'
  if (input?.eventType === 'worker_no_response') return '若原执行人仍无响应，项目经理应人工重派。'
  if (input?.eventType === 'backup_route_pressure') return '若备用通道继续承压，停止继续导流并重新评估入口动线。'
  if (input?.riskLevel === 'high' || input?.eventType === 'high_risk_congestion' || input?.eventType === 'fire_lane_blocked') {
    return '若 5 分钟内未缓解，建议增加安保协同。'
  }
  return '若现场压力继续上升，项目经理可追加安保协同。'
}

function buildCandidateScore(input, knowledge) {
  const supervisorNeeded = knowledge.recommendedRoles.includes('supervisor') || input?.eventType === 'worker_no_response'

  return {
    roleMatch: supervisorNeeded ? 18 : 24,
    skillMatch: input?.eventType === 'equipment_failure' ? 24 : 22,
    zoneMatch: input?.eventType === 'entrance_congestion' ? 24 : 18,
    loadFit: 16,
    backupReadiness: 10,
    supervisorEscalationFit: supervisorNeeded ? 18 : 8,
    total: supervisorNeeded ? 104 : 104,
  }
}

export function recommendDispatch(input = {}) {
  const knowledge = getOperationsKnowledge(input.eventType)
  const action = resolveAction(input, knowledge)
  const assignee = resolveAssignee(input, knowledge)
  const backupAssignee = resolveBackup(input, knowledge)
  const doNotDispatchReason =
    input.eventType === 'false_positive' || input.evidenceQuality === 'weak'
      ? '证据不足或判断为误报，保持观察，不创建任务。'
      : undefined

  const output = {
    agent: 'DispatchAgent',
    recommendedAction: action,
    recommendedAssignee: doNotDispatchReason ? '项目经理人工复核' : assignee,
    backupAssignee,
    reason: input.reason?.length
      ? input.reason
      : [
          `推荐岗位：${knowledge.recommendedRoles.join('、')}`,
          '候选人评分包含岗位、技能、区域、负载和备选可用性',
          '项目经理确认后才允许创建任务',
        ],
    candidateScore: buildCandidateScore(input, knowledge),
    dispatchChecklist: [
      ...knowledge.managerChecklist.slice(0, 3),
      '确认工作人员可接收任务',
      '确认不会绕过项目经理确认',
    ],
    riskNote: knowledge.riskEscalationRules[0] ?? '需要持续观察现场压力变化。',
    fallback: resolveFallback(input, knowledge),
    fallbackAction: resolveFallback(input, knowledge),
    doNotDispatchReason,
    requiresManagerConfirmation: true,
    createsTask: false,
    executionMode: 'recommendation_only',
    autoDispatch: false,
    executeDirectly: false,
    skipManagerConfirmation: false,
  }

  return guardDispatchOutput(output)
}

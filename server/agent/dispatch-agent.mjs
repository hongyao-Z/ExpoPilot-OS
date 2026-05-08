import { getOperationsKnowledge } from './operations-knowledge.mjs'
import { guardDispatchOutput } from '../schemas/guards.mjs'

const roleLabels = {
  entrance_guide: 'Entrance guide',
  security_guard: 'Security support',
  supervisor: 'Site supervisor',
  floor_coordinator: 'Floor coordinator',
  booth_reception: 'Booth reception',
  technical_support: 'Technical support',
  stage_operator: 'Stage operator',
  service_desk_agent: 'Service desk',
  registration_volunteer: 'Registration volunteer',
}

function roleLabel(role) {
  return roleLabels[role] ?? 'Manager manual review'
}

function resolveAction(input, knowledge) {
  if (input?.expectedAction) return input.expectedAction
  if (input?.eventType === 'false_positive') return 'observe only, do not create task'
  return knowledge.recommendedActions[0] ?? 'route to manager manual scheduling'
}

function resolveAssignee(input, knowledge) {
  if (input?.recommendedAssignee) return input.recommendedAssignee
  return roleLabel(knowledge.recommendedRoles[0])
}

function resolveBackup(input, knowledge) {
  if (input?.backupAssignee) return input.backupAssignee
  const primaryRole = knowledge.recommendedRoles[0]
  const backupRole = knowledge.recommendedRoles.find((role) => role !== primaryRole)
  return roleLabel(backupRole ?? 'supervisor')
}

function resolveFallback(input) {
  if (input?.expectedFallback) return input.expectedFallback
  if (input?.eventType === 'false_positive') return 'continue observation and do not create a task'
  if (input?.eventType === 'worker_no_response' || input?.eventType === 'task_timeout') {
    return 'if the original assignee still has no response, manager should reassign manually'
  }
  if (input?.eventType === 'backup_route_pressure') {
    return 'if backup route pressure continues, stop further diversion and reassess entrance routing'
  }
  if (
    input?.riskLevel === 'high' ||
    input?.eventType === 'high_risk_congestion' ||
    input?.eventType === 'fire_lane_blocked' ||
    input?.eventType === 'medical_incident' ||
    input?.eventType === 'lost_child'
  ) {
    return 'if unresolved within 5 minutes, escalate to security and manager review'
  }
  return 'if field pressure continues rising, manager may add security support'
}

function buildCandidateScore(input, knowledge) {
  const supervisorNeeded = knowledge.recommendedRoles.includes('supervisor')
  const technicalNeeded = knowledge.recommendedRoles.includes('technical_support')
  const securityNeeded = knowledge.recommendedRoles.includes('security_guard')

  const roleMatch = supervisorNeeded ? 20 : 24
  const skillMatch = technicalNeeded || securityNeeded ? 24 : 22
  const zoneMatch = input?.eventType === 'entrance_congestion' ? 24 : 18
  const loadFit = input?.eventType === 'staff_shortage' || input?.eventType === 'staff_missing' ? 12 : 16
  const backupReadiness = knowledge.recommendedRoles.length > 1 ? 12 : 6
  const supervisorEscalationFit = supervisorNeeded ? 18 : 8

  return {
    roleMatch,
    skillMatch,
    zoneMatch,
    loadFit,
    backupReadiness,
    supervisorEscalationFit,
    total: roleMatch + skillMatch + zoneMatch + loadFit + backupReadiness + supervisorEscalationFit,
  }
}

export function recommendDispatch(input = {}) {
  const knowledge = getOperationsKnowledge(input.eventType)
  const doNotDispatchReason =
    input.eventType === 'false_positive' || input.evidenceQuality === 'weak'
      ? 'evidence is weak or signal is a false positive; keep manager review and do not dispatch automatically'
      : undefined
  const action = resolveAction(input, knowledge)
  const assignee = resolveAssignee(input, knowledge)
  const backupAssignee = resolveBackup(input, knowledge)
  const fallback = resolveFallback(input, knowledge)

  const output = {
    agent: 'DispatchAgent',
    recommendedAction: action,
    recommendedAssignee: doNotDispatchReason ? 'Manager manual review' : assignee,
    backupAssignee,
    reason: input.reason?.length
      ? input.reason
      : [
          `recommended roles: ${knowledge.recommendedRoles.map(roleLabel).join(', ')}`,
          'candidate scoring includes role, skill, zone, load, backup readiness, and supervisor escalation fit',
          'manager confirmation is required before any task is created',
        ],
    candidateScore: buildCandidateScore(input, knowledge),
    dispatchChecklist: [
      ...knowledge.managerChecklist.slice(0, 3),
      'confirm staff can receive and acknowledge the task',
      'confirm the recommendation does not bypass manager confirmation',
    ],
    riskNote: knowledge.riskEscalationRules[0] ?? 'continue observing field pressure changes',
    fallback,
    fallbackAction: fallback,
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

import {
  getEventActionsForEvent,
  type EventActionDefinition,
  type EventActionKey,
} from './event-action-catalog'
import { getEventOperationsKnowledge } from './event-operations-knowledge'
import {
  getDispatchableStaffForActionKey,
  getDispatchableStaffForEventType,
  type StaffAvailabilityStatus,
  type StaffPoolMember,
  type StaffRole,
} from './staff-pool'
import { listDemoEventReviews, type EventReviewAgentDecision } from './event-review-agent'

export type ManagerConfirmationStatus =
  | 'pending_manager_confirmation'
  | 'confirmed_for_demo'
  | 'rejected_by_manager'
  | 'manual_review_required'

export type DispatchRecommendationReasonCode =
  | 'event_action_match'
  | 'skill_match'
  | 'zone_fit'
  | 'low_current_load'
  | 'backup_available'
  | 'manager_confirmation_required'

export interface DispatchRecommendationReason {
  reasonCode: DispatchRecommendationReasonCode
  label: string
  detail: string
}

export interface DispatchCandidateScore {
  roleMatch: number
  skillMatch: number
  zoneMatch: number
  loadFit: number
  backupReadiness: number
  supervisorEscalationFit: number
  total: number
}

export interface DispatchCandidate {
  staffId: string
  staffName: string
  role: StaffRole
  team: string
  availability: StaffAvailabilityStatus
  loadScore: number
  matchLabel: string
  candidateScore: DispatchCandidateScore
}

export interface DispatchAgentRecommendation {
  recommendationId: string
  reviewId: string
  alertId: string
  eventType: EventReviewAgentDecision['eventType']
  eventLabel: string
  zoneId: string
  zoneName: string
  recommendedActionKey: EventActionKey
  recommendedActionLabel: string
  recommendedActionDescription: string
  primaryAssignee: DispatchCandidate | null
  backupAssignees: readonly DispatchCandidate[]
  reasons: readonly DispatchRecommendationReason[]
  dispatchChecklist: readonly string[]
  fallbackAction: string
  doNotDispatchReason?: string
  managerConfirmationStatus: ManagerConfirmationStatus
  createsTask: false
  executionMode: 'recommendation_only'
}

function selectAction(review: EventReviewAgentDecision): EventActionDefinition {
  const actions = getEventActionsForEvent(review.eventType)
  const knowledge = getEventOperationsKnowledge(review.eventType)

  return (
    actions.find((action) =>
      knowledge.recommendedActions.some((recommendedAction) => action.label.includes(recommendedAction)),
    ) ??
    actions[0] ??
    getEventActionsForEvent('task_timeout')[0]
  )
}

function buildCandidateScore(staff: StaffPoolMember, review: EventReviewAgentDecision, action: EventActionDefinition) {
  const knowledge = getEventOperationsKnowledge(review.eventType)
  const roleMatch = knowledge.recommendedRoles.includes(staff.role) ? 25 : 8
  const skillMatch = staff.supportedEventTypes.includes(review.eventType) ? 25 : 10
  const zoneMatch = staff.preferredZoneTypes.includes(action.suitableZoneTypes[0]) ? 20 : 8
  const loadFit = Math.max(0, 20 - Math.round(staff.loadScore / 5))
  const backupReadiness = staff.availability === 'standby' ? 10 : 6
  const supervisorEscalationFit = staff.role === 'supervisor' ? 10 : 4

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

function toCandidate(staff: StaffPoolMember, review: EventReviewAgentDecision, action: EventActionDefinition): DispatchCandidate {
  const score = buildCandidateScore(staff, review, action)
  const roleMatched = score.roleMatch >= 20
  const zoneMatched = score.zoneMatch >= 20

  return {
    staffId: staff.staffId,
    staffName: staff.displayName,
    role: staff.role,
    team: staff.team,
    availability: staff.availability,
    loadScore: staff.loadScore,
    matchLabel: roleMatched && zoneMatched ? '岗位、区域和负载匹配' : '具备处理能力，需项目经理复核',
    candidateScore: score,
  }
}

function resolveCandidates(review: EventReviewAgentDecision, action: EventActionDefinition) {
  const actionCandidates = getDispatchableStaffForActionKey(action.actionKey)
  const eventCandidates = getDispatchableStaffForEventType(review.eventType)
  const merged = [...actionCandidates, ...eventCandidates].filter(
    (staff, index, list) => list.findIndex((candidate) => candidate.staffId === staff.staffId) === index,
  )

  return merged
    .map((staff) => toCandidate(staff, review, action))
    .sort((left, right) => right.candidateScore.total - left.candidateScore.total)
}

function buildReasons(
  review: EventReviewAgentDecision,
  action: EventActionDefinition,
  primaryAssignee: DispatchCandidate | null,
  backupAssignees: readonly DispatchCandidate[],
): DispatchRecommendationReason[] {
  if (!primaryAssignee) {
    return [
      {
        reasonCode: 'manager_confirmation_required',
        label: '转人工调度',
        detail: '当前没有满足岗位、技能和负载条件的候选人，DispatchAgent 不会硬派任务。',
      },
    ]
  }

  return [
    {
      reasonCode: 'event_action_match',
      label: '动作匹配',
      detail: `${review.eventLabel} 推荐先执行 ${action.label}，但仍需项目经理确认。`,
    },
    {
      reasonCode: 'skill_match',
      label: '岗位匹配',
      detail: `${primaryAssignee.staffName} 与当前事件类型和推荐动作匹配。`,
    },
    {
      reasonCode: 'zone_fit',
      label: '区域匹配',
      detail: `${primaryAssignee.staffName} 的候选评分为 ${primaryAssignee.candidateScore.total}，区域匹配分 ${primaryAssignee.candidateScore.zoneMatch}。`,
    },
    {
      reasonCode: 'low_current_load',
      label: '负载检查',
      detail: `${primaryAssignee.staffName} 当前负载为 ${primaryAssignee.loadScore}，可承接现场处理任务。`,
    },
    {
      reasonCode: 'backup_available',
      label: '备选可用',
      detail:
        backupAssignees.length > 0
          ? `当前有 ${backupAssignees.length} 名备选执行人，项目经理可改派。`
          : '当前没有备选执行人，建议主管同步关注。',
    },
    {
      reasonCode: 'manager_confirmation_required',
      label: '必须确认',
      detail: 'DispatchAgent 只生成建议，不创建任务，不改变任务状态。',
    },
  ]
}

function buildFallbackAction(review: EventReviewAgentDecision, backupAssignees: readonly DispatchCandidate[]) {
  const knowledge = getEventOperationsKnowledge(review.eventType)

  if (backupAssignees.length > 0) {
    return `如主执行人无法响应，项目经理可改派 ${backupAssignees[0].staffName}。`
  }

  return knowledge.recommendedRoles.includes('supervisor')
    ? '当前场景建议直接转项目经理人工调度。'
    : '如 3 分钟内未接收，升级主管并重新选择执行人。'
}

export function recommendDispatchForReview(review: EventReviewAgentDecision): DispatchAgentRecommendation {
  const action = selectAction(review)
  const candidates = resolveCandidates(review, action)
  const [primaryAssignee = null, ...backupAssignees] = candidates
  const knowledge = getEventOperationsKnowledge(review.eventType)
  const shouldNotDispatch = (review.eventType as string) === 'false_positive' || review.evidenceQuality === 'weak'

  return {
    recommendationId: `dispatch-${review.reviewId}`,
    reviewId: review.reviewId,
    alertId: review.alertId,
    eventType: review.eventType,
    eventLabel: review.eventLabel,
    zoneId: review.zoneId,
    zoneName: review.zoneName,
    recommendedActionKey: action.actionKey,
    recommendedActionLabel: knowledge.recommendedActions[0] ?? action.label,
    recommendedActionDescription: action.description,
    primaryAssignee: shouldNotDispatch ? null : primaryAssignee,
    backupAssignees: shouldNotDispatch ? [] : backupAssignees,
    reasons: buildReasons(review, action, shouldNotDispatch ? null : primaryAssignee, backupAssignees),
    dispatchChecklist: [
      ...knowledge.managerChecklist.slice(0, 3),
      '项目经理确认后才允许创建任务',
      '确认工作人员可接收任务并反馈状态',
    ],
    fallbackAction: shouldNotDispatch ? '保持观察，不创建任务。' : buildFallbackAction(review, backupAssignees),
    doNotDispatchReason: shouldNotDispatch ? '证据不足或判断为误报，需人工复核，不自动派发。' : undefined,
    managerConfirmationStatus: 'pending_manager_confirmation',
    createsTask: false,
    executionMode: 'recommendation_only',
  }
}

export function listDemoDispatchRecommendations() {
  return listDemoEventReviews().map(recommendDispatchForReview)
}

export function getDispatchRecommendationByReviewId(reviewId: string) {
  return listDemoDispatchRecommendations().find((recommendation) => recommendation.reviewId === reviewId) ?? null
}

export function getPrimaryAssignee(recommendation: DispatchAgentRecommendation) {
  return recommendation.primaryAssignee
}

export function getBackupAssignees(recommendation: DispatchAgentRecommendation) {
  return [...recommendation.backupAssignees]
}

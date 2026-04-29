import {
  getEventActionsForEvent,
  type EventActionDefinition,
  type EventActionKey,
} from './event-action-catalog'
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

export interface DispatchCandidate {
  staffId: string
  staffName: string
  role: StaffRole
  team: string
  availability: StaffAvailabilityStatus
  loadScore: number
  matchLabel: string
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
  primaryAssignee: DispatchCandidate
  backupAssignees: readonly DispatchCandidate[]
  reasons: readonly DispatchRecommendationReason[]
  managerConfirmationStatus: ManagerConfirmationStatus
  createsTask: false
  executionMode: 'recommendation_only'
}

function selectAction(review: EventReviewAgentDecision): EventActionDefinition {
  const actions = getEventActionsForEvent(review.eventType)

  return actions[0]
}

function toCandidate(staff: StaffPoolMember, review: EventReviewAgentDecision, action: EventActionDefinition): DispatchCandidate {
  const zoneFit = staff.preferredZoneTypes.includes(action.suitableZoneTypes[0])
  const eventFit = staff.supportedEventTypes.includes(review.eventType)

  return {
    staffId: staff.staffId,
    staffName: staff.displayName,
    role: staff.role,
    team: staff.team,
    availability: staff.availability,
    loadScore: staff.loadScore,
    matchLabel: zoneFit && eventFit ? '技能、事件和区域匹配' : '技能与事件匹配',
  }
}

function resolveCandidates(review: EventReviewAgentDecision, action: EventActionDefinition) {
  const actionCandidates = getDispatchableStaffForActionKey(action.actionKey)
  const eventCandidates = getDispatchableStaffForEventType(review.eventType)
  const merged = [...actionCandidates, ...eventCandidates].filter(
    (staff, index, list) => list.findIndex((candidate) => candidate.staffId === staff.staffId) === index,
  )

  return merged.map((staff) => toCandidate(staff, review, action))
}

function buildReasons(
  review: EventReviewAgentDecision,
  action: EventActionDefinition,
  primaryAssignee: DispatchCandidate,
  backupAssignees: readonly DispatchCandidate[],
): DispatchRecommendationReason[] {
  return [
    {
      reasonCode: 'event_action_match',
      label: '事件动作匹配',
      detail: `${review.eventLabel}推荐动作是${action.label}。`,
    },
    {
      reasonCode: 'skill_match',
      label: '技能匹配',
      detail: `${primaryAssignee.staffName}符合所需动作技能和事件类型。`,
    },
    {
      reasonCode: 'low_current_load',
      label: '负载检查',
      detail: `${primaryAssignee.staffName}当前负载分数为 ${primaryAssignee.loadScore}。`,
    },
    {
      reasonCode: 'backup_available',
      label: '存在备选',
      detail:
        backupAssignees.length > 0
          ? `当前有 ${backupAssignees.length} 个备选执行人可用。`
          : '当前演示人员池没有备选执行人。',
    },
    {
      reasonCode: 'manager_confirmation_required',
      label: '需要经理确认',
      detail: 'DispatchAgent 只提供建议，创建任务前必须由项目经理确认。',
    },
  ]
}

export function recommendDispatchForReview(review: EventReviewAgentDecision): DispatchAgentRecommendation {
  const action = selectAction(review)
  const candidates = resolveCandidates(review, action)
  const [primaryAssignee, ...backupAssignees] = candidates

  if (!primaryAssignee) {
    throw new Error(`No dispatch candidate found for review ${review.reviewId}`)
  }

  return {
    recommendationId: `dispatch-${review.reviewId}`,
    reviewId: review.reviewId,
    alertId: review.alertId,
    eventType: review.eventType,
    eventLabel: review.eventLabel,
    zoneId: review.zoneId,
    zoneName: review.zoneName,
    recommendedActionKey: action.actionKey,
    recommendedActionLabel: action.label,
    recommendedActionDescription: action.description,
    primaryAssignee,
    backupAssignees,
    reasons: buildReasons(review, action, primaryAssignee, backupAssignees),
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

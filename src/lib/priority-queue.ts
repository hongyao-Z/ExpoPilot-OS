import type { EventOperationalItem, EventOperationalState, EventSeverity, FeedbackType } from '../domain/types'
import { buildTaskLifecycle, type TaskLifecycleViewModel } from './task-lifecycle'
import type { VenueEventType } from './venue-event-types'
import { getVenueEventDefinition, isVenueEventType } from './venue-event-types'

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'
export type PriorityQueueLevel = PriorityLevel
export type PriorityReason =
  | 'safety_risk'
  | 'crowd_impact'
  | 'timeout_risk'
  | 'vip_attention'
  | 'resource_blocked'
  | 'fallback_required'
  | 'manual_escalation'
  | 'normal_operation'

export type PriorityQueueStatus = 'waiting' | 'ready' | 'assigned' | 'in_progress' | 'blocked' | 'completed'

export interface PriorityQueueOptions {
  now?: Date
  maxItems?: number
}

export interface PriorityQueueItem {
  queueItemId: string
  taskId: string
  eventType: VenueEventType | string
  eventLabel: string
  zoneName: string
  actionLabel: string
  assigneeLabel: string
  priority: PriorityLevel
  priorityScore: number
  reasons: PriorityReason[]
  slaMinutes: number
  elapsedMinutes: number
  status: PriorityQueueStatus | EventOperationalState
  rank: number
  eventId: string
  title: string
  eventTypeLabel: string
  assigneeName?: string
  score: number
  level: PriorityLevel
  reasonLabels: string[]
  operationalState: EventOperationalState
  lifecycle?: TaskLifecycleViewModel
  latestFeedbackType?: FeedbackType
  latestFeedbackAt?: string
  ageMinutes: number
}

export interface PriorityQueueSummary {
  total: number
  open: number
  blocked: number
  closed: number
  topItem?: PriorityQueueItem
  items: PriorityQueueItem[]
}

export interface DemoPriorityQueueSummary {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  blocked: number
  overdue: number
  topItem?: PriorityQueueItem
}

const priorityOrder: Record<PriorityLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const priorityLabels: Record<PriorityLevel, string> = {
  critical: '告红',
  high: '高',
  medium: '中',
  low: '低',
}

const priorityReasonLabels: Record<PriorityReason, string> = {
  safety_risk: '安全风险',
  crowd_impact: '人流影响',
  timeout_risk: '超时风险',
  vip_attention: 'VIP 关注',
  resource_blocked: '资源阻塞',
  fallback_required: '需要 fallback',
  manual_escalation: '人工升级',
  normal_operation: '常规运营',
}

export const DEMO_PRIORITY_QUEUE_ITEMS: readonly PriorityQueueItem[] = [
  {
    queueItemId: 'queue-equipment-stage-critical',
    taskId: 'demo-task-equipment-inspection',
    eventType: 'equipment_issue',
    eventLabel: '设备异常',
    zoneName: '舞台区',
    actionLabel: '派发技术支持',
    assigneeLabel: '技术支持 A',
    priority: 'critical',
    priorityScore: 96,
    reasons: ['safety_risk', 'resource_blocked', 'fallback_required'],
    slaMinutes: 5,
    elapsedMinutes: 8,
    status: 'blocked',
    rank: 0,
    eventId: 'demo-event-equipment-stage',
    title: '设备异常检查任务',
    eventTypeLabel: '设备异常',
    assigneeName: '技术支持 A',
    score: 96,
    level: 'critical',
    reasonLabels: ['安全风险', '资源阻塞', '需要 fallback'],
    operationalState: 'need_support',
    ageMinutes: 8,
  },
  {
    queueItemId: 'queue-entrance-congestion-high',
    taskId: 'demo-task-entrance-fill-position',
    eventType: 'entrance_congestion',
    eventLabel: '入口拥堵',
    zoneName: '入口 A',
    actionLabel: '入口补位',
    assigneeLabel: '入口引导员 A',
    priority: 'high',
    priorityScore: 88,
    reasons: ['crowd_impact', 'safety_risk'],
    slaMinutes: 6,
    elapsedMinutes: 5,
    status: 'in_progress',
    rank: 0,
    eventId: 'demo-event-entrance-congestion',
    title: '入口拥堵补位任务',
    eventTypeLabel: '入口拥堵',
    assigneeName: '入口引导员 A',
    score: 88,
    level: 'high',
    reasonLabels: ['人流影响', '安全风险'],
    operationalState: 'assigned',
    ageMinutes: 5,
  },
  {
    queueItemId: 'queue-task-timeout-main-hall',
    taskId: 'demo-task-main-hall-timeout',
    eventType: 'task_timeout',
    eventLabel: '任务超时',
    zoneName: '主展厅',
    actionLabel: '升级超时任务',
    assigneeLabel: '场馆主管 A',
    priority: 'high',
    priorityScore: 82,
    reasons: ['timeout_risk', 'manual_escalation'],
    slaMinutes: 10,
    elapsedMinutes: 18,
    status: 'waiting',
    rank: 0,
    eventId: 'demo-event-task-timeout',
    title: '任务超时升级任务',
    eventTypeLabel: '任务超时',
    assigneeName: '场馆主管 A',
    score: 82,
    level: 'high',
    reasonLabels: ['超时风险', '人工升级'],
    operationalState: 'need_support',
    ageMinutes: 18,
  },
  {
    queueItemId: 'queue-staff-shortage-registration',
    taskId: 'demo-task-registration-backup',
    eventType: 'staff_shortage',
    eventLabel: '人员不足',
    zoneName: '签到区',
    actionLabel: '请求后备人员',
    assigneeLabel: '场馆主管 A',
    priority: 'medium',
    priorityScore: 66,
    reasons: ['resource_blocked', 'crowd_impact'],
    slaMinutes: 12,
    elapsedMinutes: 9,
    status: 'ready',
    rank: 0,
    eventId: 'demo-event-staff-shortage',
    title: '签到区人员补充任务',
    eventTypeLabel: '人员不足',
    assigneeName: '场馆主管 A',
    score: 66,
    level: 'medium',
    reasonLabels: ['资源阻塞', '人流影响'],
    operationalState: 'ready_dispatch',
    ageMinutes: 9,
  },
  {
    queueItemId: 'queue-booth-heatup-512',
    taskId: 'demo-task-booth-reception-support',
    eventType: 'booth_heatup',
    eventLabel: '展台热度升高',
    zoneName: '展台 512',
    actionLabel: '增加展台接待支援',
    assigneeLabel: '展台 512 接待 A',
    priority: 'medium',
    priorityScore: 58,
    reasons: ['vip_attention', 'normal_operation'],
    slaMinutes: 15,
    elapsedMinutes: 6,
    status: 'completed',
    rank: 0,
    eventId: 'demo-event-booth-heatup',
    title: '展台热度接待任务',
    eventTypeLabel: '展台热度升高',
    assigneeName: '展台 512 接待 A',
    score: 58,
    level: 'medium',
    reasonLabels: ['VIP 关注', '常规运营'],
    operationalState: 'closed',
    ageMinutes: 6,
  },
] as const

const severityScore: Record<EventSeverity, number> = {
  medium: 40,
  high: 65,
  critical: 85,
}

const operationalStateScore: Record<EventOperationalState, number> = {
  pending_confirmation: 10,
  ready_dispatch: 18,
  assigned: 8,
  need_support: 30,
  closed: -70,
}

const feedbackScore: Partial<Record<FeedbackType, number>> = {
  received: -4,
  processing: -8,
  completed: -70,
  exception: 28,
  comment: 0,
}

export function listPriorityQueueItems() {
  return sortPriorityQueue(DEMO_PRIORITY_QUEUE_ITEMS)
}

export function getTopPriorityItems(limit: number) {
  return listPriorityQueueItems().slice(0, Math.max(0, limit))
}

export function getPriorityLabel(priority: PriorityLevel) {
  return priorityLabels[priority]
}

export function getPriorityReasonLabel(reason: PriorityReason) {
  return priorityReasonLabels[reason]
}

export function sortPriorityQueue(items: readonly PriorityQueueItem[]) {
  return [...items]
    .sort((left, right) => {
      const priorityDiff = priorityOrder[right.priority] - priorityOrder[left.priority]
      if (priorityDiff !== 0) return priorityDiff
      if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore
      if (right.elapsedMinutes !== left.elapsedMinutes) return right.elapsedMinutes - left.elapsedMinutes
      return left.queueItemId.localeCompare(right.queueItemId)
    })
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

export function getPriorityQueueSummary(): DemoPriorityQueueSummary {
  const items = listPriorityQueueItems()

  return {
    total: items.length,
    critical: items.filter((item) => item.priority === 'critical').length,
    high: items.filter((item) => item.priority === 'high').length,
    medium: items.filter((item) => item.priority === 'medium').length,
    low: items.filter((item) => item.priority === 'low').length,
    blocked: items.filter((item) => item.status === 'blocked' || item.reasons.includes('resource_blocked')).length,
    overdue: items.filter((item) => item.elapsedMinutes > item.slaMinutes).length,
    topItem: items[0],
  }
}

export function buildPriorityQueue(events: readonly EventOperationalItem[], options: PriorityQueueOptions = {}) {
  const now = options.now ?? new Date()
  const rankedItems = events
    .map((item) => buildPriorityQueueItem(item, now))
    .filter((item) => item.score > 0)
    .sort(byPriority)
    .map((item, index) => ({ ...item, rank: index + 1 }))

  return typeof options.maxItems === 'number' ? rankedItems.slice(0, options.maxItems) : rankedItems
}

export function buildPriorityQueueSummary(events: readonly EventOperationalItem[], options: PriorityQueueOptions = {}) {
  const items = buildPriorityQueue(events, options)

  return {
    total: events.length,
    open: events.filter((item) => item.operational_state !== 'closed').length,
    blocked: events.filter((item) => item.operational_state === 'need_support' || item.task?.status === 'exception').length,
    closed: events.filter((item) => item.operational_state === 'closed').length,
    topItem: items[0],
    items,
  } satisfies PriorityQueueSummary
}

export function buildPriorityQueueItem(item: EventOperationalItem, now: Date = new Date()): PriorityQueueItem {
  const lifecycle = item.task ? buildTaskLifecycle(item.task, item.latest_feedback ? [item.latest_feedback] : [], now) : undefined
  const ageMinutes = diffMinutes(item.event.timestamp, now)
  const reasons: string[] = []
  const score =
    getSeverityScore(item.event.severity, reasons) +
    getOperationalStateScore(item.operational_state, reasons) +
    getLifecycleScore(lifecycle, Boolean(item.task), reasons) +
    getFeedbackScore(item.latest_feedback?.type, reasons) +
    getAgeScore(ageMinutes, reasons) +
    getEventPriorityScore(item.event.priority_score, reasons)
  const priority = getPriorityLevel(score)
  const priorityReasons = inferPriorityReasons(item, lifecycle, ageMinutes)

  return {
    queueItemId: `queue-${item.event.event_id}`,
    taskId: item.task?.task_id ?? '',
    eventType: item.event.event_type,
    eventLabel: getEventTypeLabel(item.event.event_type),
    zoneName: item.zone_name,
    actionLabel: item.event.recommended_action,
    assigneeLabel: item.assignee_name ?? item.event.recommended_assignee_id ?? '未分配',
    priority,
    priorityScore: clampScore(score),
    reasons: priorityReasons,
    slaMinutes: getSlaMinutes(priority),
    elapsedMinutes: ageMinutes,
    status: item.operational_state,
    rank: 0,
    eventId: item.event.event_id,
    title: item.event.title,
    eventTypeLabel: getEventTypeLabel(item.event.event_type),
    assigneeName: item.assignee_name,
    score: clampScore(score),
    level: priority,
    reasonLabels: reasons,
    operationalState: item.operational_state,
    lifecycle,
    latestFeedbackType: item.latest_feedback?.type,
    latestFeedbackAt: item.latest_feedback_at ?? item.latest_feedback?.timestamp,
    ageMinutes,
  }
}

export function getPriorityLevel(score: number): PriorityQueueLevel {
  if (score >= 90) return 'critical'
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function inferPriorityReasons(item: EventOperationalItem, lifecycle: TaskLifecycleViewModel | undefined, elapsedMinutes: number): PriorityReason[] {
  const reasons = new Set<PriorityReason>()
  const eventType = item.event.event_type as string

  if (item.event.severity === 'critical' || eventType === 'equipment_issue' || eventType === 'crowd_spillover') {
    reasons.add('safety_risk')
  }

  if (eventType === 'entrance_congestion' || eventType === 'booth_heatup' || eventType === 'staff_shortage') {
    reasons.add('crowd_impact')
  }

  if (eventType === 'task_timeout' || elapsedMinutes >= 15) {
    reasons.add('timeout_risk')
  }

  if (eventType === 'booth_heatup') {
    reasons.add('vip_attention')
  }

  if (item.operational_state === 'need_support' || lifecycle?.currentStatus === 'exception') {
    reasons.add('resource_blocked')
    reasons.add('manual_escalation')
  }

  if (eventType === 'equipment_issue') {
    reasons.add('fallback_required')
  }

  if (reasons.size === 0) {
    reasons.add('normal_operation')
  }

  return [...reasons]
}

function getSlaMinutes(priority: PriorityLevel) {
  if (priority === 'critical') return 5
  if (priority === 'high') return 8
  if (priority === 'medium') return 15
  return 30
}

function byPriority(left: PriorityQueueItem, right: PriorityQueueItem) {
  if (right.score !== left.score) return right.score - left.score
  if (right.ageMinutes !== left.ageMinutes) return right.ageMinutes - left.ageMinutes
  return left.eventId.localeCompare(right.eventId)
}

function getSeverityScore(severity: EventSeverity, reasons: string[]) {
  const score = severityScore[severity]
  if (severity === 'critical') reasons.push('关键事件等级')
  if (severity === 'high') reasons.push('高优先级事件等级')
  return score
}

function getOperationalStateScore(state: EventOperationalState, reasons: string[]) {
  if (state === 'need_support') reasons.push('需要支援')
  if (state === 'ready_dispatch') reasons.push('待派发')
  if (state === 'pending_confirmation') reasons.push('待确认')
  if (state === 'closed') reasons.push('已关闭事件')
  return operationalStateScore[state]
}

function getLifecycleScore(lifecycle: TaskLifecycleViewModel | undefined, hasTask: boolean, reasons: string[]) {
  if (!hasTask) {
    reasons.push('未派发任务')
    return 16
  }

  if (!lifecycle) return 0
  if (lifecycle.currentStatus === 'exception') {
    reasons.push('任务异常')
    return 30
  }
  if (lifecycle.currentStatus === 'created') {
    reasons.push('任务待接收')
    return 18
  }
  if (lifecycle.currentStatus === 'received') {
    reasons.push('任务已接收但未处理')
    return 10
  }
  if (lifecycle.currentStatus === 'processing') return 4
  return -70
}

function getFeedbackScore(type: FeedbackType | undefined, reasons: string[]) {
  if (!type) return 0
  if (type === 'exception') reasons.push('异常反馈')
  if (type === 'completed') reasons.push('完成反馈')
  return feedbackScore[type] ?? 0
}

function getAgeScore(ageMinutes: number, reasons: string[]) {
  if (ageMinutes >= 20) reasons.push('超过 20 分钟')
  if (ageMinutes >= 10) reasons.push('超过 10 分钟')
  return Math.min(18, Math.floor(ageMinutes / 3))
}

function getEventPriorityScore(priorityScore: number, reasons: string[]) {
  if (priorityScore >= 80) reasons.push('事件优先分偏高')
  return Math.min(18, Math.max(0, Math.round(priorityScore / 6)))
}

function getEventTypeLabel(eventType: string) {
  return isVenueEventType(eventType) ? getVenueEventDefinition(eventType).label : eventType
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function diffMinutes(start: string, end: Date) {
  const startTime = new Date(start).getTime()
  const endTime = end.getTime()

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0
  return Math.max(0, Math.round((endTime - startTime) / 1000 / 60))
}

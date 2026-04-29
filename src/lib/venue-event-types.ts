import type { VenueZoneType } from './venue-zones'

export type VenueEventType =
  | 'entrance_congestion'
  | 'booth_heatup'
  | 'queue_growth'
  | 'crowd_spillover'
  | 'equipment_issue'
  | 'staff_shortage'
  | 'task_timeout'
  | 'visitor_guidance_needed'

export type VenueEventSeverity = 'low' | 'medium' | 'high'

export interface VenueEventDefinition {
  eventType: VenueEventType
  label: string
  description: string
  defaultSeverity: VenueEventSeverity
  suitableZoneTypes: readonly VenueZoneType[]
  recommendedActionKeys: readonly string[]
  triggerPointLabels: readonly string[]
}

export const EVENT_DEFINITIONS = {
  entrance_congestion: {
    eventType: 'entrance_congestion',
    label: '入口拥堵',
    description: '入口或签到前置区域出现入场速度下降、排队密度升高或通行口承压。',
    defaultSeverity: 'high',
    suitableZoneTypes: ['entrance', 'registration'],
    recommendedActionKeys: ['fill_position', 'open_extra_entry_lane', 'redirect_to_secondary_entry'],
    triggerPointLabels: ['入口排队长度', '闸口通行速度', '入口滞留人数'],
  },
  booth_heatup: {
    eventType: 'booth_heatup',
    label: '展台升温',
    description: '展台周边关注度、停留人数或互动需求明显上升，需要增加接待能力。',
    defaultSeverity: 'medium',
    suitableZoneTypes: ['booth', 'main_hall'],
    recommendedActionKeys: ['booth_reception_support', 'prepare_demo_queue', 'notify_booth_owner'],
    triggerPointLabels: ['展台停留人数', '互动排队人数', '展台热度趋势'],
  },
  queue_growth: {
    eventType: 'queue_growth',
    label: '队列增长',
    description: '服务、签到、互动或咨询队列持续增长，等待时间可能超过现场承诺。',
    defaultSeverity: 'medium',
    suitableZoneTypes: ['registration', 'booth', 'service_desk', 'stage'],
    recommendedActionKeys: ['add_queue_staff', 'split_waiting_line', 'update_waiting_time_board'],
    triggerPointLabels: ['队列长度', '等待时间', '队列增长速度'],
  },
  crowd_spillover: {
    eventType: 'crowd_spillover',
    label: '人流外溢',
    description: '局部区域人流超出承载边界，开始占用主通道、应急通道或相邻区域。',
    defaultSeverity: 'high',
    suitableZoneTypes: ['main_hall', 'stage', 'booth', 'emergency_passage'],
    recommendedActionKeys: ['deploy_crowd_control', 'open_buffer_area', 'protect_emergency_passage'],
    triggerPointLabels: ['区域占用率', '通道侵占', '相邻区域压力'],
  },
  equipment_issue: {
    eventType: 'equipment_issue',
    label: '设备异常',
    description: '展台、舞台、签到或服务设备出现故障，影响现场服务或活动执行。',
    defaultSeverity: 'high',
    suitableZoneTypes: ['registration', 'booth', 'service_desk', 'stage'],
    recommendedActionKeys: ['dispatch_technical_support', 'switch_backup_equipment', 'pause_related_session'],
    triggerPointLabels: ['设备告警', '人工报障', '服务中断时长'],
  },
  staff_shortage: {
    eventType: 'staff_shortage',
    label: '人员不足',
    description: '当前区域任务量超过在岗人员处理能力，需要临时补充或跨区调度。',
    defaultSeverity: 'medium',
    suitableZoneTypes: ['entrance', 'registration', 'main_hall', 'booth', 'service_desk', 'stage'],
    recommendedActionKeys: ['request_backup_staff', 'reassign_staff', 'reduce_noncritical_tasks'],
    triggerPointLabels: ['在岗人数', '待处理任务数', '响应超时数'],
  },
  task_timeout: {
    eventType: 'task_timeout',
    label: '任务超时',
    description: '已下发任务未在预期时间内进入处理或完成状态，需要升级提醒或重新分配。',
    defaultSeverity: 'medium',
    suitableZoneTypes: ['entrance', 'registration', 'main_hall', 'booth', 'service_desk', 'stage', 'emergency_passage'],
    recommendedActionKeys: ['escalate_timeout_task', 'notify_supervisor', 'reassign_task_owner'],
    triggerPointLabels: ['任务创建时间', '最近状态更新时间', '超时等级'],
  },
  visitor_guidance_needed: {
    eventType: 'visitor_guidance_needed',
    label: '访客引导需求',
    description: '访客在入口、主通道、服务台或展台周边出现路线咨询和方向判断需求。',
    defaultSeverity: 'low',
    suitableZoneTypes: ['entrance', 'main_hall', 'booth', 'service_desk'],
    recommendedActionKeys: ['deploy_guidance_volunteers', 'update_wayfinding_signage', 'broadcast_route_hint'],
    triggerPointLabels: ['咨询次数', '路线停顿点', '重复问询位置'],
  },
} as const satisfies Record<VenueEventType, VenueEventDefinition>

const venueEventTypeSet = new Set<VenueEventType>(Object.keys(EVENT_DEFINITIONS) as VenueEventType[])

export function getVenueEventDefinition(eventType: VenueEventType) {
  return EVENT_DEFINITIONS[eventType]
}

export function getVenueEventLabel(eventType: VenueEventType) {
  return getVenueEventDefinition(eventType).label
}

export function getVenueEventSeverity(eventType: VenueEventType) {
  return getVenueEventDefinition(eventType).defaultSeverity
}

export function getRecommendedActionKeysForEvent(eventType: VenueEventType) {
  return getVenueEventDefinition(eventType).recommendedActionKeys
}

export function isVenueEventType(value: unknown): value is VenueEventType {
  return typeof value === 'string' && venueEventTypeSet.has(value as VenueEventType)
}

import type { VenueEventType } from './venue-event-types'
import type { VenueZoneType } from './venue-zones'

export type EventActionKey =
  | 'fill_position'
  | 'open_extra_entry_lane'
  | 'redirect_to_secondary_entry'
  | 'booth_reception_support'
  | 'prepare_demo_queue'
  | 'notify_booth_owner'
  | 'add_queue_staff'
  | 'split_waiting_line'
  | 'update_waiting_time_board'
  | 'deploy_crowd_control'
  | 'open_buffer_area'
  | 'protect_emergency_passage'
  | 'dispatch_technical_support'
  | 'switch_backup_equipment'
  | 'pause_related_session'
  | 'request_backup_staff'
  | 'reassign_staff'
  | 'reduce_noncritical_tasks'
  | 'escalate_timeout_task'
  | 'notify_supervisor'
  | 'reassign_task_owner'
  | 'deploy_guidance_volunteers'
  | 'update_wayfinding_signage'
  | 'broadcast_route_hint'

export type EventActionCategory =
  | 'staffing'
  | 'flow_control'
  | 'communication'
  | 'technical'
  | 'escalation'

export type EventActionPriority = 'low' | 'medium' | 'high'

export interface EventActionDefinition {
  actionKey: EventActionKey
  label: string
  description: string
  category: EventActionCategory
  defaultPriority: EventActionPriority
  suitableZoneTypes: readonly VenueZoneType[]
  recommendedEventTypes: readonly VenueEventType[]
}

export const EVENT_ACTION_CATALOG = {
  fill_position: {
    actionKey: 'fill_position',
    label: '入口补位',
    description: '将待命人员调往承压入口点位。',
    category: 'staffing',
    defaultPriority: 'high',
    suitableZoneTypes: ['entrance', 'registration'],
    recommendedEventTypes: ['entrance_congestion'],
  },
  open_extra_entry_lane: {
    actionKey: 'open_extra_entry_lane',
    label: '开启额外入场通道',
    description: '启用额外入场通道，并引导观众前往。',
    category: 'flow_control',
    defaultPriority: 'high',
    suitableZoneTypes: ['entrance', 'registration'],
    recommendedEventTypes: ['entrance_congestion'],
  },
  redirect_to_secondary_entry: {
    actionKey: 'redirect_to_secondary_entry',
    label: '引导至次入口',
    description: '将观众从过载入口引导到负载更低的入场路径。',
    category: 'flow_control',
    defaultPriority: 'medium',
    suitableZoneTypes: ['entrance', 'registration'],
    recommendedEventTypes: ['entrance_congestion'],
  },
  booth_reception_support: {
    actionKey: 'booth_reception_support',
    label: '增加展台接待支援',
    description: '为热度上升的展台增派接待人员。',
    category: 'staffing',
    defaultPriority: 'medium',
    suitableZoneTypes: ['booth', 'main_hall'],
    recommendedEventTypes: ['booth_heatup'],
  },
  prepare_demo_queue: {
    actionKey: 'prepare_demo_queue',
    label: '准备演示队列',
    description: '为展台演示或产品互动建立清晰队列。',
    category: 'flow_control',
    defaultPriority: 'medium',
    suitableZoneTypes: ['booth', 'main_hall'],
    recommendedEventTypes: ['booth_heatup'],
  },
  notify_booth_owner: {
    actionKey: 'notify_booth_owner',
    label: '通知展台负责人',
    description: '提醒展台负责团队观众关注度正在上升。',
    category: 'communication',
    defaultPriority: 'medium',
    suitableZoneTypes: ['booth'],
    recommendedEventTypes: ['booth_heatup'],
  },
  add_queue_staff: {
    actionKey: 'add_queue_staff',
    label: '增加排队人员',
    description: '在增长中的队列旁增派人员，加快处理速度。',
    category: 'staffing',
    defaultPriority: 'medium',
    suitableZoneTypes: ['registration', 'booth', 'service_desk', 'stage'],
    recommendedEventTypes: ['queue_growth'],
  },
  split_waiting_line: {
    actionKey: 'split_waiting_line',
    label: '拆分等候队列',
    description: '按观众需求或服务类型将队列拆成更清晰的通道。',
    category: 'flow_control',
    defaultPriority: 'medium',
    suitableZoneTypes: ['registration', 'booth', 'service_desk', 'stage'],
    recommendedEventTypes: ['queue_growth'],
  },
  update_waiting_time_board: {
    actionKey: 'update_waiting_time_board',
    label: '更新时间看板',
    description: '通过附近标识或屏幕发布最新等待时长预估。',
    category: 'communication',
    defaultPriority: 'low',
    suitableZoneTypes: ['registration', 'booth', 'service_desk', 'stage'],
    recommendedEventTypes: ['queue_growth'],
  },
  deploy_crowd_control: {
    actionKey: 'deploy_crowd_control',
    label: '部署人流控制',
    description: '派出场控人员稳定人流移动。',
    category: 'flow_control',
    defaultPriority: 'high',
    suitableZoneTypes: ['main_hall', 'stage', 'booth', 'emergency_passage'],
    recommendedEventTypes: ['crowd_spillover'],
  },
  open_buffer_area: {
    actionKey: 'open_buffer_area',
    label: '开放缓冲区',
    description: '启用附近缓冲区，在人流溢出到主通道前进行消化。',
    category: 'flow_control',
    defaultPriority: 'high',
    suitableZoneTypes: ['main_hall', 'stage', 'booth'],
    recommendedEventTypes: ['crowd_spillover'],
  },
  protect_emergency_passage: {
    actionKey: 'protect_emergency_passage',
    label: '保护应急通道',
    description: '保持应急通道畅通，堵塞时立即升级处理。',
    category: 'escalation',
    defaultPriority: 'high',
    suitableZoneTypes: ['main_hall', 'stage', 'booth', 'emergency_passage'],
    recommendedEventTypes: ['crowd_spillover'],
  },
  dispatch_technical_support: {
    actionKey: 'dispatch_technical_support',
    label: '派发技术支持',
    description: '安排技术支持负责人检查并修复上报问题。',
    category: 'technical',
    defaultPriority: 'high',
    suitableZoneTypes: ['registration', 'booth', 'service_desk', 'stage'],
    recommendedEventTypes: ['equipment_issue'],
  },
  switch_backup_equipment: {
    actionKey: 'switch_backup_equipment',
    label: '切换备用设备',
    description: '将服务或演示流程切换到备用设备。',
    category: 'technical',
    defaultPriority: 'high',
    suitableZoneTypes: ['registration', 'booth', 'service_desk', 'stage'],
    recommendedEventTypes: ['equipment_issue'],
  },
  pause_related_session: {
    actionKey: 'pause_related_session',
    label: '暂停相关环节',
    description: '当设备问题影响安全执行时，暂停受影响环节。',
    category: 'escalation',
    defaultPriority: 'medium',
    suitableZoneTypes: ['stage', 'booth'],
    recommendedEventTypes: ['equipment_issue'],
  },
  request_backup_staff: {
    actionKey: 'request_backup_staff',
    label: '请求后备人员',
    description: '向后备团队申请增援承压区域。',
    category: 'staffing',
    defaultPriority: 'medium',
    suitableZoneTypes: ['entrance', 'registration', 'main_hall', 'booth', 'service_desk', 'stage'],
    recommendedEventTypes: ['staff_shortage'],
  },
  reassign_staff: {
    actionKey: 'reassign_staff',
    label: '重新调配人员',
    description: '将附近低负载区域人员调往承压区域。',
    category: 'staffing',
    defaultPriority: 'medium',
    suitableZoneTypes: ['entrance', 'registration', 'main_hall', 'booth', 'service_desk', 'stage'],
    recommendedEventTypes: ['staff_shortage'],
  },
  reduce_noncritical_tasks: {
    actionKey: 'reduce_noncritical_tasks',
    label: '减少非关键任务',
    description: '临时暂停低优先级工作，让人员先处理紧急需求。',
    category: 'staffing',
    defaultPriority: 'medium',
    suitableZoneTypes: ['entrance', 'registration', 'main_hall', 'booth', 'service_desk', 'stage'],
    recommendedEventTypes: ['staff_shortage'],
  },
  escalate_timeout_task: {
    actionKey: 'escalate_timeout_task',
    label: '升级超时任务',
    description: '将超时任务提升到主管队列。',
    category: 'escalation',
    defaultPriority: 'medium',
    suitableZoneTypes: ['entrance', 'registration', 'main_hall', 'booth', 'service_desk', 'stage', 'emergency_passage'],
    recommendedEventTypes: ['task_timeout'],
  },
  notify_supervisor: {
    actionKey: 'notify_supervisor',
    label: '通知主管',
    description: '通知责任主管该任务需要关注。',
    category: 'communication',
    defaultPriority: 'medium',
    suitableZoneTypes: ['entrance', 'registration', 'main_hall', 'booth', 'service_desk', 'stage', 'emergency_passage'],
    recommendedEventTypes: ['task_timeout'],
  },
  reassign_task_owner: {
    actionKey: 'reassign_task_owner',
    label: '改派任务负责人',
    description: '将任务转交给能更快响应的负责人。',
    category: 'staffing',
    defaultPriority: 'medium',
    suitableZoneTypes: ['entrance', 'registration', 'main_hall', 'booth', 'service_desk', 'stage', 'emergency_passage'],
    recommendedEventTypes: ['task_timeout'],
  },
  deploy_guidance_volunteers: {
    actionKey: 'deploy_guidance_volunteers',
    label: '部署引导志愿者',
    description: '在观众频繁求助的位置安排引导志愿者。',
    category: 'staffing',
    defaultPriority: 'low',
    suitableZoneTypes: ['entrance', 'main_hall', 'booth', 'service_desk'],
    recommendedEventTypes: ['visitor_guidance_needed'],
  },
  update_wayfinding_signage: {
    actionKey: 'update_wayfinding_signage',
    label: '更新导视标识',
    description: '在易混淆路线点位附近新增或调整临时标识。',
    category: 'communication',
    defaultPriority: 'low',
    suitableZoneTypes: ['entrance', 'main_hall', 'booth', 'service_desk'],
    recommendedEventTypes: ['visitor_guidance_needed'],
  },
  broadcast_route_hint: {
    actionKey: 'broadcast_route_hint',
    label: '广播路线提示',
    description: '通过场馆广播或本地屏幕发布路线提示。',
    category: 'communication',
    defaultPriority: 'low',
    suitableZoneTypes: ['entrance', 'main_hall', 'booth', 'service_desk'],
    recommendedEventTypes: ['visitor_guidance_needed'],
  },
} as const satisfies Record<EventActionKey, EventActionDefinition>

const eventActionKeySet = new Set<EventActionKey>(Object.keys(EVENT_ACTION_CATALOG) as EventActionKey[])

export function listEventActionDefinitions() {
  return Object.values(EVENT_ACTION_CATALOG) as EventActionDefinition[]
}

export function getEventActionDefinition(actionKey: EventActionKey) {
  return EVENT_ACTION_CATALOG[actionKey]
}

export function getEventActionLabel(actionKey: EventActionKey) {
  return getEventActionDefinition(actionKey).label
}

export function getEventActionsForEvent(eventType: VenueEventType) {
  return listEventActionDefinitions().filter((action) => action.recommendedEventTypes.includes(eventType))
}

export function getEventActionsForZoneType(zoneType: VenueZoneType) {
  return listEventActionDefinitions().filter((action) => action.suitableZoneTypes.includes(zoneType))
}

export function isEventActionKey(value: unknown): value is EventActionKey {
  return typeof value === 'string' && eventActionKeySet.has(value as EventActionKey)
}

import type { EventActionCategory, EventActionKey } from './event-action-catalog'
import type { VenueEventType } from './venue-event-types'
import type { VenueZoneType } from './venue-zones'

export type StaffRole =
  | 'entrance_guide'
  | 'registration_volunteer'
  | 'floor_coordinator'
  | 'booth_reception'
  | 'service_desk_agent'
  | 'stage_operator'
  | 'technical_support'
  | 'security_guard'
  | 'supervisor'

export type StaffSkill =
  | 'visitor_guidance'
  | 'queue_control'
  | 'crowd_control'
  | 'registration_support'
  | 'booth_reception'
  | 'technical_support'
  | 'broadcast_operation'
  | 'emergency_clearance'
  | 'supervisor_escalation'

export type StaffAvailabilityStatus = 'available' | 'standby' | 'assigned' | 'off_duty'

export type StaffShift = 'morning' | 'afternoon' | 'full_day'

export interface StaffPoolMember {
  staffId: string
  displayName: string
  role: StaffRole
  team: string
  primaryZoneType: VenueZoneType
  preferredZoneTypes: readonly VenueZoneType[]
  skills: readonly StaffSkill[]
  supportedActionCategories: readonly EventActionCategory[]
  supportedEventTypes: readonly VenueEventType[]
  availability: StaffAvailabilityStatus
  shift: StaffShift
  loadScore: number
  supervisorId?: string
}

export const STAFF_ACTION_SKILL_REQUIREMENTS = {
  fill_position: ['visitor_guidance', 'queue_control'],
  open_extra_entry_lane: ['queue_control', 'registration_support'],
  redirect_to_secondary_entry: ['visitor_guidance', 'queue_control'],
  booth_reception_support: ['booth_reception', 'visitor_guidance'],
  prepare_demo_queue: ['queue_control', 'booth_reception'],
  notify_booth_owner: ['booth_reception'],
  add_queue_staff: ['queue_control'],
  split_waiting_line: ['queue_control', 'visitor_guidance'],
  update_waiting_time_board: ['broadcast_operation', 'visitor_guidance'],
  deploy_crowd_control: ['crowd_control'],
  open_buffer_area: ['crowd_control', 'visitor_guidance'],
  protect_emergency_passage: ['emergency_clearance', 'crowd_control'],
  dispatch_technical_support: ['technical_support'],
  switch_backup_equipment: ['technical_support'],
  pause_related_session: ['technical_support', 'supervisor_escalation'],
  request_backup_staff: ['supervisor_escalation'],
  reassign_staff: ['supervisor_escalation'],
  reduce_noncritical_tasks: ['supervisor_escalation'],
  escalate_timeout_task: ['supervisor_escalation'],
  notify_supervisor: ['supervisor_escalation'],
  reassign_task_owner: ['supervisor_escalation'],
  deploy_guidance_volunteers: ['visitor_guidance'],
  update_wayfinding_signage: ['visitor_guidance'],
  broadcast_route_hint: ['broadcast_operation'],
} as const satisfies Record<EventActionKey, readonly StaffSkill[]>

export const demoStaffPool: StaffPoolMember[] = [
  {
    staffId: 'staff-entrance-01',
    displayName: '入口引导员 A',
    role: 'entrance_guide',
    team: '现场运营',
    primaryZoneType: 'entrance',
    preferredZoneTypes: ['entrance', 'registration'],
    skills: ['visitor_guidance', 'queue_control'],
    supportedActionCategories: ['staffing', 'flow_control', 'communication'],
    supportedEventTypes: ['entrance_congestion', 'queue_growth', 'visitor_guidance_needed'],
    availability: 'available',
    shift: 'full_day',
    loadScore: 35,
    supervisorId: 'staff-supervisor-01',
  },
  {
    staffId: 'staff-entrance-02',
    displayName: '入口引导员 B',
    role: 'entrance_guide',
    team: '现场运营',
    primaryZoneType: 'entrance',
    preferredZoneTypes: ['entrance', 'main_hall'],
    skills: ['visitor_guidance', 'queue_control', 'crowd_control'],
    supportedActionCategories: ['staffing', 'flow_control'],
    supportedEventTypes: ['entrance_congestion', 'crowd_spillover', 'visitor_guidance_needed'],
    availability: 'standby',
    shift: 'afternoon',
    loadScore: 20,
    supervisorId: 'staff-supervisor-01',
  },
  {
    staffId: 'staff-registration-01',
    displayName: '签到负责人',
    role: 'registration_volunteer',
    team: '签到组',
    primaryZoneType: 'registration',
    preferredZoneTypes: ['registration', 'entrance', 'service_desk'],
    skills: ['registration_support', 'queue_control', 'visitor_guidance'],
    supportedActionCategories: ['staffing', 'flow_control', 'communication'],
    supportedEventTypes: ['entrance_congestion', 'queue_growth', 'staff_shortage'],
    availability: 'assigned',
    shift: 'full_day',
    loadScore: 70,
    supervisorId: 'staff-supervisor-01',
  },
  {
    staffId: 'staff-floor-01',
    displayName: '主展厅协调员',
    role: 'floor_coordinator',
    team: '场馆协调',
    primaryZoneType: 'main_hall',
    preferredZoneTypes: ['main_hall', 'booth', 'emergency_passage'],
    skills: ['crowd_control', 'visitor_guidance', 'supervisor_escalation'],
    supportedActionCategories: ['flow_control', 'staffing', 'escalation'],
    supportedEventTypes: ['crowd_spillover', 'staff_shortage', 'task_timeout'],
    availability: 'available',
    shift: 'full_day',
    loadScore: 45,
    supervisorId: 'staff-supervisor-01',
  },
  {
    staffId: 'staff-booth-512-01',
    displayName: '展台 512 接待 A',
    role: 'booth_reception',
    team: '展台运营',
    primaryZoneType: 'booth',
    preferredZoneTypes: ['booth', 'main_hall'],
    skills: ['booth_reception', 'visitor_guidance', 'queue_control'],
    supportedActionCategories: ['staffing', 'flow_control', 'communication'],
    supportedEventTypes: ['booth_heatup', 'queue_growth', 'visitor_guidance_needed'],
    availability: 'available',
    shift: 'morning',
    loadScore: 40,
    supervisorId: 'staff-supervisor-02',
  },
  {
    staffId: 'staff-booth-512-02',
    displayName: '展台 512 接待 B',
    role: 'booth_reception',
    team: '展台运营',
    primaryZoneType: 'booth',
    preferredZoneTypes: ['booth'],
    skills: ['booth_reception', 'visitor_guidance'],
    supportedActionCategories: ['staffing', 'communication'],
    supportedEventTypes: ['booth_heatup', 'visitor_guidance_needed', 'staff_shortage'],
    availability: 'standby',
    shift: 'afternoon',
    loadScore: 15,
    supervisorId: 'staff-supervisor-02',
  },
  {
    staffId: 'staff-service-01',
    displayName: '服务台专员',
    role: 'service_desk_agent',
    team: '客户服务',
    primaryZoneType: 'service_desk',
    preferredZoneTypes: ['service_desk', 'registration', 'main_hall'],
    skills: ['visitor_guidance', 'queue_control', 'broadcast_operation'],
    supportedActionCategories: ['communication', 'staffing', 'flow_control'],
    supportedEventTypes: ['queue_growth', 'visitor_guidance_needed', 'task_timeout'],
    availability: 'available',
    shift: 'full_day',
    loadScore: 30,
    supervisorId: 'staff-supervisor-01',
  },
  {
    staffId: 'staff-stage-01',
    displayName: '舞台执行',
    role: 'stage_operator',
    team: '节目运营',
    primaryZoneType: 'stage',
    preferredZoneTypes: ['stage', 'booth'],
    skills: ['broadcast_operation', 'queue_control', 'technical_support'],
    supportedActionCategories: ['communication', 'technical', 'flow_control'],
    supportedEventTypes: ['queue_growth', 'equipment_issue', 'task_timeout'],
    availability: 'assigned',
    shift: 'afternoon',
    loadScore: 65,
    supervisorId: 'staff-supervisor-02',
  },
  {
    staffId: 'staff-tech-01',
    displayName: '技术支持 A',
    role: 'technical_support',
    team: '技术支持',
    primaryZoneType: 'stage',
    preferredZoneTypes: ['stage', 'booth', 'registration', 'service_desk'],
    skills: ['technical_support', 'broadcast_operation'],
    supportedActionCategories: ['technical', 'escalation'],
    supportedEventTypes: ['equipment_issue', 'task_timeout'],
    availability: 'available',
    shift: 'full_day',
    loadScore: 25,
    supervisorId: 'staff-supervisor-02',
  },
  {
    staffId: 'staff-security-01',
    displayName: '安保 A',
    role: 'security_guard',
    team: '安保组',
    primaryZoneType: 'emergency_passage',
    preferredZoneTypes: ['emergency_passage', 'main_hall', 'entrance'],
    skills: ['emergency_clearance', 'crowd_control', 'visitor_guidance'],
    supportedActionCategories: ['flow_control', 'escalation', 'staffing'],
    supportedEventTypes: ['crowd_spillover', 'entrance_congestion', 'task_timeout'],
    availability: 'available',
    shift: 'full_day',
    loadScore: 50,
    supervisorId: 'staff-supervisor-01',
  },
  {
    staffId: 'staff-supervisor-01',
    displayName: '场馆主管 A',
    role: 'supervisor',
    team: '指挥台',
    primaryZoneType: 'main_hall',
    preferredZoneTypes: ['entrance', 'registration', 'main_hall', 'service_desk', 'emergency_passage'],
    skills: ['supervisor_escalation', 'crowd_control', 'visitor_guidance'],
    supportedActionCategories: ['escalation', 'staffing', 'flow_control', 'communication'],
    supportedEventTypes: ['staff_shortage', 'task_timeout', 'crowd_spillover', 'entrance_congestion'],
    availability: 'available',
    shift: 'full_day',
    loadScore: 55,
  },
  {
    staffId: 'staff-supervisor-02',
    displayName: '节目主管 B',
    role: 'supervisor',
    team: '指挥台',
    primaryZoneType: 'stage',
    preferredZoneTypes: ['stage', 'booth', 'main_hall'],
    skills: ['supervisor_escalation', 'technical_support', 'broadcast_operation'],
    supportedActionCategories: ['escalation', 'technical', 'staffing', 'communication'],
    supportedEventTypes: ['equipment_issue', 'staff_shortage', 'task_timeout', 'booth_heatup'],
    availability: 'standby',
    shift: 'full_day',
    loadScore: 35,
  },
]

const staffIdSet = new Set<string>(demoStaffPool.map((staff) => staff.staffId))

function isDispatchable(staff: StaffPoolMember) {
  return staff.availability === 'available' || staff.availability === 'standby'
}

function hasEveryRequiredSkill(staff: StaffPoolMember, requiredSkills: readonly StaffSkill[]) {
  return requiredSkills.every((skill) => staff.skills.includes(skill))
}

function byLowestLoad(left: StaffPoolMember, right: StaffPoolMember) {
  return left.loadScore - right.loadScore
}

export function listStaffPool() {
  return demoStaffPool
}

export function getStaffById(staffId: string) {
  return demoStaffPool.find((staff) => staff.staffId === staffId) ?? null
}

export function getStaffByRole(role: StaffRole) {
  return demoStaffPool.filter((staff) => staff.role === role)
}

export function getStaffByAvailability(availability: StaffAvailabilityStatus) {
  return demoStaffPool.filter((staff) => staff.availability === availability)
}

export function getStaffForZoneType(zoneType: VenueZoneType) {
  return demoStaffPool.filter((staff) => staff.preferredZoneTypes.includes(zoneType))
}

export function getStaffForEventType(eventType: VenueEventType) {
  return demoStaffPool.filter((staff) => staff.supportedEventTypes.includes(eventType))
}

export function getStaffForActionCategory(category: EventActionCategory) {
  return demoStaffPool.filter((staff) => staff.supportedActionCategories.includes(category))
}

export function getStaffForActionKey(actionKey: EventActionKey) {
  const requiredSkills = STAFF_ACTION_SKILL_REQUIREMENTS[actionKey]
  return demoStaffPool.filter((staff) => hasEveryRequiredSkill(staff, requiredSkills))
}

export function getDispatchableStaffForActionKey(actionKey: EventActionKey) {
  return getStaffForActionKey(actionKey).filter(isDispatchable).sort(byLowestLoad)
}

export function getDispatchableStaffForEventType(eventType: VenueEventType) {
  return getStaffForEventType(eventType).filter(isDispatchable).sort(byLowestLoad)
}

export function getDispatchableStaffForZoneType(zoneType: VenueZoneType) {
  return getStaffForZoneType(zoneType).filter(isDispatchable).sort(byLowestLoad)
}

export function getStaffingSummaryByZoneType(zoneType: VenueZoneType) {
  const staffForZone = getStaffForZoneType(zoneType)

  return {
    zoneType,
    total: staffForZone.length,
    dispatchable: staffForZone.filter(isDispatchable).length,
    assigned: staffForZone.filter((staff) => staff.availability === 'assigned').length,
    offDuty: staffForZone.filter((staff) => staff.availability === 'off_duty').length,
  }
}

export function isStaffId(value: unknown): value is string {
  return typeof value === 'string' && staffIdSet.has(value)
}

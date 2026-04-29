import { deepClone } from '../app-config.ts'
import type {
  AgentGateway,
  AnalyticsEventType,
  DataSourceHealth,
  EventSeverity,
  EventSignal,
  ExpoPilotSnapshot,
  Feedback,
  NotificationGateway,
  Task,
  TaskStatus,
  TaskType,
  UiFeedbackState,
  Zone,
} from '../domain/types'

interface ActionResult {
  snapshot: ExpoPilotSnapshot
  feedback?: UiFeedbackState
}

const DEMO_PROJECT_ID = 'project-spring-2026'

const DEMO_ZONE_BLUEPRINTS: Array<Pick<Zone, 'zone_id' | 'name' | 'zone_type' | 'heat' | 'density' | 'queue_minutes' | 'threshold' | 'staffing_target' | 'recommended_action' | 'notes'>> = [
  {
    zone_id: 'zone-entry',
    name: '入口区',
    zone_type: 'entry',
    heat: 88,
    density: 79,
    queue_minutes: 11,
    threshold: 70,
    staffing_target: 2,
    recommended_action: '安排执行人员 1 前往入口区补位，并协助疏导入口排队。',
    notes: '当前固定演示主场景。',
  },
  {
    zone_id: 'zone-main-corridor',
    name: '主通道区',
    zone_type: 'stage',
    heat: 52,
    density: 43,
    queue_minutes: 0,
    threshold: 65,
    staffing_target: 1,
    recommended_action: '观察主通道区密度变化，必要时执行导流。',
    notes: '用于后续 zone_imbalance 场景预留。',
  },
  {
    zone_id: 'zone-booth-a',
    name: '展台 A',
    zone_type: 'booth',
    heat: 47,
    density: 39,
    queue_minutes: 0,
    threshold: 75,
    staffing_target: 1,
    recommended_action: '安排展台接待 1 稳定接待节奏。',
    notes: '用于后续 booth_heatup 场景预留。',
  },
  {
    zone_id: 'zone-booth-b',
    name: '展台 B',
    zone_type: 'booth',
    heat: 34,
    density: 28,
    queue_minutes: 0,
    threshold: 75,
    staffing_target: 1,
    recommended_action: '保持待命，等待现场调度。',
    notes: '用于后续 zone_imbalance 场景预留。',
  },
]

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}`
}

function now() {
  return new Date().toISOString()
}

function isDemoProject(projectId?: string) {
  return projectId === DEMO_PROJECT_ID
}

function inferDemoZoneId(label: string | undefined) {
  if (!label) return undefined
  if (label.includes('入口')) return 'zone-entry'
  if (label.includes('主通道')) return 'zone-main-corridor'
  if (label.includes('展台 A')) return 'zone-booth-a'
  if (label.includes('展台 B')) return 'zone-booth-b'
  return undefined
}

function normalizeDemoProjectState(snapshot: ExpoPilotSnapshot) {
  if (!snapshot.projects.some((project) => project.project_id === DEMO_PROJECT_ID)) return

  const currentDemoZones = snapshot.zones.filter((zone) => zone.project_id === DEMO_PROJECT_ID)
  const zoneById = new Map(currentDemoZones.map((zone) => [zone.zone_id, zone]))
  const zoneByName = new Map(currentDemoZones.map((zone) => [zone.name, zone]))
  const zoneIdRemap = new Map<string, string>()

  const normalizedZones: Zone[] = DEMO_ZONE_BLUEPRINTS.map((blueprint) => {
    const existing = zoneById.get(blueprint.zone_id) ?? zoneByName.get(blueprint.name)
    if (existing && existing.zone_id !== blueprint.zone_id) {
      zoneIdRemap.set(existing.zone_id, blueprint.zone_id)
    }

    return {
      zone_id: blueprint.zone_id,
      project_id: DEMO_PROJECT_ID,
      name: blueprint.name,
      zone_type: blueprint.zone_type,
      heat: existing?.heat ?? blueprint.heat,
      density: existing?.density ?? blueprint.density,
      queue_minutes: existing?.queue_minutes ?? blueprint.queue_minutes,
      threshold: existing?.threshold ?? blueprint.threshold,
      staffing_target: existing?.staffing_target ?? blueprint.staffing_target,
      recommended_action: existing?.recommended_action ?? blueprint.recommended_action,
      notes: existing?.notes ?? blueprint.notes,
    }
  })

  const validZoneIds = new Set(normalizedZones.map((zone) => zone.zone_id))

  snapshot.zones = [...snapshot.zones.filter((zone) => zone.project_id !== DEMO_PROJECT_ID), ...normalizedZones]

  snapshot.dataSources = snapshot.dataSources.map((source) => {
    if (source.project_id !== DEMO_PROJECT_ID || !source.zone_id) return source
    const remappedZoneId = zoneIdRemap.get(source.zone_id) ?? source.zone_id
    const fallbackZoneId = inferDemoZoneId(source.name)
    const zoneId = validZoneIds.has(remappedZoneId) ? remappedZoneId : fallbackZoneId ?? remappedZoneId
    return { ...source, zone_id: zoneId }
  })

  snapshot.staff = snapshot.staff.map((member) => {
    if (member.staff_id === 'staff-manager-01') return { ...member, assigned_zone_id: 'zone-main-corridor' }
    if (member.staff_id === 'staff-01') return { ...member, assigned_zone_id: 'zone-entry' }
    if (member.staff_id === 'staff-booth-01') return { ...member, assigned_zone_id: 'zone-booth-a' }
    const remappedZoneId = zoneIdRemap.get(member.assigned_zone_id)
    return remappedZoneId ? { ...member, assigned_zone_id: remappedZoneId } : member
  })

  snapshot.signals = snapshot.signals
    .filter((signal) => signal.project_id !== DEMO_PROJECT_ID || validZoneIds.has(zoneIdRemap.get(signal.zone_id) ?? signal.zone_id))
    .map((signal) =>
      signal.project_id !== DEMO_PROJECT_ID ? signal : { ...signal, zone_id: zoneIdRemap.get(signal.zone_id) ?? signal.zone_id },
    )

  snapshot.events = snapshot.events
    .filter((event) => event.project_id !== DEMO_PROJECT_ID || validZoneIds.has(zoneIdRemap.get(event.zone_id) ?? event.zone_id))
    .map((event) =>
      event.project_id !== DEMO_PROJECT_ID ? event : { ...event, zone_id: zoneIdRemap.get(event.zone_id) ?? event.zone_id },
    )

  const validEventIds = new Set(snapshot.events.map((event) => event.event_id))
  snapshot.tasks = snapshot.tasks.filter((task) => task.project_id !== DEMO_PROJECT_ID || validEventIds.has(task.event_id))
  const validTaskIds = new Set(snapshot.tasks.map((task) => task.task_id))
  snapshot.feedback = snapshot.feedback.filter((item) => item.project_id !== DEMO_PROJECT_ID || validTaskIds.has(item.task_id))
}

function buildDemoEntranceSignal(snapshot: ExpoPilotSnapshot): EventSignal {
  const entrySource = snapshot.dataSources.find((source) => source.project_id === DEMO_PROJECT_ID && source.zone_id === 'zone-entry')

  return {
    signal_id: nextId('sig-demo'),
    project_id: DEMO_PROJECT_ID,
    zone_id: 'zone-entry',
    timestamp: now(),
    source: entrySource?.source_id ?? 'demo-entry-simulator',
    idempotencyKey: `demo-entry-${Date.now()}`,
    signal_type: 'entrance_congestion',
    severity: 'high',
    summary: '入口区出现新一轮拥堵，排队开始外溢，需要立即补位。',
    confidence: 0.91,
    input_mode: entrySource?.mode ?? 'realtime',
    raw_rules: ['queue_minutes > 10', 'density > 70 for 90s', 'demo_project = true'],
  }
}

function addAuditLog(
  snapshot: ExpoPilotSnapshot,
  operatorId: string,
  actionType: ExpoPilotSnapshot['auditLogs'][number]['action_type'],
  targetId: string,
) {
  snapshot.auditLogs.unshift({
    log_id: nextId('log'),
    operator_id: operatorId,
    action_type: actionType,
    target_id: targetId,
    created_at: now(),
  })
}

function addAnalytics(snapshot: ExpoPilotSnapshot, type: AnalyticsEventType, projectId: string, actor: string, detail: string) {
  snapshot.analytics.unshift({
    analytics_id: nextId('analytics'),
    type,
    project_id: projectId,
    actor,
    at: now(),
    detail,
  })
}

function warning(snapshot: ExpoPilotSnapshot, message: string, scope: UiFeedbackState['scope']): ActionResult {
  return { snapshot, feedback: { kind: 'warning', message, scope } }
}

function error(snapshot: ExpoPilotSnapshot, message: string, scope: UiFeedbackState['scope']): ActionResult {
  return { snapshot, feedback: { kind: 'error', message, scope } }
}

function success(snapshot: ExpoPilotSnapshot, message: string, scope: UiFeedbackState['scope']): ActionResult {
  return { snapshot, feedback: { kind: 'success', message, scope } }
}

function addFeedbackRecord(
  snapshot: ExpoPilotSnapshot,
  taskId: string,
  projectId: string,
  eventId: string,
  staffId: string,
  type: Feedback['type'],
  note: string,
) {
  snapshot.feedback.unshift({
    feedback_id: nextId('feedback'),
    task_id: taskId,
    project_id: projectId,
    event_id: eventId,
    staff_id: staffId,
    timestamp: now(),
    source: 'staff-app',
    idempotencyKey: `${taskId}-${type}-${Date.now()}`,
    type,
    note,
  })
}

function bumpStaffLoad(snapshot: ExpoPilotSnapshot, staffId: string | undefined, delta: number) {
  if (!staffId) return
  const staff = snapshot.staff.find((member) => member.staff_id === staffId)
  if (!staff) return
  staff.current_load = Math.max(0, staff.current_load + delta)
}

function getTaskStatusCopy(status: TaskStatus) {
  switch (status) {
    case 'created':
      return '任务已创建并进入调度面板。'
    case 'received':
      return '工作人员已接收任务。'
    case 'processing':
      return '工作人员已开始处理任务。'
    case 'completed':
      return '任务已完成并回传到后台。'
    case 'exception':
      return '工作人员反馈当前任务出现异常。'
    default:
      return '任务状态已更新。'
  }
}

function updateTaskReceipts(task: Task, notificationGateway: NotificationGateway, status: TaskStatus) {
  task.notification_receipts = notificationGateway.syncReceipts(task.notification_receipts ?? [], status)
}

function createProjectSourceName(title: string) {
  return `${title}人工录入台`
}

function taskTypeFromEventType(eventType: string): TaskType {
  switch (eventType) {
    case 'entrance_congestion':
      return '补位'
    case 'booth_heatup':
      return '支援接待'
    case 'zone_imbalance':
      return '导流'
    default:
      return '待命'
  }
}

function taskTitleFromType(taskType: TaskType, eventTitle: string) {
  return `${taskType} / ${eventTitle}`
}

export function createProjectAction(
  snapshot: ExpoPilotSnapshot,
  role: 'brand' | 'organizer' | 'agency' | 'admin',
  displayName: string,
  formData: FormData,
): ActionResult {
  const title = String(formData.get('title') || '').trim()
  const venue = String(formData.get('venue') || '').trim()
  const city = String(formData.get('city') || '').trim()
  const theme = String(formData.get('theme') || '').trim()

  if (!title || !venue || !city) {
    return warning(snapshot, '请补齐项目名称、场馆名称和城市。', 'config')
  }

  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const projectId = nextId('project')
  const orgId = role === 'brand' ? 'org-brand' : role === 'agency' ? 'org-agency' : 'org-main'
  next.projects.unshift({
    project_id: projectId,
    org_id: orgId,
    title,
    venue_name: venue,
    city,
    theme: theme || 'ExpoPilot OS 现场运营 MVP',
    start_at: now(),
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    status: 'draft',
    current_phase: '配置中',
  })
  next.dataSources.push({
    source_id: nextId('source'),
    project_id: projectId,
    name: createProjectSourceName(title),
    source_type: 'manual',
    mode: 'manual',
    health: 'online',
    last_seen_at: now(),
    latency_seconds: 0,
    fallback_enabled: true,
    provider_name: '运营后台',
  })
  addAuditLog(next, displayName, 'project_created', projectId)
  addAnalytics(next, 'project_created', projectId, displayName, '创建项目并自动生成一个人工录入入口。')
  return success(next, '新项目已创建，请继续补齐区域、数据源和岗位配置。', 'config')
}

export function updateZoneAction(snapshot: ExpoPilotSnapshot, displayName: string, zoneId: string, patch: Partial<Zone>): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const target = next.zones.find((zone) => zone.zone_id === zoneId)
  if (!target) return error(snapshot, '未找到目标区域。', 'config')
  Object.assign(target, patch)
  addAuditLog(next, displayName, 'settings_updated', zoneId)
  return success(next, '区域配置已更新。', 'config')
}

export function addZoneAction(snapshot: ExpoPilotSnapshot, displayName: string, projectId: string, formData: FormData): ActionResult {
  const name = String(formData.get('zone_name') || '').trim()
  const zoneType = String(formData.get('zone_type') || 'booth').trim() as Zone['zone_type']
  const recommendedAction = String(formData.get('recommended_action') || '').trim()
  if (!name) return warning(snapshot, '请填写区域名称。', 'config')

  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  next.zones.push({
    zone_id: nextId('zone'),
    project_id: projectId,
    name,
    zone_type: zoneType,
    heat: 40,
    density: 30,
    queue_minutes: 0,
    threshold: zoneType === 'booth' ? 75 : 65,
    staffing_target: 2,
    recommended_action: recommendedAction || '请补充该区域的默认处置动作。',
    notes: '新增区域，待补充运行策略。',
  })
  addAuditLog(next, displayName, 'settings_updated', projectId)
  return success(next, '区域已新增。', 'config')
}

export function removeZoneAction(snapshot: ExpoPilotSnapshot, displayName: string, zoneId: string): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const fallbackZoneId = next.zones.find((zone) => zone.zone_id !== zoneId)?.zone_id ?? ''
  next.zones = next.zones.filter((zone) => zone.zone_id !== zoneId)
  next.staff = next.staff.map((member) => (member.assigned_zone_id === zoneId ? { ...member, assigned_zone_id: fallbackZoneId } : member))
  addAuditLog(next, displayName, 'settings_updated', zoneId)
  return warning(next, '区域已删除，请检查人员绑定和数据源归属。', 'config')
}

export function updateSourceStatusAction(
  snapshot: ExpoPilotSnapshot,
  displayName: string,
  sourceId: string,
  health: DataSourceHealth,
): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const target = next.dataSources.find((source) => source.source_id === sourceId)
  if (!target) return error(snapshot, '未找到目标数据源。', 'source')
  target.health = health
  target.last_seen_at = now()
  if (health === 'online' && target.mode !== 'manual' && target.mode !== 'sandbox') {
    target.mode = 'realtime'
  }
  addAuditLog(next, displayName, 'data_source_updated', sourceId)
  addAnalytics(next, 'data_source_connected', target.project_id, displayName, `更新数据源健康状态为 ${health}`)
  return success(next, '数据源状态已更新。', 'source')
}

export function fallbackSourceAction(snapshot: ExpoPilotSnapshot, displayName: string, sourceId: string): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const target = next.dataSources.find((source) => source.source_id === sourceId)
  if (!target) return error(snapshot, '未找到目标数据源。', 'source')

  target.mode = target.source_type === 'vision' ? 'recorded' : 'manual'
  target.health = 'degraded'
  target.last_seen_at = now()
  addAuditLog(next, displayName, 'data_source_updated', sourceId)
  return warning(next, '已切换为降级输入模式，主流程可继续运行。', 'source')
}

export function reassignStaffZoneAction(snapshot: ExpoPilotSnapshot, displayName: string, staffId: string, zoneId: string): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const target = next.staff.find((member) => member.staff_id === staffId)
  if (!target) return error(snapshot, '未找到目标人员。', 'config')
  target.assigned_zone_id = zoneId
  addAuditLog(next, displayName, 'settings_updated', staffId)
  return success(next, '人员负责区域已更新。', 'config')
}

export function confirmEventAction(snapshot: ExpoPilotSnapshot, displayName: string, eventId: string): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const target = next.events.find((event) => event.event_id === eventId)
  if (!target) return error(snapshot, '未找到目标事件。', 'events')
  target.status = 'confirmed'
  addAuditLog(next, displayName, 'event_updated', eventId)
  return success(next, '事件已确认，可进入任务调度。', 'events')
}

export function ignoreEventAction(snapshot: ExpoPilotSnapshot, displayName: string, eventId: string): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const target = next.events.find((event) => event.event_id === eventId)
  if (!target) return error(snapshot, '未找到目标事件。', 'events')
  target.status = 'ignored'
  addAuditLog(next, displayName, 'event_updated', eventId)
  return warning(next, '事件已忽略。', 'events')
}

export function escalateEventAction(snapshot: ExpoPilotSnapshot, displayName: string, eventId: string): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const target = next.events.find((event) => event.event_id === eventId)
  if (!target) return error(snapshot, '未找到目标事件。', 'events')
  target.status = 'escalated'
  addAuditLog(next, displayName, 'event_updated', eventId)
  return warning(next, '事件已升级，请主管介入。', 'events')
}

export function createManualEventAction(
  snapshot: ExpoPilotSnapshot,
  displayName: string,
  projectId: string,
  gateway: AgentGateway,
  formData: FormData,
): ActionResult {
  const zoneId = String(formData.get('zone_id') || '').trim()
  const summary = String(formData.get('summary') || '').trim()
  const severity = String(formData.get('severity') || 'high').trim() as EventSeverity
  const sourceLabel = String(formData.get('source_label') || '现场人工补录台').trim()
  const intakeReason = String(formData.get('intake_reason') || '人工补录').trim()
  if (!zoneId || !summary) return warning(snapshot, '请补齐区域和事件描述。', 'events')

  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const signal: EventSignal = {
    signal_id: nextId('sig-manual'),
    project_id: projectId,
    zone_id: zoneId,
    timestamp: now(),
    source: sourceLabel || 'manual-console',
    idempotencyKey: `manual-${Date.now()}`,
    signal_type: 'manual',
    severity,
    summary,
    confidence: 1,
    input_mode: 'manual',
    raw_rules: ['manual_input = true', `manual_reason = ${intakeReason}`],
  }
  const event = gateway.resolveEvent(next, signal)
  event.summary = summary
  event.title = `人工补录事件 / ${intakeReason}`
  event.source = sourceLabel || 'manual-console'
  event.idempotencyKey = `event-${signal.idempotencyKey}`
  event.explanation = `当前事件由 ${sourceLabel || '现场人工补录台'} 补录，补录原因：${intakeReason}。`
  next.signals.unshift(signal)
  next.events.unshift(event)
  addAuditLog(next, displayName, 'event_created', event.event_id)
  addAnalytics(next, 'event_triggered', projectId, displayName, `人工补录事件：${intakeReason}`)
  return success(next, '人工补录事件已进入事件中心。', 'events')
}

export function dispatchEventAction(
  snapshot: ExpoPilotSnapshot,
  displayName: string,
  eventId: string,
  gateway: AgentGateway,
  notificationGateway: NotificationGateway,
  assigneeId?: string,
): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const event = next.events.find((item) => item.event_id === eventId)
  if (!event) return error(snapshot, '未找到目标事件。', 'dispatch')
  const recommendation = gateway.recommendDispatch(next, eventId, assigneeId)
  const existing = next.tasks.find((task) => task.event_id === eventId && task.status !== 'completed')
  const taskType = taskTypeFromEventType(event.event_type)
  const dispatchedAt = now()

  if (existing && isDemoProject(event.project_id)) {
    // For the fixed demo flow, create a new dispatch window instead of mutating the same task in place.
    existing.status = 'exception'
    existing.note = '上一轮派发已结束，已创建新的派发窗口。'
    updateTaskReceipts(existing, notificationGateway, 'exception')
    bumpStaffLoad(next, existing.assignee_id, -1)

    const taskId = nextId('task')
    next.tasks.unshift({
      task_id: taskId,
      project_id: event.project_id,
      event_id: event.event_id,
      assignee_id: recommendation.assignee_id,
      task_type: taskType,
      title: taskTitleFromType(taskType, event.title),
      action_summary: event.recommended_action,
      status: 'created',
      priority: event.severity,
      reminder_channels: recommendation.reminder_channels,
      dispatched_at: dispatchedAt,
      received_at: '',
      processing_at: '',
      completed_at: '',
      escalation_target_id: 'staff-manager-01',
      retry_count: existing.retry_count + 1,
      note: recommendation.note,
      notification_receipts: notificationGateway.createReceipts(taskId, recommendation.reminder_channels, existing.retry_count + 1),
    })
    bumpStaffLoad(next, recommendation.assignee_id, 1)
  } else if (existing) {
    const previousAssignee = existing.assignee_id
    existing.assignee_id = recommendation.assignee_id
    existing.task_type = taskType
    existing.title = taskTitleFromType(taskType, event.title)
    existing.action_summary = event.recommended_action
    existing.priority = event.severity
    existing.status = 'created'
    existing.dispatched_at = dispatchedAt
    existing.received_at = ''
    existing.processing_at = ''
    existing.completed_at = ''
    existing.note = recommendation.note
    existing.reminder_channels = recommendation.reminder_channels
    existing.retry_count += 1
    existing.notification_receipts = notificationGateway.createReceipts(existing.task_id, recommendation.reminder_channels, existing.retry_count)
    if (previousAssignee !== recommendation.assignee_id) {
      bumpStaffLoad(next, previousAssignee, -1)
      bumpStaffLoad(next, recommendation.assignee_id, 1)
    }
  } else {
    const taskId = nextId('task')
    next.tasks.unshift({
      task_id: taskId,
      project_id: event.project_id,
      event_id: event.event_id,
      assignee_id: recommendation.assignee_id,
      task_type: taskType,
      title: taskTitleFromType(taskType, event.title),
      action_summary: event.recommended_action,
      status: 'created',
      priority: event.severity,
      reminder_channels: recommendation.reminder_channels,
      dispatched_at: dispatchedAt,
      received_at: '',
      processing_at: '',
      completed_at: '',
      escalation_target_id: 'staff-manager-01',
      retry_count: 0,
      note: recommendation.note,
      notification_receipts: notificationGateway.createReceipts(taskId, recommendation.reminder_channels),
    })
    bumpStaffLoad(next, recommendation.assignee_id, 1)
  }

  event.status = 'confirmed'
  event.recommended_assignee_id = recommendation.assignee_id
  addAuditLog(next, displayName, 'task_dispatched', eventId)
  addAnalytics(next, 'task_dispatched', event.project_id, displayName, `派发事件 ${event.title}`)

  const assignee = next.staff.find((member) => member.staff_id === recommendation.assignee_id)
  return success(next, `任务已派发给 ${assignee?.name ?? recommendation.assignee_id}，提醒回执已进入调度面板。`, 'dispatch')
}

export function revokeTaskAction(
  snapshot: ExpoPilotSnapshot,
  displayName: string,
  taskId: string,
  notificationGateway: NotificationGateway,
): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const task = next.tasks.find((item) => item.task_id === taskId)
  if (!task) return error(snapshot, '未找到目标任务。', 'dispatch')
  task.status = 'exception'
  task.note = '主管撤回当前任务，等待重新派发。'
  updateTaskReceipts(task, notificationGateway, 'exception')
  addFeedbackRecord(next, task.task_id, task.project_id, task.event_id, task.assignee_id, 'exception', '主管撤回当前任务，待重新派发。')
  addAuditLog(next, displayName, 'task_updated', taskId)
  return warning(next, '任务已撤回并标记为异常，等待重新派发。', 'dispatch')
}

export function updateTaskStatusAction(
  snapshot: ExpoPilotSnapshot,
  displayName: string,
  taskId: string,
  status: TaskStatus,
  notificationGateway: NotificationGateway,
): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const task = next.tasks.find((item) => item.task_id === taskId)
  if (!task) return error(snapshot, '未找到目标任务。', 'dispatch')

  task.status = status
  if (status === 'received') task.received_at = now()
  if (status === 'processing') task.processing_at = now()
  if (status === 'completed') task.completed_at = now()
  if (status === 'received') task.note = '一线已接收任务。'
  if (status === 'processing') task.note = '一线正在处理任务。'
  if (status === 'exception') task.note = '一线反馈任务出现异常。'
  if (status === 'completed' || status === 'exception') {
    bumpStaffLoad(next, task.assignee_id, -1)
  }
  if (status === 'received' || status === 'processing' || status === 'completed' || status === 'exception') {
    updateTaskReceipts(task, notificationGateway, status)
  }

  const event = next.events.find((item) => item.event_id === task.event_id)
  if (event && status === 'completed') event.status = 'closed'
  if (event && status === 'exception') event.status = 'escalated'
  if (event && (status === 'received' || status === 'processing')) event.status = 'confirmed'

  if (status === 'received' || status === 'processing' || status === 'completed' || status === 'exception') {
    addFeedbackRecord(next, task.task_id, task.project_id, task.event_id, task.assignee_id, status as Feedback['type'], task.note)
  }

  addAuditLog(next, displayName, status === 'completed' ? 'task_completed' : 'task_updated', taskId)
  if (status === 'received') addAnalytics(next, 'task_accepted', task.project_id, displayName, `接收任务 ${task.title}`)
  if (status === 'completed') addAnalytics(next, 'task_completed', task.project_id, displayName, `完成任务 ${task.title}`)
  if (status === 'exception') addAnalytics(next, 'exception_reported', task.project_id, displayName, `异常反馈 ${task.title}`)

  const kind = status === 'completed' ? 'success' : status === 'exception' ? 'warning' : 'success'
  return {
    snapshot: next,
    feedback: { kind, message: getTaskStatusCopy(status), scope: 'dispatch' },
  }
}

export function simulateSignalAction(
  snapshot: ExpoPilotSnapshot,
  displayName: string,
  gateway: AgentGateway,
  projectId: string,
): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const signal = isDemoProject(projectId) ? buildDemoEntranceSignal(next) : gateway.simulateSignal(next, projectId)
  const event = gateway.resolveEvent(next, signal)
  next.signals.unshift(signal)
  next.events.unshift(event)
  addAuditLog(next, displayName, 'event_created', event.event_id)
  addAnalytics(next, 'event_triggered', projectId, displayName, '模拟生成新事件。')
  return success(next, '已生成一条新的模拟事件。', 'global')
}

export function saveStrategyAction(snapshot: ExpoPilotSnapshot, displayName: string, eventId: string, gateway: AgentGateway): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  const event = next.events.find((item) => item.event_id === eventId)
  if (!event) return error(snapshot, '未找到目标事件。', 'strategy')

  next.strategies.unshift({
    strategy_id: nextId('strategy'),
    name: gateway.suggestStrategyName(next, eventId),
    category: '复盘沉淀',
    status: 'draft',
    scope: 'zone',
    project_id: event.project_id,
    zone_id: event.zone_id,
    trigger_summary: event.summary,
    action_summary: event.recommended_action,
    reminder_channels: event.reminder_channels,
    owner: displayName,
    saved_from: 'replay',
    linked_event_ids: [event.event_id],
    usage_count: 0,
    last_used_at: now(),
  })
  addAuditLog(next, displayName, 'strategy_saved', eventId)
  addAnalytics(next, 'strategy_saved', event.project_id, displayName, `沉淀策略 ${event.title}`)
  return success(next, '事件处置已沉淀到策略库。', 'strategy')
}

export function updateSettingsAction(snapshot: ExpoPilotSnapshot, displayName: string): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  addAuditLog(next, displayName, 'settings_updated', 'system-settings')
  return success(next, '系统设置已更新。', 'settings')
}

export function markReportExportedAction(snapshot: ExpoPilotSnapshot, displayName: string, projectId?: string): ActionResult {
  const next = deepClone(snapshot)
  normalizeDemoProjectState(next)
  if (projectId) addAnalytics(next, 'replay_viewed', projectId, displayName, '导出复盘摘要')
  addAuditLog(next, displayName, 'report_exported', projectId ?? 'current-project')
  return {
    snapshot: next,
    feedback: { kind: 'loading', message: '正在准备复盘摘要导出。', scope: 'export' },
  }
}


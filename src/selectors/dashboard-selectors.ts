import type {
  ConnectorStatus,
  EventOperationalItem,
  ExpoPilotSnapshot,
  Feedback,
  LiveMetrics,
  ProjectScope,
  ProjectSummary,
  RuntimeOperationalSummary,
  Session,
  SnapshotSourceMetadata,
  SourceOperationalStatus,
  StaffOperationalStatus,
  Task,
  TaskOperationalItem,
  ZoneOperationalStatus,
} from '../domain/types'
import { receiptSummary } from '../lib/format.ts'

function getSessionScope(session: Session | null) {
  if (!session) return 'all'
  if (session.permission?.scope) return session.permission.scope
  if (session.role === 'brand') return 'brand-scoped'
  if (session.role === 'staff') return 'staff-only'
  if (session.role === 'admin') return 'governance'
  return 'all'
}

const DEMO_PROJECT_ID = 'project-spring-2026'

function selectLatestTaskByEventId(tasks: Task[]) {
  const latestByEventId = new Map<string, Task>()

  for (const task of [...tasks].sort((left, right) => new Date(right.dispatched_at).getTime() - new Date(left.dispatched_at).getTime())) {
    if (!latestByEventId.has(task.event_id)) latestByEventId.set(task.event_id, task)
  }

  return latestByEventId
}

function buildLatestFeedbackByTaskId(tasks: Task[], feedbackItems: Feedback[]) {
  const taskById = new Map(tasks.map((task) => [task.task_id, task]))
  const latestByTaskId = new Map<string, Feedback>()

  for (const item of [...feedbackItems].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())) {
    const task = taskById.get(item.task_id)
    if (!task) continue
    if (new Date(item.timestamp).getTime() < new Date(task.dispatched_at).getTime()) continue
    if (!latestByTaskId.has(item.task_id)) latestByTaskId.set(item.task_id, item)
  }

  return latestByTaskId
}

function selectVisibleTasks(tasks: Task[], projectId: string | undefined) {
  if (projectId !== DEMO_PROJECT_ID) return tasks
  return [...selectLatestTaskByEventId(tasks).values()]
}

function getVisibleProjectIds(snapshot: ExpoPilotSnapshot, session: Session | null) {
  if (!session) return new Set<string>()
  const scope = getSessionScope(session)

  if (scope === 'brand-scoped') {
    const directProjectIds = snapshot.projects.filter((project) => project.org_id === session.orgId).map((project) => project.project_id)
    const collaborativeProjectIds = snapshot.staff
      .filter((member) => member.org_id === session.orgId)
      .map((member) => snapshot.zones.find((zone) => zone.zone_id === member.assigned_zone_id)?.project_id)
      .filter(Boolean) as string[]

    return new Set([...directProjectIds, ...collaborativeProjectIds])
  }

  if (scope === 'staff-only') {
    const visibleProjects = snapshot.staff
      .filter((member) => member.staff_id === session.staffId)
      .map((member) => snapshot.zones.find((zone) => zone.zone_id === member.assigned_zone_id)?.project_id)
      .filter(Boolean)

    return new Set(visibleProjects)
  }

  return new Set(snapshot.projects.map((project) => project.project_id))
}

export function selectProjectScope(snapshot: ExpoPilotSnapshot, projectId: string | undefined, session: Session | null): ProjectScope {
  const project = snapshot.projects.find((item) => item.project_id === projectId)
  const allZones = snapshot.zones.filter((zone) => zone.project_id === projectId)
  const scope = getSessionScope(session)
  const sessionOrgId = session?.orgId
  const sessionStaffId = session?.staffId
  const visibleZoneIds =
    scope === 'brand-scoped' ? allZones.filter((zone) => zone.zone_type === 'booth').map((zone) => zone.zone_id) : allZones.map((zone) => zone.zone_id)
  const visibleZoneSet = new Set(visibleZoneIds)

  const zones = scope === 'brand-scoped' ? allZones.filter((zone) => visibleZoneSet.has(zone.zone_id)) : allZones

  const dataSources = snapshot.dataSources.filter((source) => {
    if (source.project_id !== projectId) return false
    if (scope !== 'brand-scoped') return true
    return source.zone_id ? visibleZoneSet.has(source.zone_id) : false
  })

  const staff = snapshot.staff.filter((member) => {
    if (scope === 'brand-scoped') {
      return member.org_id === sessionOrgId || visibleZoneSet.has(member.assigned_zone_id)
    }
    if (scope === 'staff-only') {
      return member.staff_id === sessionStaffId
    }
    return true
  })

  const events = snapshot.events.filter((event) => {
    if (event.project_id !== projectId) return false
    if (scope !== 'brand-scoped') return true
    return visibleZoneSet.has(event.zone_id)
  })

  const eventIds = new Set(events.map((event) => event.event_id))
  const tasks = snapshot.tasks.filter((task) => task.project_id === projectId && eventIds.has(task.event_id))
  const taskIds = new Set(tasks.map((task) => task.task_id))
  const feedback = snapshot.feedback.filter((item) => item.project_id === projectId && taskIds.has(item.task_id))

  const strategies = snapshot.strategies.filter((strategy) => {
    if (strategy.project_id && strategy.project_id !== projectId) return false
    if (scope !== 'brand-scoped') return true
    return strategy.zone_id ? visibleZoneSet.has(strategy.zone_id) : strategy.linked_event_ids.some((eventId) => eventIds.has(eventId))
  })

  const visibleTargets = new Set<string>([
    ...(project ? [project.project_id] : []),
    ...visibleZoneIds,
    ...dataSources.map((source) => source.source_id),
    ...staff.map((member) => member.staff_id),
    ...events.map((event) => event.event_id),
    ...tasks.map((task) => task.task_id),
    ...strategies.map((strategy) => strategy.strategy_id),
  ])

  const auditLogs = snapshot.auditLogs.filter((log) => {
    if (scope !== 'brand-scoped') return true
    return visibleTargets.has(log.target_id)
  })

  return {
    project,
    zones,
    dataSources,
    staff,
    events,
    tasks,
    feedback,
    strategies,
    auditLogs,
    visible_zone_ids: visibleZoneIds,
  }
}

export function selectProjectSummaries(snapshot: ExpoPilotSnapshot, session: Session | null): ProjectSummary[] {
  const visibleProjectIds = getVisibleProjectIds(snapshot, session)

  return snapshot.projects
    .filter((project) => visibleProjectIds.has(project.project_id))
    .map((project) => {
      const scope = selectProjectScope(snapshot, project.project_id, session)
      return {
        project_id: project.project_id,
        title: project.title,
        status: project.status,
        city: project.city,
        venue_name: project.venue_name,
        theme: project.theme,
        start_at: project.start_at,
        zone_count: scope.zones.length,
        connected_source_count: scope.dataSources.length,
        pending_event_count: scope.events.filter((event) => event.status !== 'closed' && event.status !== 'ignored').length,
        open_task_count: scope.tasks.filter((task) => task.status !== 'completed').length,
        has_manual_source: scope.dataSources.some((source) => source.source_type === 'manual'),
      }
    })
}

export function selectZoneOperationalStatuses(
  snapshot: ExpoPilotSnapshot,
  projectId: string | undefined,
  session: Session | null,
): ZoneOperationalStatus[] {
  const scope = selectProjectScope(snapshot, projectId, session)

  return scope.zones.map((zone) => {
    const zoneEvents = scope.events.filter((event) => event.zone_id === zone.zone_id && event.status !== 'closed' && event.status !== 'ignored')
    const zoneEventIds = new Set(zoneEvents.map((event) => event.event_id))
    const zoneTasks = scope.tasks.filter((task) => zoneEventIds.has(task.event_id) && task.status !== 'completed')
    const zoneSources = scope.dataSources.filter((source) => !source.zone_id || source.zone_id === zone.zone_id)
    const modeSet = new Set(zoneSources.map((source) => source.mode))
    const healthSet = new Set(zoneSources.map((source) => source.health))

    return {
      zone_id: zone.zone_id,
      name: zone.name,
      zone_type: zone.zone_type,
      heat: zone.heat,
      density: zone.density,
      queue_minutes: zone.queue_minutes,
      threshold: zone.threshold,
      pending_event_count: zoneEvents.length,
      open_task_count: zoneTasks.length,
      recommended_action: zone.recommended_action,
      input_mode: modeSet.size === 1 ? zoneSources[0]?.mode ?? 'unknown' : modeSet.size === 0 ? 'unknown' : 'mixed',
      input_health: healthSet.size === 1 ? zoneSources[0]?.health ?? 'unknown' : healthSet.size === 0 ? 'unknown' : 'mixed',
    }
  })
}

function connectorStatusReason(connector: ExpoPilotSnapshot['dataSources'][number]) {
  if (connector.health === 'offline') return '当前输入离线，系统将依赖人工补录或预录回退继续运行。'
  if (connector.mode === 'recorded') return '当前已切到预录回退输入。'
  if (connector.mode === 'manual') return '当前依赖人工输入继续运行。'
  if (connector.mode === 'sandbox') return '当前处于模拟输入沙盒。'
  if (connector.health === 'degraded') return '当前输入健康度下降，建议关注回退策略。'
  return '当前连接器运行正常。'
}

function connectorRecoveryAction(connector: ExpoPilotSnapshot['dataSources'][number]) {
  if (!connector.fallback_enabled) return '当前源未启用回退策略，请人工确认后处理。'
  if (connector.mode === 'recorded' || connector.mode === 'manual') return '可尝试恢复实时输入，若失败则继续回退。'
  return '可标记恢复，继续观察心跳与延迟。'
}

function connectorRetryPolicy(connector: ExpoPilotSnapshot['dataSources'][number]) {
  if (!connector.fallback_enabled) return '异常时仅告警，不自动回退。'
  if (connector.source_type === 'vision') return '连续异常后切预录回退，并保留人工补录入口。'
  if (connector.source_type === 'third_party') return '第三方异常时保留人工录入兜底。'
  return '当前通过本地模拟或人工方式持续供数。'
}

function connectorStatusKind(connector: ExpoPilotSnapshot['dataSources'][number]): ConnectorStatus['status_kind'] {
  if (connector.mode === 'recorded') return 'replay'
  if (connector.mode === 'manual') return 'manual'
  if (connector.mode === 'sandbox') return 'simulated'
  if (connector.health === 'offline') return 'offline'
  if (connector.health === 'degraded') return 'degraded'
  return 'connected'
}

export function selectSourceOperationalStatuses(
  snapshot: ExpoPilotSnapshot,
  projectId: string | undefined,
  session: Session | null,
): SourceOperationalStatus[] {
  const scope = selectProjectScope(snapshot, projectId, session)
  const zoneNames = new Map(scope.zones.map((zone) => [zone.zone_id, zone.name]))

  return scope.dataSources.map((source) => ({
    source_id: source.source_id,
    zone_id: source.zone_id,
    zone_name: source.zone_id ? zoneNames.get(source.zone_id) ?? '未绑定区域' : '项目级入口',
    name: source.name,
    source_type: source.source_type,
    mode: source.mode,
    health: source.health,
    provider_name: source.provider_name,
    latency_seconds: source.latency_seconds,
    last_seen_at: source.last_seen_at,
    fallback_enabled: source.fallback_enabled,
    is_fallback: source.mode === 'recorded' || source.mode === 'manual' || source.mode === 'sandbox',
    status_kind: connectorStatusKind(source),
    status_reason: connectorStatusReason(source),
    recovery_action: connectorRecoveryAction(source),
    retry_policy: connectorRetryPolicy(source),
  }))
}

export function selectEventOperationalItems(
  snapshot: ExpoPilotSnapshot,
  projectId: string | undefined,
  session: Session | null,
): EventOperationalItem[] {
  const scope = selectProjectScope(snapshot, projectId, session)
  const taskByEventId = selectLatestTaskByEventId(scope.tasks)
  const latestFeedbackByTaskId = buildLatestFeedbackByTaskId(scope.tasks, scope.feedback)
  const zoneNames = new Map(scope.zones.map((zone) => [zone.zone_id, zone.name]))
  const staffNames = new Map(scope.staff.map((member) => [member.staff_id, member.name]))
  const signalById = new Map(snapshot.signals.map((signal) => [signal.signal_id, signal]))

  return [...scope.events]
    .sort((left, right) => right.priority_score - left.priority_score || new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .map((event) => {
      const signal = signalById.get(event.signal_ids[0])
      const task = taskByEventId.get(event.event_id)
      const latestFeedback = task ? latestFeedbackByTaskId.get(task.task_id) : undefined
      const operational_state =
        task?.status === 'completed' || event.status === 'closed'
          ? 'closed'
          : task?.status === 'exception'
            ? 'need_support'
            : task
              ? 'assigned'
              : event.status === 'confirmed' || event.status === 'escalated'
                ? 'ready_dispatch'
                : 'pending_confirmation'

      return {
        event,
        zone_name: zoneNames.get(event.zone_id) ?? '未绑定区域',
        source_label: signal?.source ?? event.source,
        source_mode: signal?.input_mode ?? 'unknown',
        trigger_points: signal?.raw_rules ?? [],
        task,
        assignee_name: task ? staffNames.get(task.assignee_id) ?? task.assignee_id : undefined,
        latest_feedback: latestFeedback,
        latest_feedback_label:
          latestFeedback?.note ??
          receiptSummary(task?.notification_receipts) ??
          (task?.status === 'received'
            ? '已回传接收状态'
            : task?.status === 'processing'
              ? '已回传处理中状态'
              : task?.status === 'completed'
                ? '已回传完成状态'
                : task?.status === 'exception'
                  ? '已回传异常状态'
                  : '暂无回执'),
        latest_feedback_at: latestFeedback?.timestamp ?? task?.notification_receipts?.[0]?.updated_at,
        operational_state,
        blocking_reason:
          signal?.input_mode && signal.input_mode !== 'realtime'
            ? '当前事件来自回退或人工输入，建议主管优先确认。'
            : event.requires_confirmation
              ? '当前事件需要人工确认后再进入调度。'
              : undefined,
      }
    })
}

export function selectTaskOperationalItems(
  snapshot: ExpoPilotSnapshot,
  projectId: string | undefined,
  session: Session | null,
): TaskOperationalItem[] {
  const scope = selectProjectScope(snapshot, projectId, session)
  const visibleTasks = selectVisibleTasks(scope.tasks, projectId)
  const eventMap = new Map(scope.events.map((event) => [event.event_id, event]))
  const staffNames = new Map(scope.staff.map((member) => [member.staff_id, member.name]))
  const zoneNames = new Map(scope.zones.map((zone) => [zone.zone_id, zone.name]))
  const latestFeedbackByTaskId = buildLatestFeedbackByTaskId(visibleTasks, scope.feedback)

  return [...visibleTasks]
    .sort((left, right) => new Date(right.dispatched_at).getTime() - new Date(left.dispatched_at).getTime())
    .map((task) => {
      const event = eventMap.get(task.event_id)
      const latestFeedback = latestFeedbackByTaskId.get(task.task_id)
      const notificationSummary = receiptSummary(task.notification_receipts)
      const notificationUpdatedAt = task.notification_receipts?.reduce<string | undefined>((latest, receipt) => {
        if (!latest) return receipt.updated_at
        return new Date(receipt.updated_at).getTime() > new Date(latest).getTime() ? receipt.updated_at : latest
      }, undefined)

      return {
        task,
        event,
        zone_name: event ? zoneNames.get(event.zone_id) ?? '未绑定区域' : '未绑定区域',
        assignee_name: staffNames.get(task.assignee_id) ?? task.assignee_id,
        latest_feedback: latestFeedback,
        latest_feedback_label:
          latestFeedback?.note ??
          (task.status === 'created'
            ? '等待一线回执'
            : task.status === 'received'
              ? '已回传接收状态'
              : task.status === 'processing'
                ? '已回传处理中状态'
                : task.status === 'completed'
                  ? '已回传完成状态'
                  : task.status === 'exception'
                    ? '一线反馈任务异常'
                    : '等待处理'),
        latest_feedback_at: latestFeedback?.timestamp,
        blocker_text: task.status === 'exception' ? '当前任务被标记为异常，需要主管介入或重新派发。' : undefined,
        requires_retry: task.status === 'created' || task.status === 'exception',
        notification_summary: notificationSummary,
        notification_updated_at: notificationUpdatedAt,
      }
    })
}

export function selectLiveMetrics(snapshot: ExpoPilotSnapshot, projectId: string | undefined, session: Session | null): LiveMetrics {
  const scope = selectProjectScope(snapshot, projectId, session)
  const events = scope.events.filter((event) => event.status !== 'closed' && event.status !== 'ignored')
  const activeTasks = scope.tasks.filter((task) => task.status !== 'completed')
  const hottestZoneName = [...scope.zones].sort((left, right) => right.heat - left.heat)[0]?.name ?? '未配置'
  const averageResponseMinutes = averageResponse(scope.tasks.filter((task) => task.completed_at))

  return {
    pending_event_count: events.length,
    active_task_count: activeTasks.length,
    hottest_zone_name: hottestZoneName,
    average_response_minutes: averageResponseMinutes,
  }
}

export function selectRuntimeOperationalSummary(
  snapshot: ExpoPilotSnapshot,
  projectId: string | undefined,
  session: Session | null,
  metadata: SnapshotSourceMetadata,
): RuntimeOperationalSummary {
  const sources = selectSourceOperationalStatuses(snapshot, projectId, session)
  const eventItems = selectEventOperationalItems(snapshot, projectId, session)
  const modeSet = new Set(sources.map((source) => source.mode))
  const healthSet = new Set(sources.map((source) => source.health))

  return {
    source_mode: modeSet.size === 1 ? (sources[0]?.mode ?? 'unknown') : modeSet.size === 0 ? 'unknown' : 'mixed',
    source_health: healthSet.size === 1 ? (sources[0]?.health ?? 'unknown') : healthSet.size === 0 ? 'unknown' : 'mixed',
    blocked_count: eventItems.filter((item) => item.operational_state === 'need_support').length,
    fallback_count: sources.filter((source) => source.is_fallback).length,
    stale_source_count: sources.filter((source) => source.health !== 'online').length,
    current_priority_label: eventItems[0]?.event.title ?? '当前没有待处理优先事件',
    snapshot_origin: metadata.origin,
    schema_version: metadata.schema_version,
    service_mode: metadata.service_mode,
    source_label: metadata.source_label,
    last_synced_at: metadata.last_synced_at,
  }
}

function averageResponse(tasks: Task[]) {
  if (tasks.length === 0) return 0
  const total = tasks.reduce((sum, task) => {
    if (!task.dispatched_at || !task.completed_at) return sum
    const diff = new Date(task.completed_at).getTime() - new Date(task.dispatched_at).getTime()
    return sum + diff / 1000 / 60
  }, 0)
  return Number((total / tasks.length).toFixed(1))
}

export function selectStaffStatuses(snapshot: ExpoPilotSnapshot, projectId: string | undefined, session: Session | null): StaffOperationalStatus[] {
  const scope = selectProjectScope(snapshot, projectId, session)
  const zoneMap = new Map(scope.zones.map((zone) => [zone.zone_id, zone.name]))

  return scope.staff.map((member) => {
    const activeTaskCount = scope.tasks.filter(
      (task) => task.assignee_id === member.staff_id && task.status !== 'completed',
    ).length

    return {
      staff_id: member.staff_id,
      name: member.name,
      title: member.title,
      permission_role: member.permission_role,
      zone_name: zoneMap.get(member.assigned_zone_id) ?? '未绑定区域',
      shift_status: member.shift_status,
      current_load: member.current_load,
      active_task_count: activeTaskCount,
      reminder_channels: member.reminder_channels,
    }
  })
}



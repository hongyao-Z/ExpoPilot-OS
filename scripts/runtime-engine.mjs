import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const snapshotPath = path.join(root, 'public', 'data', 'bootstrap.json')

export function stripUtf8Bom(raw) {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
}

export async function loadSnapshot() {
  const raw = await fs.readFile(snapshotPath, 'utf8')
  return JSON.parse(stripUtf8Bom(raw))
}

export function getProjectBootstrap(snapshot, projectId) {
  if (!projectId) return snapshot
  return {
    project: snapshot.projects.find((project) => project.project_id === projectId),
    zones: snapshot.zones.filter((zone) => zone.project_id === projectId),
    dataSources: snapshot.dataSources.filter((source) => source.project_id === projectId),
    events: snapshot.events.filter((event) => event.project_id === projectId),
    tasks: snapshot.tasks.filter((task) => task.project_id === projectId),
    staff: snapshot.staff,
    strategies: snapshot.strategies.filter((strategy) => !strategy.project_id || strategy.project_id === projectId),
  }
}

export function buildSimulatedSignal(snapshot, projectId = 'project-spring-2026') {
  const projectZones = snapshot.zones.filter((zone) => zone.project_id === projectId)
  const targetZone = projectZones.sort((left, right) => right.heat - left.heat)[0]
  const signalType =
    targetZone.zone_type === 'entry' ? 'entrance_congestion' : targetZone.zone_type === 'booth' ? 'booth_heatup' : 'zone_imbalance'
  return {
    signal_id: `sig-auto-${snapshot.signals.length + 1}`,
    project_id: projectId,
    zone_id: targetZone.zone_id,
    timestamp: new Date('2026-04-08T10:36:00+08:00').toISOString(),
    source: 'simulator',
    idempotencyKey: `simulator-${projectId}-${snapshot.signals.length + 1}`,
    signal_type: signalType,
    severity: targetZone.heat > 85 ? 'critical' : 'high',
    summary:
      targetZone.zone_type === 'booth'
        ? `${targetZone.name} 热度升高，建议立即确认接待承接能力。`
        : signalType === 'entrance_congestion'
          ? `${targetZone.name} 出现新一轮入口拥堵，建议立即补位。`
          : `${targetZone.name} 出现区域失衡迹象，建议尽快导流。`,
    confidence: 0.83,
    input_mode: 'sandbox',
    raw_rules: [`heat > ${Math.max(60, targetZone.threshold - 5)}`, 'source = sandbox'],
  }
}

export function createManualEvent(snapshot, projectId = 'project-spring-2026', zoneId = 'zone-booth-a', summary = '人工补录事件') {
  const zone = snapshot.zones.find((item) => item.zone_id === zoneId)
  const assignee = snapshot.staff.find((item) => item.assigned_zone_id === zoneId) ?? snapshot.staff[0]
  const eventType = zone?.zone_type === 'entry' ? 'entrance_congestion' : zone?.zone_type === 'booth' ? 'booth_heatup' : 'zone_imbalance'
  const signal = {
    signal_id: `sig-manual-${snapshot.signals.length + 1}`,
    project_id: projectId,
    zone_id: zoneId,
    timestamp: new Date('2026-04-08T10:40:00+08:00').toISOString(),
    source: 'manual-console',
    idempotencyKey: `manual-${projectId}-${snapshot.signals.length + 1}`,
    signal_type: 'manual',
    severity: 'high',
    summary,
    confidence: 1,
    input_mode: 'manual',
    raw_rules: ['manual_input = true'],
  }

  return {
    signal,
    event: {
      event_id: `evt-manual-${snapshot.events.length + 1}`,
      project_id: projectId,
      zone_id: zoneId,
      signal_ids: [signal.signal_id],
      timestamp: signal.timestamp,
      source: signal.source,
      idempotencyKey: `event-${signal.idempotencyKey}`,
      event_type: eventType,
      title: '人工补录事件',
      summary,
      severity: 'high',
      status: 'detected',
      priority_score: 88,
      recommended_action: zone?.recommended_action ?? '请主管人工确认并指派处理。',
      recommended_assignee_id: assignee.staff_id,
      reminder_channels: assignee.reminder_channels,
      explanation: '人工补录优先于第三方输入结果。',
      requires_confirmation: false,
    },
  }
}

export function buildTaskFromEvent(snapshot, eventId, assigneeId) {
  const event = snapshot.events.find((item) => item.event_id === eventId)
  if (!event) throw new Error(`Event not found: ${eventId}`)
  const assignee = snapshot.staff.find((item) => item.staff_id === (assigneeId || event.recommended_assignee_id))
  if (!assignee) throw new Error(`Assignee not found: ${assigneeId}`)

  return {
    task_id: `task-auto-${snapshot.tasks.length + 1}`,
    project_id: event.project_id,
    event_id: event.event_id,
    assignee_id: assignee.staff_id,
    task_type: event.event_type === 'entrance_congestion' ? '补位' : event.event_type === 'booth_heatup' ? '支援接待' : '导流',
    title: event.title,
    action_summary: event.recommended_action,
    status: 'created',
    priority: event.severity,
    reminder_channels: assignee.reminder_channels,
    dispatched_at: new Date('2026-04-08T10:37:00+08:00').toISOString(),
    received_at: '',
    processing_at: '',
    completed_at: '',
    retry_count: 0,
    note: `自动派发给 ${assignee.name}`,
  }
}

export function explainEvent(snapshot, eventId) {
  const event = snapshot.events.find((item) => item.event_id === eventId)
  if (!event) throw new Error(`Event not found: ${eventId}`)
  const signal = snapshot.signals.find((item) => event.signal_ids.includes(item.signal_id))
  const assignee = snapshot.staff.find((item) => item.staff_id === event.recommended_assignee_id)
  const strategy = snapshot.strategies.find((item) => item.strategy_id === event.strategy_id)

  return {
    event_id: event.event_id,
    title: event.title,
    summary: event.summary,
    trigger_points: signal?.raw_rules ?? [],
    recommended_action: event.recommended_action,
    why_assignee:
      assignee == null ? '暂无推荐执行人。' : `${assignee.name} 负责相关区域，且提醒通道与技能匹配当前任务。`,
    strategy_summary: strategy ? `${strategy.name}：${strategy.action_summary}` : undefined,
    human_takeover_allowed: true,
  }
}

export function getReplayReport(snapshot, projectId = 'project-spring-2026') {
  const events = snapshot.events.filter((item) => item.project_id === projectId)
  const tasks = snapshot.tasks.filter((item) => item.project_id === projectId)
  const feedback = snapshot.feedback.filter((item) => item.project_id === projectId)

  return {
    report_id: `report-${projectId}`,
    project_id: projectId,
    generated_at: new Date('2026-04-08T18:12:00+08:00').toISOString(),
    summary: `${projectId} 当前累计 ${events.length} 个事件、${tasks.length} 个任务、${feedback.filter((item) => item.type === 'completed').length} 次完成反馈。`,
    metrics: {
      response_minutes: tasks.length ? 3.2 : 0,
      task_completion_rate: tasks.length ? Number((tasks.filter((item) => item.status === 'completed').length / tasks.length).toFixed(2)) : 0,
      dispatch_success_rate: tasks.length ? 1 : 0,
      closed_loop_events: events.filter((item) => item.status === 'closed').length,
      escalation_rate: events.length ? Number((events.filter((item) => item.status === 'escalated').length / events.length).toFixed(2)) : 0,
    },
    highlights: [
      `累计识别 ${events.length} 个现场事件。`,
      `累计生成 ${tasks.length} 个任务。`,
      `累计收到 ${feedback.length} 条执行反馈。`,
    ],
    timeline: [
      ...events.map((item) => ({ at: item.timestamp.slice(11, 16), label: `${item.title} / ${item.summary}` })),
      ...feedback.map((item) => ({ at: item.timestamp.slice(11, 16), label: `${item.type} / ${item.note}` })),
    ],
  }
}

export function saveStrategyFromEvent(snapshot, eventId) {
  const event = snapshot.events.find((item) => item.event_id === eventId)
  if (!event) throw new Error(`Event not found: ${eventId}`)
  return {
    strategy_id: `strategy-auto-${snapshot.strategies.length + 1}`,
    name: `${event.title}沉淀策略`,
    project_id: event.project_id,
    zone_id: event.zone_id,
    action_summary: event.recommended_action,
  }
}

import type {
  AgentGateway,
  DispatchRecommendation,
  EventRecord,
  EventSignal,
  ExpoPilotSnapshot,
  ExplainResult,
  ReviewReport,
} from '../domain/types'

function nextId(prefix: string, count: number) {
  return `${prefix}-${String(count + 1).padStart(3, '0')}`
}

export function buildSimulatedSignal(snapshot: ExpoPilotSnapshot, projectId: string): EventSignal {
  const projectZones = snapshot.zones.filter((zone) => zone.project_id === projectId)
  const existingSignals = snapshot.signals.filter((signal) => signal.project_id === projectId)
  const targetZone = projectZones.sort((left, right) => right.heat - left.heat)[existingSignals.length % Math.max(projectZones.length, 1)]
  const inputMode = snapshot.dataSources.find((source) => source.zone_id === targetZone.zone_id)?.mode ?? 'sandbox'
  const signalType =
    targetZone.zone_type === 'entry' ? 'entrance_congestion' : targetZone.zone_type === 'booth' ? 'booth_heatup' : 'zone_imbalance'

  return {
    signal_id: nextId('sig-auto', snapshot.signals.length),
    project_id: projectId,
    zone_id: targetZone.zone_id,
    timestamp: new Date().toISOString(),
    source: 'simulator',
    idempotencyKey: `simulator-${projectId}-${Date.now()}`,
    signal_type: signalType,
    severity: targetZone.heat > 85 ? 'critical' : 'high',
    summary:
      signalType === 'entrance_congestion'
        ? `${targetZone.name} 出现新一轮入口拥堵，建议立刻补位。`
        : signalType === 'booth_heatup'
          ? `${targetZone.name} 热度持续上升，建议补充接待承接。`
          : `${targetZone.name} 出现区域失衡迹象，建议尽快导流。`,
    confidence: 0.83,
    input_mode: inputMode,
    raw_rules: [`heat > ${Math.max(60, targetZone.threshold - 5)}`, 'source = sandbox'],
  }
}

function resolveEvent(snapshot: ExpoPilotSnapshot, signal: EventSignal): EventRecord {
  const zone = snapshot.zones.find((item) => item.zone_id === signal.zone_id)
  const assignee = snapshot.staff.find((item) => item.assigned_zone_id === signal.zone_id) ?? snapshot.staff[0]
  const strategy = snapshot.strategies.find((item) => item.zone_id === signal.zone_id && item.status === 'active')
  const eventType =
    signal.signal_type === 'manual'
      ? zone?.zone_type === 'entry'
        ? 'entrance_congestion'
        : zone?.zone_type === 'booth'
          ? 'booth_heatup'
          : 'zone_imbalance'
      : signal.signal_type
  const recommendedAction =
    eventType === 'entrance_congestion'
      ? '安排执行人员 1 立刻补位，打开备用检票通道并疏导排队。'
      : eventType === 'booth_heatup'
        ? '安排展台接待 1 支援接待，优先承接高停留访客。'
        : '安排执行人员进行导流，平衡主通道与展台区域压力。'
  const title = eventType === 'entrance_congestion' ? '入口拥堵' : eventType === 'booth_heatup' ? '展台升温' : '区域失衡'

  return {
    event_id: nextId('evt-auto', snapshot.events.length),
    project_id: signal.project_id,
    zone_id: signal.zone_id,
    signal_ids: [signal.signal_id],
    timestamp: signal.timestamp,
    source: signal.source,
    idempotencyKey: `resolved-${signal.idempotencyKey}`,
    event_type: eventType,
    title,
    summary: signal.summary,
    severity: signal.severity,
    status: 'detected',
    priority_score: signal.severity === 'critical' ? 95 : 82,
    recommended_action: zone?.recommended_action ?? recommendedAction,
    recommended_assignee_id: assignee.staff_id,
    reminder_channels: strategy?.reminder_channels ?? assignee.reminder_channels,
    explanation: `系统根据 ${zone?.name ?? '目标区域'} 的阈值、输入健康度和历史策略生成此事件。`,
    strategy_id: strategy?.strategy_id,
    requires_confirmation: signal.severity === 'critical' || signal.input_mode !== 'realtime',
  }
}

function recommendDispatch(snapshot: ExpoPilotSnapshot, eventId: string, assigneeId?: string): DispatchRecommendation {
  const event = snapshot.events.find((item) => item.event_id === eventId)
  if (!event) throw new Error(`Event not found: ${eventId}`)

  const resolvedAssigneeId = assigneeId || event.recommended_assignee_id
  const assignee = snapshot.staff.find((item) => item.staff_id === resolvedAssigneeId)
  if (!assignee) throw new Error(`Assignee not found: ${resolvedAssigneeId}`)

  return {
    assignee_id: assignee.staff_id,
    note: `建议优先派给 ${assignee.name}，原因是其当前位于关联区域且提醒通道可用。`,
    reminder_channels: assignee.reminder_channels,
  }
}

export function explainEvent(snapshot: ExpoPilotSnapshot, eventId: string): ExplainResult {
  const event = snapshot.events.find((item) => item.event_id === eventId)
  if (!event) throw new Error(`Event not found: ${eventId}`)
  const signal = snapshot.signals.find((item) => event.signal_ids.includes(item.signal_id))
  const strategy = snapshot.strategies.find((item) => item.strategy_id === event.strategy_id)
  const assignee = snapshot.staff.find((item) => item.staff_id === event.recommended_assignee_id)

  return {
    trigger_points: signal?.raw_rules ?? [],
    recommended_action: event.recommended_action,
    why_assignee:
      assignee == null
        ? '当前没有明确推荐执行人，建议主管手动指派。'
        : `${assignee.name} 负责关联区域，具备 ${assignee.skills.join('、')} 能力，并支持 ${assignee.reminder_channels.length} 条提醒通道。`,
    human_takeover_allowed: true,
    strategy_summary: strategy ? `${strategy.name}：${strategy.action_summary}` : undefined,
  }
}

function buildReplay(snapshot: ExpoPilotSnapshot, projectId: string): ReviewReport | undefined {
  const project = snapshot.projects.find((item) => item.project_id === projectId)
  if (!project) return undefined

  const events = snapshot.events.filter((item) => item.project_id === projectId)
  const tasks = snapshot.tasks.filter((item) => item.project_id === projectId)
  const feedback = snapshot.feedback.filter((item) => item.project_id === projectId)
  const completedTasks = tasks.filter((item) => item.status === 'completed')
  const responseMinutes =
    completedTasks.length === 0
      ? 0
      : Number(
          (
            completedTasks.reduce((sum, task) => sum + (new Date(task.completed_at).getTime() - new Date(task.dispatched_at).getTime()) / 60000, 0) /
            completedTasks.length
          ).toFixed(1),
        )

  return {
    report_id: `report-${projectId}`,
    project_id: projectId,
    generated_at: new Date().toISOString(),
    summary: `${project.title} 当前累计 ${events.length} 个事件、${tasks.length} 个任务、${feedback.filter((item) => item.type === 'completed').length} 次完成反馈。`,
    metrics: {
      response_minutes: responseMinutes,
      task_completion_rate: tasks.length === 0 ? 0 : Number((completedTasks.length / tasks.length).toFixed(2)),
      dispatch_success_rate: tasks.length === 0 ? 0 : 1,
      closed_loop_events: events.filter((item) => item.status === 'closed').length,
      escalation_rate: events.length === 0 ? 0 : Number((events.filter((item) => item.status === 'escalated').length / events.length).toFixed(2)),
    },
    highlights: [
      `累计识别 ${events.length} 个现场事件。`,
      `累计生成 ${tasks.length} 个任务。`,
      `累计回收 ${feedback.length} 条执行反馈。`,
    ],
    timeline: [
      ...events.map((event) => ({ at: event.timestamp.slice(11, 16), label: `${event.title} / ${event.summary}` })),
      ...feedback.map((item) => ({ at: item.timestamp.slice(11, 16), label: `${item.type} / ${item.note}` })),
    ].sort((left, right) => left.at.localeCompare(right.at)),
  }
}

function suggestStrategyName(snapshot: ExpoPilotSnapshot, eventId: string) {
  const event = snapshot.events.find((item) => item.event_id === eventId)
  if (!event) return '现场处置新策略'
  return `${event.title}沉淀策略`
}

export const localAgentGateway: AgentGateway = {
  descriptor: {
    provider: 'local-mock',
    version: 'v15',
    signal_provider: 'zone-heat-simulator',
    event_resolver: 'priority-threshold-resolver',
    dispatch_advisor: 'staff-skill-and-channel-matcher',
    explain_provider: 'rule-and-strategy-explainer',
    replay_provider: 'static-report-builder',
    strategy_advisor: 'replay-strategy-namer',
  },
  simulateSignal: buildSimulatedSignal,
  resolveEvent,
  recommendDispatch,
  explainEvent,
  buildReplay,
  suggestStrategyName,
}

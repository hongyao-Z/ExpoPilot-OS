import { useEffect, useMemo, useState } from 'react'
import type { AuditLog, EventOperationalItem, Project, ReviewReport, RoleType, Session, UiFeedbackState } from '../domain/types'
import { auditActionLabel, feedbackClassName, formatDateTime, formatPercent, severityLabel } from '../lib/format'
import { getEventActionDefinition, isEventActionKey } from '../lib/event-action-catalog'
import type { EventActionCategory } from '../lib/event-action-catalog'
import { getFeedbackStatusLabel, getLatestFeedbackByTaskId } from '../lib/staff-feedback'
import { getPriorityLabel, listPriorityQueueItems } from '../lib/priority-queue'
import { buildTaskLifecycle, getDemoTaskLifecycleById, getTaskLifecycleStateLabel } from '../lib/task-lifecycle'
import type { TaskLifecycleStepView, TaskLifecycleViewModel } from '../lib/task-lifecycle'
import { getVenueEventDefinition, isVenueEventType } from '../lib/venue-event-types'
import { getMonitorSourceById, type MonitorSource } from '../lib/monitor-sources'
import { listMonitoringAlerts, type MonitoringAlert, type MonitoringAlertSeverity } from '../lib/monitoring-alerts'
import { getEventReviewByAlertId, getReviewRiskLabel, type EventReviewAgentDecision, type ReviewHandlingDecision } from '../lib/event-review-agent'
import {
  getBackupAssignees,
  getDispatchRecommendationByReviewId,
  getPrimaryAssignee,
  type DispatchAgentRecommendation,
  type ManagerConfirmationStatus,
} from '../lib/dispatch-agent'
import { listDemoCollaborationRecords } from '../lib/agent-collaboration-model'
import { getStaffById } from '../lib/staff-pool'
import type { StaffPoolMember, StaffRole } from '../lib/staff-pool'
import { getVenueZoneById } from '../lib/venue-zones'
import type { VenueZone } from '../lib/venue-zones'
import { getDemoTaskStatusLabel, readDemoState, subscribeDemoState, type DemoState, type DemoTaskStatus } from '../lib/demo-state'
import { getReplay, getRuntimeSourceLabel, resetDemo } from '../lib/api-client'
import { demoGuideTotalSteps, getNextDemoPath, inferDemoGuideStep } from '../lib/demo-guide'
import type { RouteState } from '../lib/router'
import { AppFrame } from './AppFrame'

type ResolvedRole = StaffRole | 'unmapped'

interface ReplayTaskChainItem {
  key: string
  label: string
  time: string
  detail: string
  state: TaskLifecycleStepView['state']
}

interface ReplayAgentStep {
  stepId: string
  label: string
  timestampLabel: string
  detail: string
  status: 'done' | 'current' | 'pending'
}

interface ReplayManagerConfirmationView {
  statusLabel: string
  ownerLabel: string
  detail: string
}

interface ReplayMonitoringEvidenceView {
  evidenceId: string
  label: string
  detail: string
  sourceLabel: string
  confidenceLabel: string
}

interface DualAgentReplaySummary {
  alert: MonitoringAlert | null
  source: MonitorSource | null
  review: EventReviewAgentDecision | null
  dispatch: DispatchAgentRecommendation | null
  managerConfirmation: ReplayManagerConfirmationView
  evidence: ReplayMonitoringEvidenceView[]
  steps: ReplayAgentStep[]
}

const ROLE_LABELS: Record<ResolvedRole, string> = {
  entrance_guide: '入口引导',
  registration_volunteer: '签到接待',
  floor_coordinator: '场馆协调',
  booth_reception: '展台接待',
  service_desk_agent: '服务台',
  stage_operator: '舞台执行',
  technical_support: '技术支持',
  security_guard: '安保',
  supervisor: '主管',
  unmapped: '未匹配角色',
}

const CATEGORY_LABELS: Record<EventActionCategory, string> = {
  staffing: '人员调度',
  flow_control: '动线控制',
  communication: '信息通知',
  technical: '技术处理',
  escalation: '升级处理',
}

const MONITORING_SEVERITY_LABELS: Record<MonitoringAlertSeverity, string> = {
  critical: '告红',
  high: '高',
  medium: '中',
  low: '低',
}

const REVIEW_CONFIDENCE_LABELS = {
  high_confidence: '高置信度',
  medium_confidence: '中置信度',
  low_confidence: '低置信度',
} as const

const REVIEW_HANDLING_LABELS: Record<ReviewHandlingDecision, string> = {
  handle_required: '需要处理',
  watch_required: '持续观察',
  no_action_required: '无需处理',
}

const MANAGER_CONFIRMATION_LABELS: Record<ManagerConfirmationStatus, string> = {
  pending_manager_confirmation: '等待项目经理确认',
  confirmed_for_demo: '已确认',
  rejected_by_manager: '已驳回',
  manual_review_required: '需人工复核',
}

const REPORT_METRICS = [
  { label: '事件等级', value: '中高风险' },
  { label: '处理结果', value: '已反馈' },
  { label: '总用时', value: '5分40秒' },
  { label: '响应时间', value: '42秒' },
  { label: '人工接管', value: '0' },
  { label: 'fallback', value: '0' },
  { label: '审计状态', value: '已归档' },
] as const

const REPORT_SUMMARY =
  '本次入口 A 拥堵事件从识别到派发用时 42 秒，工作人员 3 分 20 秒到达现场，5 分钟内完成分流。系统未触发 fallback，未发生人工接管，建议将该处理流程沉淀为入口拥堵预案。'

const EVIDENCE_CHAIN_ITEMS = [
  { label: '视觉信号', detail: '入口 A 人流密度持续上升。' },
  { label: '排队长度', detail: '队列长度超过预设阈值，队尾开始外溢。' },
  { label: '设备状态', detail: '闸机 / 通道设备状态正常，排除设备停摆。' },
  { label: '现场反馈', detail: '入口引导员反馈入口压力增大，需要协助分流。' },
  { label: '风险判断', detail: '短时拥堵风险上升，需要引导观众进入备用通道。' },
] as const

const DECISION_CHAIN_ITEMS = [
  { label: 'EventReviewAgent 判断', detail: '入口 A 存在人流拥堵风险。' },
  { label: 'DispatchAgent 建议', detail: '增派入口引导员协助分流。' },
  { label: '建议理由', detail: '距离近、岗位匹配、当前负载低。' },
  { label: '备选方案', detail: '安保协同支援，持续观察备用通道压力。' },
  { label: '项目经理确认', detail: '已确认，10:07 进入任务执行。' },
] as const

const EXECUTION_CHAIN_ITEMS = [
  { label: '任务创建', time: '10:06', detail: '生成入口 A 人流拥堵引导任务。' },
  { label: '任务派发', time: '10:06', detail: '派发给入口引导员 A。' },
  { label: '工作人员接收', time: '10:07', detail: '入口引导员 A 确认接收。' },
  { label: '到达现场', time: '10:08', detail: '工作人员到达 A1 主入口。' },
  { label: '开始处理', time: '10:09', detail: '引导观众前往备用通道。' },
  { label: '完成反馈', time: '10:11', detail: '排队长度下降，需要继续观察。' },
  { label: '归档', time: '10:12', detail: '系统写入审计记录，可进入复盘。' },
] as const

const DEMO_EXECUTION_STATUS_ORDER: DemoTaskStatus[] = [
  'pending_approval',
  'dispatched',
  'accepted',
  'en_route',
  'in_progress',
  'feedback_submitted',
  'archived',
]

function hasReachedDemoStatus(current: DemoTaskStatus, target: DemoTaskStatus) {
  return DEMO_EXECUTION_STATUS_ORDER.indexOf(current) >= DEMO_EXECUTION_STATUS_ORDER.indexOf(target)
}

function buildDecisionChainItems(demoState: DemoState) {
  return DECISION_CHAIN_ITEMS.map((item) => {
    if (item.label !== '项目经理确认') return item

    return {
      ...item,
      detail: demoState.dispatchConfirmed
        ? '项目经理已确认派发入口引导员，任务进入已派发状态。'
        : '等待项目经理确认；DispatchAgent 只提供建议，不直接派发。',
    }
  })
}

function buildExecutionChainItems(demoState: DemoState) {
  const feedbackDetail = demoState.lastFeedbackText || '等待工作人员提交现场反馈。'

  return [
    { ...EXECUTION_CHAIN_ITEMS[0], status: 'done' },
    {
      ...EXECUTION_CHAIN_ITEMS[1],
      detail: hasReachedDemoStatus(demoState.taskStatus, 'dispatched') ? '项目经理已确认，任务派发给入口引导员 A。' : '等待项目经理确认派发。',
      status: hasReachedDemoStatus(demoState.taskStatus, 'dispatched') ? 'done' : 'pending',
    },
    {
      ...EXECUTION_CHAIN_ITEMS[2],
      detail: hasReachedDemoStatus(demoState.taskStatus, 'accepted') ? '入口引导员 A 已接收任务。' : '等待工作人员确认接收。',
      status: hasReachedDemoStatus(demoState.taskStatus, 'accepted') ? 'done' : 'pending',
    },
    {
      ...EXECUTION_CHAIN_ITEMS[3],
      detail: hasReachedDemoStatus(demoState.taskStatus, 'en_route') ? '入口引导员 A 已前往入口 A 分流点。' : '等待工作人员到达现场。',
      status: hasReachedDemoStatus(demoState.taskStatus, 'en_route') ? 'done' : 'pending',
    },
    {
      ...EXECUTION_CHAIN_ITEMS[4],
      detail: hasReachedDemoStatus(demoState.taskStatus, 'in_progress') ? '工作人员正在引导观众前往备用通道。' : '等待现场开始处理。',
      status: hasReachedDemoStatus(demoState.taskStatus, 'in_progress') ? 'current' : 'pending',
    },
    {
      ...EXECUTION_CHAIN_ITEMS[5],
      detail: hasReachedDemoStatus(demoState.taskStatus, 'feedback_submitted') ? feedbackDetail : '等待工作人员提交完成反馈。',
      status: hasReachedDemoStatus(demoState.taskStatus, 'feedback_submitted') ? 'done' : 'pending',
    },
    {
      ...EXECUTION_CHAIN_ITEMS[6],
      detail: hasReachedDemoStatus(demoState.taskStatus, 'archived') ? '任务已进入复盘归档。' : '等待复盘归档。',
      status: hasReachedDemoStatus(demoState.taskStatus, 'archived') ? 'done' : 'pending',
    },
  ] as const
}

const RESPONSIBILITY_CHAIN_ITEMS = [
  { label: '系统识别异常', owner: 'ExpoPilot OS', detail: '入口 A 监控源触发拥堵判断。' },
  { label: '审核解释', owner: 'EventReviewAgent', detail: '说明异常、证据和风险等级。' },
  { label: '派发建议', owner: 'DispatchAgent', detail: '给出动作、主执行人和备选人。' },
  { label: '确认权', owner: '项目经理', detail: '确认后才进入任务状态流。' },
  { label: '现场执行', owner: '入口引导员', detail: '接收、到达、处理并反馈。' },
  { label: '系统归档', owner: '审计记录', detail: '记录证据、责任和处理结果。' },
] as const

const PLAYBOOK_ITEMS = [
  { label: '事件类型', value: '入口拥堵' },
  { label: '触发条件', value: '人流密度上升 + 排队长度异常' },
  { label: '推荐动作', value: '增派引导员 + 调整入口动线' },
  { label: '推荐岗位', value: '入口引导 / 安保协同' },
  { label: '最佳响应时间', value: '5 分钟内' },
  { label: '注意事项', value: '优先分流，不要直接封闭入口' },
] as const

export function ReplayPage(props: {
  activeProject?: Project
  auditLogs: AuditLog[]
  events: EventOperationalItem[]
  report?: ReviewReport
  role: RoleType
  session: Session | null
  onNavigate: (route: RouteState) => void
  onLogout: () => void
  onExportReport: (projectId?: string) => void
  onSaveStrategy: (eventId: string) => void
  feedback?: UiFeedbackState | null
}) {
  const [severityFilter, setSeverityFilter] = useState('all')
  const [operatorFilter, setOperatorFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [taskStatusFilter, setTaskStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [demoState, setDemoState] = useState(readDemoState)
  const [demoNotice, setDemoNotice] = useState('')
  const [demoSourceLabel, setDemoSourceLabel] = useState(getRuntimeSourceLabel('local'))
  const [selectedEventId, setSelectedEventId] = useState<string | null>(props.events[0]?.event.event_id ?? null)

  useEffect(() => {
    let cancelled = false

    getReplay().then((result) => {
      if (cancelled) return
      setDemoState(result.data.state)
      setDemoSourceLabel(getRuntimeSourceLabel(result.source))
    })

    const unsubscribe = subscribeDemoState((nextState) => {
      setDemoState(nextState)
      setDemoSourceLabel(getRuntimeSourceLabel('local'))
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const replayStats = useMemo(() => {
    const sortedEvents = getSortedEvents(props.events)
    const eventCount = sortedEvents.length
    const taskCount = sortedEvents.filter((item) => item.task).length
    const completedFeedbackCount = sortedEvents.filter(
      (item) => item.task?.status === 'completed' || item.latest_feedback?.type === 'completed',
    ).length
    const escalatedCount = sortedEvents.filter(
      (item) => item.task?.status === 'exception' || item.event.status === 'escalated',
    ).length

    const completedResponseMinutes = sortedEvents
      .filter(
        (item) =>
          item.task?.dispatched_at &&
          item.latest_feedback_at &&
          (item.task.status === 'completed' || item.latest_feedback?.type === 'completed'),
      )
      .map((item) => {
        const dispatchedAt = new Date(item.task!.dispatched_at).getTime()
        const completedAt = new Date(item.latest_feedback_at!).getTime()
        return (completedAt - dispatchedAt) / 1000 / 60
      })

    const responseMinutes =
      completedResponseMinutes.length > 0
        ? Number((completedResponseMinutes.reduce((sum, value) => sum + value, 0) / completedResponseMinutes.length).toFixed(1))
        : 0

    const zoneBreakdown = buildZoneBreakdown(sortedEvents)
    const eventBreakdown = buildEventBreakdown(sortedEvents)
    const roleBreakdown = buildRoleBreakdown(sortedEvents)
    const uniqueZoneCount = zoneBreakdown.length
    const uniqueEventTypeCount = eventBreakdown.length
    const dispatchSuccessRate = eventCount === 0 ? 0 : taskCount / eventCount
    const taskCompletionRate = taskCount === 0 ? 0 : completedFeedbackCount / taskCount
    const escalationRate = eventCount === 0 ? 0 : escalatedCount / eventCount
    const fallbackCount = sortedEvents.filter((item) => item.source_mode === 'unknown' || item.latest_feedback?.type === 'exception').length
    const highestRiskZone = getHighestRiskZone(sortedEvents)

    const summary =
      eventCount === 0
        ? '当前项目暂无可复盘事件。'
        : `已复盘 ${eventCount} 个事件，覆盖 ${uniqueZoneCount} 个区域、${uniqueEventTypeCount} 类事件，任务完成率 ${formatPercent(taskCompletionRate)}。`

    const highlights = [
      `区域 ${uniqueZoneCount} 个`,
      `事件类型 ${uniqueEventTypeCount} 类`,
      `调度成功 ${formatPercent(dispatchSuccessRate)}`,
      `升级率 ${formatPercent(escalationRate)}`,
    ]

    const timeline = sortedEvents.flatMap((item) => {
      const definition = getEventDefinition(item)
      const action = getActionDefinition(item)
      const rows = [
        {
          at: formatDateTime(item.event.timestamp),
          label: `事件触发 / ${definition?.label ?? item.event.event_type} / ${item.zone_name}`,
        },
      ]

      if (item.task) {
        rows.push({
          at: formatDateTime(item.task.dispatched_at),
          label: `任务派发 / ${action?.label ?? item.task.task_type} / ${item.assignee_name ?? item.task.assignee_id}`,
        })
      }

      if (item.latest_feedback_at) {
        rows.push({ at: formatDateTime(item.latest_feedback_at), label: `执行反馈 / ${item.latest_feedback_label}` })
      }

      return rows
    })

    const generatedAt =
      sortedEvents.at(-1)?.latest_feedback_at ?? sortedEvents.at(-1)?.task?.dispatched_at ?? sortedEvents.at(-1)?.event.timestamp

    return {
      eventCount,
      taskCount,
      completedFeedbackCount,
      escalatedCount,
      summary,
      highlights,
      timeline,
      generatedAt,
      zoneBreakdown,
      eventBreakdown,
      roleBreakdown,
      replaySummary: {
        averageResponseMinutes: responseMinutes,
        completedTasks: completedFeedbackCount,
        manualTakeoverCount: escalatedCount,
        fallbackCount,
        highestRiskZone,
      },
      metrics: {
        response_minutes: responseMinutes,
        task_completion_rate: taskCompletionRate,
        dispatch_success_rate: dispatchSuccessRate,
        escalation_rate: escalationRate,
      },
    }
  }, [props.events])

  const zoneOptions = useMemo(() => {
    return Array.from(
      new Map(
        props.events.map((item) => [
          item.event.zone_id,
          {
            value: item.event.zone_id,
            label: getZoneLabel(item),
          },
        ]),
      ).values(),
    )
  }, [props.events])

  const eventTypeOptions = useMemo(() => {
    return Array.from(new Set(props.events.map((item) => item.event.event_type))).map((eventType) => ({
      value: eventType,
      label: getEventTypeLabel(eventType),
    }))
  }, [props.events])

  const roleOptions = useMemo(() => {
    return Array.from(new Set(props.events.map((item) => getResolvedRole(item)))).map((role) => ({
      value: role,
      label: ROLE_LABELS[role],
    }))
  }, [props.events])

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return props.events.filter((item) => {
      const eventDefinition = getEventDefinition(item)
      const actionDefinition = getActionDefinition(item)
      const staff = getEventStaff(item)
      const role = getResolvedRole(item)
      const severityMatched = severityFilter === 'all' || item.event.severity === severityFilter
      const statusMatched = statusFilter === 'all' || item.event.status === statusFilter || item.operational_state === statusFilter
      const zoneMatched = zoneFilter === 'all' || item.event.zone_id === zoneFilter
      const eventTypeMatched = eventTypeFilter === 'all' || item.event.event_type === eventTypeFilter
      const roleMatched = roleFilter === 'all' || role === roleFilter
      const taskStatusMatched = taskStatusFilter === 'all' || item.task?.status === taskStatusFilter || item.operational_state === taskStatusFilter
      const priorityMatched = priorityFilter === 'all' || item.event.severity === priorityFilter || item.task?.priority === priorityFilter
      const queryText = [
        item.event.title,
        item.event.summary,
        item.zone_name,
        item.event.event_type,
        eventDefinition?.label,
        eventDefinition?.description,
        actionDefinition?.label,
        actionDefinition?.description,
        staff?.displayName,
        staff?.team,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const queryMatched = normalizedQuery.length === 0 || queryText.includes(normalizedQuery)

      return severityMatched && statusMatched && zoneMatched && eventTypeMatched && roleMatched && taskStatusMatched && priorityMatched && queryMatched
    })
  }, [eventTypeFilter, priorityFilter, props.events, query, roleFilter, severityFilter, statusFilter, taskStatusFilter, zoneFilter])

  const filteredEventTargetIds = useMemo(() => {
    return new Set(filteredEvents.flatMap((item) => [item.event.event_id, item.task?.task_id].filter(Boolean) as string[]))
  }, [filteredEvents])

  const filteredLogs = useMemo(() => {
    const eventFiltersActive =
      severityFilter !== 'all' || statusFilter !== 'all' || zoneFilter !== 'all' || eventTypeFilter !== 'all' || roleFilter !== 'all' || query.trim()

    return props.auditLogs.filter((log) => {
      const operatorMatched = operatorFilter === 'all' || log.operator_id === operatorFilter
      const eventMatched = !eventFiltersActive || filteredEventTargetIds.has(log.target_id)
      return operatorMatched && eventMatched
    })
  }, [eventTypeFilter, filteredEventTargetIds, operatorFilter, props.auditLogs, query, roleFilter, severityFilter, statusFilter, zoneFilter])

  const selectedEvent = useMemo(
    () => filteredEvents.find((item) => item.event.event_id === selectedEventId) ?? filteredEvents[0] ?? props.events[0],
    [filteredEvents, props.events, selectedEventId],
  )

  const selectedEventDefinition = selectedEvent ? getEventDefinition(selectedEvent) : null
  const selectedActionDefinition = selectedEvent ? getActionDefinition(selectedEvent) : null
  const selectedStaff = selectedEvent ? getEventStaff(selectedEvent) : null
  const selectedZone = selectedEvent ? getZone(selectedEvent) : null
  const selectedTaskLifecycle =
    selectedEvent?.task ? buildTaskLifecycle(selectedEvent.task, selectedEvent.latest_feedback ? [selectedEvent.latest_feedback] : []) : null
  const selectedDemoTask = selectedEvent?.task ? getDemoTaskLifecycleById(selectedEvent.task.task_id) : null
  const selectedDemoFeedback = selectedDemoTask ? getLatestFeedbackByTaskId(selectedDemoTask.taskId) : null
  const selectedPriorityItem = selectedEvent
    ? listPriorityQueueItems().find((item) => item.eventType === selectedEvent.event.event_type || item.taskId === selectedDemoTask?.taskId)
    : undefined
  const selectedAuditLogs = selectedEvent
    ? filteredLogs.filter((log) => log.target_id === selectedEvent.event.event_id || log.target_id === selectedEvent.task?.task_id)
    : []
  const selectedAuditSummary = selectedEvent ? buildSelectedAuditSummary(selectedAuditLogs) : '暂无审计记录'
  const selectedTaskChain = selectedEvent ? buildReplayTaskChain(selectedEvent, selectedTaskLifecycle) : []
  const selectedDualAgentReplay = selectedEvent ? buildDualAgentReplaySummary(selectedEvent) : null
  const selectedCollaborationRecords = selectedDualAgentReplay
    ? listDemoCollaborationRecords({
        alert: selectedDualAgentReplay.alert,
        review: selectedDualAgentReplay.review,
        dispatch: selectedDualAgentReplay.dispatch,
      })
    : []
  const selectedReplayTimeline = selectedEvent
    ? buildReplayMonitoringTimeline(selectedEvent, selectedTaskLifecycle, selectedDemoFeedback, selectedAuditLogs, selectedDualAgentReplay)
    : replayStats.timeline
  const operators = useMemo(() => Array.from(new Set(props.auditLogs.map((log) => log.operator_id))), [props.auditLogs])
  const replayReportMetrics = [
    ...REPORT_METRICS,
    { label: '当前任务状态', value: getDemoTaskStatusLabel(demoState.taskStatus) },
  ] as const
  const decisionChainItems = buildDecisionChainItems(demoState)
  const executionChainItems = buildExecutionChainItems(demoState)
  const replayGuideStep = inferDemoGuideStep('replay', demoState)
  const replayNextPath = getNextDemoPath('replay', demoState)
  const replayHasFeedback = hasReachedDemoStatus(demoState.taskStatus, 'feedback_submitted')

  const handleResetDemoState = async () => {
    const result = await resetDemo()
    setDemoState(result.data)
    setDemoSourceLabel(getRuntimeSourceLabel(result.source))
    setDemoNotice('演示状态已重置，可从 LivePage 重新确认派发。')
  }

  return (
    <AppFrame
      activeProject={props.activeProject}
      current={{ page: 'replay', projectId: props.activeProject?.project_id }}
      onLogout={props.onLogout}
      onNavigate={props.onNavigate}
      role={props.role}
      session={props.session}
      actions={
        <>
          <button className="ghost-button" onClick={() => props.onExportReport(props.activeProject?.project_id)}>
            导出日志
          </button>
          <button onClick={() => setReplayPlaying((current) => !current)}>{replayPlaying ? '暂停回放' : '开始回放'}</button>
        </>
      }
      title="审计与复盘"
      subtitle="按区域、事件类型与人员角色复盘现场处置过程。"
    >
      <section className="replay-board">
        {props.feedback?.kind && props.feedback.kind !== 'idle' ? (
          <article className={`panel feedback-banner ${feedbackClassName(props.feedback)}`}>{props.feedback.message}</article>
        ) : null}

        <section className="replay-report-hero" id="replay-summary" aria-label="复盘报告摘要">
          <div className="replay-report-title">
            <span className="eyebrow">复盘报告摘要</span>
            <h2>入口 A 人流拥堵处置复盘</h2>
            <small>本页用于回看入口 A 拥堵事件的识别、决策、执行与预案整理过程。</small>
            <p>{REPORT_SUMMARY}</p>
          </div>
          <div className="replay-report-metrics">
            {replayReportMetrics.map((metric) => (
              <article key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="demo-guide-card demo-guide-card--replay" aria-label="复盘演示引导">
          <div className="demo-guide-progress">
            <span>演示进度 {replayGuideStep.order} / {demoGuideTotalSteps}</span>
            <strong>{replayGuideStep.title}</strong>
          </div>
          <p>
            {replayHasFeedback
              ? '任务已反馈，可将本次处置沉淀为入口拥堵预案。'
              : '当前任务尚未完成反馈，可先在 Mobile H5 完成处理流程。'}
          </p>
          <div className="demo-guide-status">
            <span>当前状态：{getDemoTaskStatusLabel(demoState.taskStatus)}</span>
            <span>当前事件：{demoState.eventName}</span>
          </div>
          <div className="demo-guide-actions">
            {replayHasFeedback ? (
              <a className="demo-guide-action" href="#replay-playbook">查看经验沉淀</a>
            ) : (
              <button type="button" onClick={() => { window.location.hash = '#/mobile' }}>
                打开工作人员任务端
              </button>
            )}
            <button type="button" onClick={() => { window.location.hash = replayNextPath || '#/project/project-spring-2026/live' }}>
              回到实时监控
            </button>
            <button className="demo-guide-reset" type="button" onClick={handleResetDemoState}>
              重置演示状态
            </button>
          </div>
          <small className="demo-guide-muted">当前使用：{demoSourceLabel}；本页用于回看入口 A 拥堵事件的识别、决策、执行和沉淀过程。</small>
          {demoNotice ? <small className="demo-guide-notice">{demoNotice}</small> : null}
        </section>

        <nav className="replay-report-nav" aria-label="复盘报告导航">
          <a href="#replay-summary">复盘摘要</a>
          <a href="#replay-evidence">证据链</a>
          <a href="#replay-decision">决策链</a>
          <a href="#replay-execution">执行链</a>
          <a href="#replay-responsibility">责任链</a>
          <a href="#replay-playbook">经验沉淀</a>
        </nav>

        <section className="replay-report-grid" aria-label="证据链与决策链">
          <ReportChainCard anchorId="replay-evidence" eyebrow="01 证据链" title="为什么判断异常" items={EVIDENCE_CHAIN_ITEMS} />
          <ReportChainCard anchorId="replay-decision" eyebrow="02 决策链" title="Agent 建议与经理确认" items={decisionChainItems} />
        </section>

        <section className="replay-execution-panel" id="replay-execution" aria-label="执行链">
          <div className="replay-section-head">
            <div>
              <span>03 执行链</span>
              <h3>从任务派发到完成反馈</h3>
            </div>
            <small>入口 A / 5 分钟内完成分流</small>
          </div>
          <div className="replay-execution-track">
            {executionChainItems.map((item, index) => (
              <article className={`replay-execution-step replay-execution-step--${item.status}`} key={item.label}>
                <span>{item.time}</span>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
                <i>{index + 1}</i>
              </article>
            ))}
          </div>
        </section>

        <section className="replay-demo-state-panel" aria-label="演示状态记录">
          <div className="replay-section-head">
            <div>
              <span>{demoSourceLabel}</span>
              <h3>{demoState.eventName}</h3>
            </div>
            <button className="ghost-button" onClick={handleResetDemoState} type="button">重置演示状态</button>
          </div>
          <div className="replay-demo-state-summary">
            <span>项目经理确认：{demoState.dispatchConfirmed ? '已确认' : '待确认'}</span>
            <span>任务状态：{getDemoTaskStatusLabel(demoState.taskStatus)}</span>
            <span>执行人：{demoState.assigneeName}</span>
          </div>
          {demoState.taskStatus === 'feedback_submitted' || demoState.taskStatus === 'archived' ? (
            <p className="replay-demo-feedback">最新反馈：{demoState.lastFeedbackText}</p>
          ) : null}
          <div className="replay-demo-history-list">
            {demoState.history.slice(-6).map((entry) => (
              <article key={entry.id}>
                <span>{entry.timestampLabel}</span>
                <strong>{entry.label}</strong>
                <small>{entry.actorLabel} / {getDemoTaskStatusLabel(entry.status)}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="replay-report-grid replay-report-grid--wide" aria-label="责任链与经验沉淀">
          <article className="replay-responsibility-panel" id="replay-responsibility">
            <div className="replay-section-head">
              <div>
                <span>04 责任链</span>
                <h3>谁确认、谁处理、谁反馈</h3>
              </div>
              <small>全程可追溯</small>
            </div>
            <div className="replay-responsibility-list">
              {RESPONSIBILITY_CHAIN_ITEMS.map((item) => (
                <div key={item.label}>
                  <span>{item.owner}</span>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="replay-playbook-card" id="replay-playbook">
            <div className="replay-section-head">
              <div>
                <span>05 经验沉淀</span>
                <h3>沉淀为预案模板</h3>
              </div>
              <small>静态演示</small>
            </div>
            <div className="replay-playbook-list">
              {PLAYBOOK_ITEMS.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <button type="button">沉淀为预案模板</button>
            <p className="replay-playbook-note">演示态：该动作会将本次处置流程归档为入口拥堵预案。</p>
          </article>
        </section>

        <section className="replay-header-panel">
          <div>
            <span className="eyebrow">审计复盘</span>
            <h2>{replayStats.summary}</h2>
            <div className="chip-row">
              {replayStats.highlights.map((item) => (
                <span className="chip" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="replay-kpi-grid">
            <MetricCard label="事件数" value={`${replayStats.eventCount} 个`} />
            <MetricCard label="任务数" value={`${replayStats.taskCount} 个`} />
            <MetricCard label="完成反馈" value={`${replayStats.completedFeedbackCount} 次`} />
            <MetricCard label="平均响应" value={`${replayStats.metrics.response_minutes} 分钟`} />
          </div>
        </section>

        <section className="replay-insight-grid" aria-label="多事件复盘概览">
          <BreakdownCard title="区域覆盖" items={replayStats.zoneBreakdown} />
          <BreakdownCard title="事件类型" items={replayStats.eventBreakdown} />
          <BreakdownCard title="角色负载" items={replayStats.roleBreakdown} />
        </section>

        <section className="replay-summary-grid" aria-label="复盘总结">
          <SummaryCard label="平均响应时间" value={`${replayStats.replaySummary.averageResponseMinutes} 分钟`} />
          <SummaryCard label="完成任务数" value={`${replayStats.replaySummary.completedTasks} 个`} />
          <SummaryCard label="人工接管次数" value={`${replayStats.replaySummary.manualTakeoverCount} 次`} />
          <SummaryCard label="兜底次数" value={`${replayStats.replaySummary.fallbackCount} 次`} />
          <SummaryCard label="最高风险区域" value={replayStats.replaySummary.highestRiskZone} />
        </section>

        <section className="replay-filters">
          <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
            <option value="all">全部区域</option>
            {zoneOptions.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </select>
          <select value={eventTypeFilter} onChange={(event) => setEventTypeFilter(event.target.value)}>
            <option value="all">全部事件类型</option>
            {eventTypeOptions.map((eventType) => (
              <option key={eventType.value} value={eventType.value}>
                {eventType.label}
              </option>
            ))}
          </select>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">全部角色</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <select value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value)}>
            <option value="all">全部任务状态</option>
            <option value="created">已创建</option>
            <option value="received">已接收</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="exception">异常</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option value="all">全部优先级</option>
            <option value="critical">{getPriorityLabel('critical')}</option>
            <option value="high">{getPriorityLabel('high')}</option>
            <option value="medium">{getPriorityLabel('medium')}</option>
            <option value="low">{getPriorityLabel('low')}</option>
          </select>
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
            <option value="all">全部等级</option>
            <option value="critical">关键</option>
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">全部状态</option>
            <option value="detected">已检测</option>
            <option value="confirmed">已确认</option>
            <option value="escalated">已升级</option>
            <option value="closed">已关闭</option>
            <option value="assigned">已分派</option>
            <option value="need_support">需要支援</option>
          </select>
          <select value={operatorFilter} onChange={(event) => setOperatorFilter(event.target.value)}>
            <option value="all">全部操作人</option>
            {operators.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
          <input
            aria-label="搜索审计事件"
            placeholder="搜索事件、区域、动作或人员..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </section>

        <section className="replay-timeline">
          <div className="replay-section-head">
            <div>
              <span>审计时间线</span>
              <h3>审计时间线</h3>
            </div>
            <small>{replayStats.generatedAt ? formatDateTime(replayStats.generatedAt) : '等待生成'}</small>
          </div>
          {selectedReplayTimeline.length > 0 ? (
            <div className="replay-timeline-track">
              {selectedReplayTimeline.slice(0, 9).map((item, index) => (
                <div className="replay-timeline-node" key={`${item.at}-${item.label}`}>
                  <span className={index === 0 || index === selectedReplayTimeline.length - 1 ? 'active' : ''} />
                  <strong>{item.at}</strong>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-panel">暂无可回放时间线。</div>
          )}
        </section>

        {selectedDualAgentReplay ? (
          <section className="replay-dual-agent-panel" aria-label="双 Agent 处理过程复盘">
            <div className="replay-section-head">
              <div>
                <span>双 Agent 复盘</span>
                <h3>双 Agent 处理过程</h3>
              </div>
              <small>{selectedDualAgentReplay.alert ? MONITORING_SEVERITY_LABELS[selectedDualAgentReplay.alert.severity] : '无告警'}</small>
            </div>

            <div className="replay-agent-step-grid">
              {selectedDualAgentReplay.steps.map((step) => (
                <article className={`replay-agent-step replay-agent-step--${step.status}`} key={step.stepId}>
                  <span>{step.timestampLabel}</span>
                  <strong>{step.label}</strong>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>

            <div className="replay-agent-process-grid">
              <article className="replay-agent-process-card">
                <div className="replay-card-topline">
                  <span>监控告警</span>
                  <strong>{selectedDualAgentReplay.alert?.eventLabel ?? getEventTypeLabel(selectedEvent?.event.event_type ?? '')}</strong>
                </div>
                <h4>{selectedDualAgentReplay.alert?.title ?? selectedEvent?.event.title ?? '暂无告警'}</h4>
                <p>{selectedDualAgentReplay.alert?.summary ?? selectedEvent?.event.summary ?? '暂无告警摘要'}</p>
                <div className="replay-agent-chip-row">
                  <span>{selectedDualAgentReplay.source?.sourceName ?? selectedEvent?.source_label ?? '无监控源'}</span>
                  <span>{selectedDualAgentReplay.alert?.zoneName ?? (selectedEvent ? getZoneLabel(selectedEvent) : '无区域')}</span>
                  <span>{selectedDualAgentReplay.alert?.timestampLabel ?? formatReplayChainTime(selectedEvent?.event.timestamp)}</span>
                </div>
              </article>

              <article className="replay-agent-process-card">
                <div className="replay-card-topline">
                  <span>EventReviewAgent</span>
                  <strong>{selectedDualAgentReplay.review ? getReviewRiskLabel(selectedDualAgentReplay.review.riskLevel) : '无审核'}</strong>
                </div>
                <h4>{selectedDualAgentReplay.review?.finding.title ?? '未生成审核结果'}</h4>
                <p>{selectedDualAgentReplay.review?.finding.whatHappened ?? selectedEvent?.event.explanation ?? '暂无审核说明'}</p>
                <div className="replay-agent-chip-row">
                  <span>{selectedDualAgentReplay.review ? REVIEW_HANDLING_LABELS[selectedDualAgentReplay.review.handlingDecision] : '暂无处理判断'}</span>
                  <span>{selectedDualAgentReplay.review ? REVIEW_CONFIDENCE_LABELS[selectedDualAgentReplay.review.confidenceLabel] : '无置信度'}</span>
                </div>
              </article>

              <article className="replay-agent-process-card">
                <div className="replay-card-topline">
                  <span>DispatchAgent</span>
                  <strong>{selectedDualAgentReplay.managerConfirmation.statusLabel}</strong>
                </div>
                <h4>{selectedDualAgentReplay.dispatch?.recommendedActionLabel ?? selectedActionDefinition?.label ?? '未生成派发建议'}</h4>
                <p>{selectedDualAgentReplay.dispatch?.recommendedActionDescription ?? '派发建议仅用于复盘展示，不创建真实任务。'}</p>
                <div className="replay-agent-chip-row">
                  <span>
                    主执行人：
                    {selectedDualAgentReplay.dispatch
                      ? getPrimaryAssignee(selectedDualAgentReplay.dispatch)?.staffName ?? '待项目经理人工调度'
                      : selectedStaff?.displayName ?? '待定'}
                  </span>
                  <span>
                    备选：{selectedDualAgentReplay.dispatch ? getBackupAssignees(selectedDualAgentReplay.dispatch).slice(0, 2).map((staff) => staff.staffName).join(' / ') || '暂无' : '暂无'}
                  </span>
                </div>
              </article>

              <article className="replay-agent-process-card replay-manager-card">
                <div className="replay-card-topline">
                  <span>经理确认</span>
                  <strong>{selectedDualAgentReplay.managerConfirmation.ownerLabel}</strong>
                </div>
                <h4>{selectedDualAgentReplay.managerConfirmation.statusLabel}</h4>
                <p>{selectedDualAgentReplay.managerConfirmation.detail}</p>
                <div className="replay-agent-chip-row">
                  <span>任务状态：{selectedDemoTask ? getTaskLifecycleStateLabel(selectedDemoTask.currentState) : selectedTaskLifecycle?.currentLabel ?? '无任务'}</span>
                  <span>审计：{selectedAuditSummary}</span>
                </div>
              </article>
            </div>

            <div className="replay-monitoring-evidence-grid">
              {selectedDualAgentReplay.evidence.map((evidence) => (
                <article className="replay-monitoring-evidence-card" key={evidence.evidenceId}>
                  <span>{evidence.sourceLabel}</span>
                  <strong>{evidence.label}</strong>
                  <p>{evidence.detail}</p>
                  <small>{evidence.confidenceLabel}</small>
                </article>
              ))}
              {selectedDualAgentReplay.evidence.length === 0 ? <div className="empty-panel">暂无监控证据。</div> : null}
            </div>

            <div className="replay-collaboration-panel">
              <div className="replay-section-head">
                <div>
                  <span>Agent 协作记录</span>
                  <h3>信号、审核、建议、确认和反馈</h3>
                </div>
                <small>禁止自动执行</small>
              </div>
              <div className="replay-collaboration-grid">
                {selectedCollaborationRecords.map((record) => (
                  <article className="replay-collaboration-card" key={record.recordId}>
                    <span>{record.timestampLabel}</span>
                    <strong>{record.actor}</strong>
                    <p>{record.outputSummary}</p>
                    <small>
                      {record.managerConfirmationRequired ? '需项目经理确认' : '无需确认'} /{' '}
                      {record.forbiddenAutoExecution ? '禁止自动执行' : '允许自动执行'}
                    </small>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="replay-main-grid">
          <div className="replay-table-panel">
            <div className="replay-section-head">
              <div>
                <span>事件日志</span>
                <h3>事件列表</h3>
              </div>
              <small>{filteredEvents.length} 条事件</small>
            </div>
            <div className="replay-table">
              <div className="replay-table-head">
                <span>时间</span>
                <span>事件</span>
                <span>区域</span>
                <span>角色</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              {filteredEvents.map((item) => {
                const role = getResolvedRole(item)
                const action = getActionDefinition(item)
                const staff = getEventStaff(item)

                return (
                  <article
                    className={`replay-row ${item.event.event_id === selectedEvent?.event.event_id ? 'replay-row--active' : ''}`}
                    key={item.event.event_id}
                    onClick={() => setSelectedEventId(item.event.event_id)}
                  >
                    <span>{formatDateTime(item.event.timestamp)}</span>
                    <span>
                      <strong>{item.event.title}</strong>
                      <small>{action?.label ?? item.event.summary}</small>
                    </span>
                    <span>{getZoneLabel(item)}</span>
                    <span>
                      <strong>{ROLE_LABELS[role]}</strong>
                      <small>{staff?.displayName ?? item.assignee_name ?? '待分配'}</small>
                    </span>
                    <span>
                      <StatusChip label={severityLabel(item.event.severity)} severity={item.event.severity} />
                    </span>
                    <span>
                      <button
                        className="ghost-button"
                        onClick={(event) => {
                          event.stopPropagation()
                          props.onSaveStrategy(item.event.event_id)
                        }}
                        type="button"
                      >
                        保存策略
                      </button>
                    </span>
                  </article>
                )
              })}
              {filteredEvents.length === 0 ? <div className="empty-panel">当前筛选条件下没有事件。</div> : null}
            </div>

            <div className="replay-audit-log">
              <div className="replay-section-head">
                <div>
                  <span>系统审计</span>
                  <h3>操作记录</h3>
                </div>
                <small>{filteredLogs.length} 条</small>
              </div>
              <div className="replay-audit-list">
                {filteredLogs.map((log) => {
                  const relatedEvent = props.events.find((item) => item.event.event_id === log.target_id || item.task?.task_id === log.target_id)

                  return (
                    <div className="replay-audit-item" key={log.log_id}>
                      <span>{formatDateTime(log.created_at)}</span>
                      <strong>{auditActionLabel(log.action_type)}</strong>
                      <small>
                        {log.operator_id} / {relatedEvent ? `${relatedEvent.event.title} / ${relatedEvent.zone_name}` : log.target_id}
                      </small>
                    </div>
                  )
                })}
                {filteredLogs.length === 0 ? <div className="empty-panel">当前筛选条件下没有审计记录。</div> : null}
              </div>
            </div>
          </div>

          <aside className="replay-detail-panel">
            <div className="replay-section-head">
              <div>
                <span>事件详情</span>
                <h3>事件详情</h3>
              </div>
              {selectedEvent ? <StatusChip label={severityLabel(selectedEvent.event.severity)} severity={selectedEvent.event.severity} /> : null}
            </div>
            {selectedEvent ? (
              <div className="replay-detail-stack">
                <strong>{selectedEvent.event.title}</strong>
                <p>{selectedEvent.event.summary}</p>
                <DetailLine label="事件类型" value={selectedEventDefinition?.label ?? selectedEvent.event.event_type} />
                <DetailLine label="事件说明" value={selectedEventDefinition?.description ?? '暂无事件定义'} />
                <DetailLine label="时间" value={formatDateTime(selectedEvent.event.timestamp)} />
                <DetailLine label="区域" value={getZoneLabel(selectedEvent)} />
                <DetailLine
                  label="区域属性"
                  value={selectedZone ? `${selectedZone.floor} / ${selectedZone.ownerTeam} / 容量 ${selectedZone.capacity}` : selectedEvent.zone_name}
                />
                <DetailLine
                  label="任务状态"
                  value={selectedTaskLifecycle?.currentLabel ?? (selectedDemoTask ? getTaskLifecycleStateLabel(selectedDemoTask.currentState) : '未生成任务')}
                />
                <DetailLine label="推荐动作" value={selectedActionDefinition?.label ?? selectedEvent.event.recommended_action} />
                <DetailLine
                  label="动作分类"
                  value={
                    selectedActionDefinition
                      ? `${CATEGORY_LABELS[selectedActionDefinition.category]} / ${getPriorityLabel(selectedActionDefinition.defaultPriority)}`
                      : '未匹配动作目录'
                  }
                />
                <DetailLine label="执行人" value={selectedStaff?.displayName ?? selectedEvent.assignee_name ?? selectedEvent.event.recommended_assignee_id ?? '待定'} />
                <DetailLine label="角色与团队" value={selectedStaff ? `${ROLE_LABELS[selectedStaff.role]} / ${selectedStaff.team}` : ROLE_LABELS[getResolvedRole(selectedEvent)]} />
                <DetailLine
                  label="当前任务状态"
                  value={selectedDemoTask ? getTaskLifecycleStateLabel(selectedDemoTask.currentState) : selectedTaskLifecycle?.currentLabel ?? selectedEvent.task?.status ?? '未生成任务'}
                />
                <DetailLine
                  label="最新工作人员反馈"
                  value={
                    selectedDemoFeedback
                      ? `${selectedDemoFeedback.staffName} / ${getFeedbackStatusLabel(selectedDemoFeedback.status)} / ${selectedDemoFeedback.message}`
                      : selectedEvent.latest_feedback_label ?? '暂无'
                  }
                />
                <DetailLine label="审计摘要" value={selectedAuditSummary} />
                <div className="replay-chain-overview">
                  <div>
                    <span>Agent 解释</span>
                    <strong>{selectedEvent.event.explanation ?? '已生成建议说明'}</strong>
                  </div>
                  <div>
                    <span>优先级</span>
                    <strong>{selectedPriorityItem ? `${getPriorityLabel(selectedPriorityItem.priority)} / ${selectedPriorityItem.priorityScore}` : severityLabel(selectedEvent.event.severity)}</strong>
                  </div>
                  <div>
                    <span>反馈状态</span>
                    <strong>{selectedDemoFeedback ? getFeedbackStatusLabel(selectedDemoFeedback.status) : selectedEvent.latest_feedback_label ?? '暂无'}</strong>
                  </div>
                </div>
                <div className="replay-task-chain">
                  <div className="replay-section-head">
                    <div>
                      <span>任务链路</span>
                      <h3>任务回放</h3>
                    </div>
                    <small>{selectedTaskLifecycle?.currentLabel ?? '无任务'}</small>
                  </div>
                  <div className="replay-task-chain-list">
                    {selectedTaskChain.map((item) => (
                      <div className={`replay-task-chain-item replay-task-chain-item--${item.state}`} key={item.key}>
                        <span className="replay-task-chain-marker" />
                        <div>
                          <strong>{item.label}</strong>
                          <small>{item.detail}</small>
                        </div>
                        <time>{item.time}</time>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="replay-detail-related">
                  <span>触发点</span>
                  {selectedEvent.trigger_points.length > 0 ? (
                    selectedEvent.trigger_points.map((point) => <p key={point}>{point}</p>)
                  ) : (
                    <p>{selectedEventDefinition?.triggerPointLabels.join(' / ') ?? '暂无触发点'}</p>
                  )}
                </div>
                <div className="replay-detail-related">
                  <span>复盘指标</span>
                  <p>调度成功率 {formatPercent(replayStats.metrics.dispatch_success_rate)}</p>
                  <p>任务完成率 {formatPercent(replayStats.metrics.task_completion_rate)}</p>
                  <p>升级率 {formatPercent(replayStats.metrics.escalation_rate)}</p>
                </div>
              </div>
            ) : (
              <div className="empty-panel">当前没有可查看的事件详情。</div>
            )}
          </aside>
        </section>

        <section className="replay-controls">
          <div>
            <span className="replay-status-chip">{replayPlaying ? '回放进行中' : '回放就绪'}</span>
            <strong>{props.activeProject?.title ?? '当前项目'}</strong>
            <small>{replayStats.generatedAt ? formatDateTime(replayStats.generatedAt) : '等待回放数据'}</small>
          </div>
          <div className="replay-control-buttons">
            <button className="ghost-button" type="button">
              -10s
            </button>
            <button className="replay-play-button" onClick={() => setReplayPlaying((current) => !current)} type="button">
              {replayPlaying ? '暂停' : '播放'}
            </button>
            <button className="ghost-button" type="button">
              +10s
            </button>
          </div>
          <div className="replay-progress">
            <span style={{ width: `${Math.min(100, Math.max(12, replayStats.metrics.task_completion_rate * 100))}%` }} />
          </div>
          <select aria-label="回放速度" value="1x" onChange={() => undefined}>
            <option value="1x">1 倍速</option>
          </select>
        </section>
      </section>
    </AppFrame>
  )
}

function getSortedEvents(events: EventOperationalItem[]) {
  return [...events].sort((left, right) => new Date(left.event.timestamp).getTime() - new Date(right.event.timestamp).getTime())
}

function getEventDefinition(item: EventOperationalItem) {
  return isVenueEventType(item.event.event_type) ? getVenueEventDefinition(item.event.event_type) : null
}

function getEventTypeLabel(eventType: string) {
  return isVenueEventType(eventType) ? getVenueEventDefinition(eventType).label : eventType
}

function getActionDefinition(item: EventOperationalItem) {
  const action = item.event.recommended_action
  return isEventActionKey(action) ? getEventActionDefinition(action) : null
}

function getEventStaff(item: EventOperationalItem): StaffPoolMember | null {
  const staffId = item.task?.assignee_id ?? item.event.recommended_assignee_id
  return getStaffById(staffId)
}

function getZone(item: EventOperationalItem): VenueZone | null {
  return getVenueZoneById(item.event.zone_id)
}

function getZoneLabel(item: EventOperationalItem) {
  return getZone(item)?.zoneName ?? item.zone_name
}

function buildReplayTaskChain(item: EventOperationalItem, lifecycle: TaskLifecycleViewModel | null): ReplayTaskChainItem[] {
  const eventDefinition = getEventDefinition(item)
  const actionDefinition = getActionDefinition(item)
  const staff = getEventStaff(item)
  const feedbackState: TaskLifecycleStepView['state'] = item.latest_feedback ? (lifecycle?.isTerminal ? 'done' : 'current') : 'pending'
  const rows: ReplayTaskChainItem[] = [
    {
      key: 'vision',
      label: '视觉信号',
      time: formatReplayChainTime(item.event.timestamp),
      detail: `${item.source_label} / ${item.trigger_points[0] ?? '现场信号进入复盘'}`,
      state: 'done',
    },
    {
      key: 'event',
      label: '事件生成',
      time: formatReplayChainTime(item.event.timestamp),
      detail: `${eventDefinition?.label ?? item.event.event_type} / ${getZoneLabel(item)}`,
      state: 'done',
    },
    {
      key: 'agent',
      label: 'Agent 建议',
      time: formatReplayChainTime(item.event.timestamp),
      detail: `${actionDefinition?.label ?? item.event.recommended_action} / ${item.event.explanation}`,
      state: 'done',
    },
    {
      key: 'risk',
      label: '风险评估',
      time: formatReplayChainTime(item.event.timestamp),
      detail: `${severityLabel(item.event.severity)} / 优先分 ${item.event.priority_score}`,
      state: item.event.requires_confirmation ? 'current' : 'done',
    },
    {
      key: 'dispatch',
      label: '任务派发',
      time: formatReplayChainTime(item.task?.dispatched_at),
      detail: item.task
        ? `${actionDefinition?.label ?? item.task.task_type} / ${staff?.displayName ?? item.assignee_name ?? item.task.assignee_id}`
        : '当前事件未生成任务派发记录。',
      state: item.task ? 'done' : 'pending',
    },
    {
      key: 'feedback',
      label: '执行反馈',
      time: formatReplayChainTime(item.latest_feedback_at ?? item.latest_feedback?.timestamp),
      detail: item.latest_feedback?.note || item.latest_feedback_label || '等待工作人员反馈。',
      state: feedbackState,
    },
    {
      key: 'archive',
      label: '完成归档',
      time: formatReplayChainTime(item.task?.completed_at || item.latest_feedback_at),
      detail: lifecycle?.isTerminal ? '任务已进入复盘归档。' : '等待完成后进入审计归档。',
      state: lifecycle?.isTerminal ? 'done' : 'pending',
    },
  ]

  return rows
}

function formatReplayChainTime(value?: string) {
  return value ? formatDateTime(value) : '待处理'
}

function buildDualAgentReplaySummary(item: EventOperationalItem): DualAgentReplaySummary {
  const alert = resolveReplayAlert(item)
  const source = alert ? getMonitorSourceById(alert.sourceId) : null
  const review = alert ? getEventReviewByAlertId(alert.alertId) : null
  const dispatch = review ? getDispatchRecommendationByReviewId(review.reviewId) : null
  const managerConfirmation = resolveReplayConfirmationState(dispatch)
  const evidence: ReplayMonitoringEvidenceView[] =
    alert?.evidence.map((item) => ({
      evidenceId: item.evidenceId,
      label: item.label,
      detail: item.detail,
      sourceLabel: `${source?.streamLabel ?? alert.sourceName} / ${item.frameLabel}`,
      confidenceLabel: `置信度 ${Math.round(item.confidence * 100)}%`,
    })) ?? []

  return {
    alert,
    source,
    review,
    dispatch,
    managerConfirmation,
    evidence,
    steps: buildReplayAgentSteps(item, alert, review, dispatch, managerConfirmation),
  }
}

function resolveReplayAlert(item: EventOperationalItem) {
  const alerts = listMonitoringAlerts()
  const byEventAndZone = alerts.find((alert) => alert.eventType === item.event.event_type && alert.zoneId === item.event.zone_id)
  const byEventType = isVenueEventType(item.event.event_type)
    ? alerts.find((alert) => alert.eventType === item.event.event_type)
    : null

  return byEventAndZone ?? byEventType ?? alerts[0] ?? null
}

function resolveReplayConfirmationState(dispatch: DispatchAgentRecommendation | null): ReplayManagerConfirmationView {
  if (!dispatch) {
    return {
      statusLabel: '等待派发建议',
      ownerLabel: '项目经理',
      detail: '未生成派发建议，暂不进入任务状态展示。',
    }
  }

  return {
    statusLabel: MANAGER_CONFIRMATION_LABELS[dispatch.managerConfirmationStatus],
    ownerLabel: '项目经理',
    detail: 'DispatchAgent 只给出建议，项目经理确认后才允许进入任务状态展示。',
  }
}

function buildReplayAgentSteps(
  item: EventOperationalItem,
  alert: MonitoringAlert | null,
  review: EventReviewAgentDecision | null,
  dispatch: DispatchAgentRecommendation | null,
  managerConfirmation: ReplayManagerConfirmationView,
): ReplayAgentStep[] {
  return [
    {
      stepId: 'monitor-source',
      label: '监控源发现',
      timestampLabel: alert?.timestampLabel ?? formatReplayChainTime(item.event.timestamp),
      detail: alert ? `${alert.sourceName} 发现 ${alert.eventLabel}` : `${item.source_label} 进入复盘`,
      status: alert ? 'done' : 'current',
    },
    {
      stepId: 'monitor-alert',
      label: '告警确认',
      timestampLabel: alert?.timestampLabel ?? formatReplayChainTime(item.event.timestamp),
      detail: alert ? `${MONITORING_SEVERITY_LABELS[alert.severity]} / ${alert.summary}` : item.event.summary,
      status: alert ? 'done' : 'pending',
    },
    {
      stepId: 'event-review',
      label: '事件审核 Agent',
      timestampLabel: review?.reviewedAtLabel ?? formatReplayChainTime(item.event.timestamp),
      detail: review ? `${getReviewRiskLabel(review.riskLevel)} / ${REVIEW_HANDLING_LABELS[review.handlingDecision]}` : '等待审核结果',
      status: review ? 'done' : 'pending',
    },
    {
      stepId: 'dispatch-agent',
      label: '派发建议 Agent',
      timestampLabel: formatReplayChainTime(item.task?.dispatched_at ?? item.event.timestamp),
      detail: dispatch
        ? `${dispatch.recommendedActionLabel} / ${getPrimaryAssignee(dispatch)?.staffName ?? '待项目经理人工调度'}`
        : '等待派发建议',
      status: dispatch ? 'done' : 'pending',
    },
    {
      stepId: 'manager-confirmation',
      label: '项目经理确认',
      timestampLabel: formatReplayChainTime(item.task?.dispatched_at ?? item.event.timestamp),
      detail: managerConfirmation.statusLabel,
      status: dispatch ? 'current' : 'pending',
    },
    {
      stepId: 'task-feedback-audit',
      label: '任务反馈与审计',
      timestampLabel: formatReplayChainTime(item.latest_feedback_at ?? item.task?.completed_at),
      detail: item.latest_feedback_label ?? '等待工作人员反馈与审计记录',
      status: item.latest_feedback || item.task?.completed_at ? 'done' : 'pending',
    },
  ]
}

function buildReplayMonitoringTimeline(
  item: EventOperationalItem,
  lifecycle: TaskLifecycleViewModel | null,
  demoFeedback: ReturnType<typeof getLatestFeedbackByTaskId>,
  auditLogs: AuditLog[],
  dualAgentReplay: DualAgentReplaySummary | null,
) {
  const actionDefinition = getActionDefinition(item)
  const staff = getEventStaff(item)
  const alert = dualAgentReplay?.alert ?? null
  const review = dualAgentReplay?.review ?? null
  const dispatch = dualAgentReplay?.dispatch ?? null
  const archiveTime = item.task?.completed_at ?? item.latest_feedback_at ?? auditLogs.at(-1)?.created_at ?? item.event.timestamp
  const dispatchAssigneeLabel = dispatch
    ? getPrimaryAssignee(dispatch)?.staffName ?? '待项目经理人工调度'
    : staff?.displayName ?? item.assignee_name ?? item.event.recommended_assignee_id ?? '待定'

  return [
    {
      at: alert?.timestampLabel ?? formatReplayChainTime(item.event.timestamp),
      label: `监控源 / ${dualAgentReplay?.source?.sourceName ?? item.source_label} / ${item.trigger_points[0] ?? '现场信号'}`,
    },
    {
      at: alert?.timestampLabel ?? formatReplayChainTime(item.event.timestamp),
      label: `告警生成 / ${alert?.eventLabel ?? getEventTypeLabel(item.event.event_type)} / ${getZoneLabel(item)}`,
    },
    {
      at: review?.reviewedAtLabel ?? formatReplayChainTime(item.event.timestamp),
      label: `事件审核 Agent / ${review ? getReviewRiskLabel(review.riskLevel) : severityLabel(item.event.severity)}`,
    },
    {
      at: formatReplayChainTime(item.event.timestamp),
      label: `风险评估 / ${severityLabel(item.event.severity)} / 优先分 ${item.event.priority_score}`,
    },
    {
      at: formatReplayChainTime(item.task?.dispatched_at),
      label: `派发建议 Agent / ${dispatch?.recommendedActionLabel ?? actionDefinition?.label ?? item.event.recommended_action}`,
    },
    {
      at: formatReplayChainTime(item.task?.dispatched_at),
      label: `项目经理确认 / ${dualAgentReplay?.managerConfirmation.statusLabel ?? '等待确认'}`,
    },
    {
      at: formatReplayChainTime(item.task?.dispatched_at),
      label: `任务派发 / ${dispatchAssigneeLabel}`,
    },
    {
      at: demoFeedback?.timestampLabel ?? formatReplayChainTime(item.latest_feedback_at ?? item.latest_feedback?.timestamp),
      label: `执行反馈 / ${
        demoFeedback ? `${demoFeedback.staffName} ${getFeedbackStatusLabel(demoFeedback.status)}` : item.latest_feedback_label ?? '等待反馈'
      }`,
    },
    {
      at: formatReplayChainTime(archiveTime),
      label: `完成归档 / ${lifecycle?.isTerminal ? '任务已完成' : '审计记录待补齐'} / ${auditLogs.length} 条审计记录`,
    },
  ]
}

function buildSelectedAuditSummary(logs: AuditLog[]) {
  if (logs.length === 0) return '暂无审计记录'

  const latestActions = logs.slice(-2).map((log) => auditActionLabel(log.action_type))
  return `${logs.length} 条记录：${latestActions.join(' / ')}`
}

function getResolvedRole(item: EventOperationalItem): ResolvedRole {
  const staff = getEventStaff(item)
  if (staff) {
    return staff.role
  }

  const action = getActionDefinition(item)
  const zoneText = `${item.event.zone_id} ${item.zone_name}`.toLowerCase()
  const eventType = item.event.event_type as string

  if (action?.category === 'technical' || eventType === 'equipment_issue') {
    return 'technical_support'
  }

  if (action?.category === 'escalation' || eventType === 'task_timeout' || eventType === 'staff_shortage') {
    return 'supervisor'
  }

  if (eventType === 'crowd_spillover' || zoneText.includes('emergency')) {
    return 'security_guard'
  }

  if (zoneText.includes('entry') || zoneText.includes('entrance') || item.zone_name.includes('入口')) {
    return 'entrance_guide'
  }

  if (zoneText.includes('registration') || item.zone_name.includes('签到')) {
    return 'registration_volunteer'
  }

  if (zoneText.includes('booth') || item.zone_name.includes('展台')) {
    return 'booth_reception'
  }

  if (zoneText.includes('service') || item.zone_name.includes('服务')) {
    return 'service_desk_agent'
  }

  if (zoneText.includes('stage') || item.zone_name.includes('舞台')) {
    return 'stage_operator'
  }

  if (zoneText.includes('main') || zoneText.includes('corridor') || item.zone_name.includes('主通道')) {
    return 'floor_coordinator'
  }

  return 'unmapped'
}

function buildZoneBreakdown(events: EventOperationalItem[]) {
  const rows = new Map<string, { label: string; total: number; completed: number; escalated: number }>()

  events.forEach((item) => {
    const key = item.event.zone_id
    const current = rows.get(key) ?? { label: getZoneLabel(item), total: 0, completed: 0, escalated: 0 }
    current.total += 1
    current.completed += item.task?.status === 'completed' || item.latest_feedback?.type === 'completed' ? 1 : 0
    current.escalated += item.task?.status === 'exception' || item.event.status === 'escalated' ? 1 : 0
    rows.set(key, current)
  })

  return Array.from(rows.values())
    .sort((left, right) => right.total - left.total)
    .map((item) => ({
      label: item.label,
      value: `${item.total} 件`,
      meta: `完成 ${item.completed} / 升级 ${item.escalated}`,
    }))
}

function buildEventBreakdown(events: EventOperationalItem[]) {
  const rows = new Map<string, { label: string; total: number }>()

  events.forEach((item) => {
    const key = item.event.event_type
    const current = rows.get(key) ?? { label: getEventTypeLabel(key), total: 0 }
    current.total += 1
    rows.set(key, current)
  })

  return Array.from(rows.values())
    .sort((left, right) => right.total - left.total)
    .map((item) => ({
      label: item.label,
      value: `${item.total} 件`,
      meta: '事件样本',
    }))
}

function buildRoleBreakdown(events: EventOperationalItem[]) {
  const rows = new Map<ResolvedRole, { role: ResolvedRole; total: number; active: number }>()

  events.forEach((item) => {
    const role = getResolvedRole(item)
    const current = rows.get(role) ?? { role, total: 0, active: 0 }
    current.total += 1
    current.active += item.task && item.task.status !== 'completed' ? 1 : 0
    rows.set(role, current)
  })

  return Array.from(rows.values())
    .sort((left, right) => right.total - left.total)
    .map((item) => ({
      label: ROLE_LABELS[item.role],
      value: `${item.total} 件`,
      meta: `处理中 ${item.active}`,
    }))
}

function getHighestRiskZone(events: EventOperationalItem[]) {
  const zoneScores = new Map<string, { label: string; score: number }>()
  const severityWeight = { critical: 4, high: 3, medium: 2 }

  events.forEach((item) => {
    const key = item.event.zone_id
    const current = zoneScores.get(key) ?? { label: getZoneLabel(item), score: 0 }
    current.score += severityWeight[item.event.severity]
    current.score += item.event.status === 'escalated' || item.task?.status === 'exception' ? 3 : 0
    current.score += item.operational_state === 'need_support' ? 2 : 0
    zoneScores.set(key, current)
  })

  return Array.from(zoneScores.values()).sort((left, right) => right.score - left.score)[0]?.label ?? '暂无'
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  )
}

function SummaryCard(props: { label: string; value: string }) {
  return (
    <article className="replay-summary-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  )
}

function BreakdownCard(props: { title: string; items: { label: string; value: string; meta: string }[] }) {
  return (
    <article className="replay-insight-card">
      <div className="replay-section-head">
        <div>
          <span>分布概览</span>
          <h3>{props.title}</h3>
        </div>
      </div>
      <div className="replay-breakdown-list">
        {props.items.slice(0, 4).map((item) => (
          <div className="replay-breakdown-item" key={`${props.title}-${item.label}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.meta}</small>
          </div>
        ))}
        {props.items.length === 0 ? <div className="empty-panel">暂无数据。</div> : null}
      </div>
    </article>
  )
}

function ReportChainCard(props: { anchorId: string; eyebrow: string; title: string; items: readonly { label: string; detail: string }[] }) {
  return (
    <article className="replay-report-chain-card" id={props.anchorId}>
      <div className="replay-section-head">
        <div>
          <span>{props.eyebrow}</span>
          <h3>{props.title}</h3>
        </div>
      </div>
      <div className="replay-report-chain-list">
        {props.items.map((item) => (
          <div key={item.label}>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

function StatusChip(props: { label: string; severity?: string }) {
  return <span className={`replay-status-chip replay-status-chip--${props.severity ?? 'info'}`}>{props.label}</span>
}

function DetailLine(props: { label: string; value: string }) {
  return (
    <div className="replay-detail-line">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  )
}

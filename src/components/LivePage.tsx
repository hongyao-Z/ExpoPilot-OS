import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  EventOperationalItem,
  LiveMetrics,
  Project,
  RoleType,
  RuntimeOperationalSummary,
  Session,
  SourceOperationalStatus,
  UiFeedbackState,
  ZoneOperationalStatus,
} from '../domain/types'
import { eventOperationalStateLabel, formatDateTime, severityLabel } from '../lib/format'
import type { RouteState } from '../lib/router'
import { buildAgentContext, type AgentMode } from '../lib/agent-context-builder'
import { buildAgentDecision, type AgentDecision } from '../lib/agent-decision-adapter'
import {
  buildDerivedAgentAuditRecords,
  createApprovalRequestedAuditRecord,
  createApprovalAuditRecordFromResult,
  createExecutionAuditRecordFromResult,
  createHumanTakeoverAuditRecord,
  createRollbackAuditRecord,
  findDispatchToolCall,
  type AgentAuditRecord,
} from '../lib/agent-audit'
import { appendAgentAuditRecord, appendAgentAuditRecords, listAgentAuditRecordsByScope } from '../lib/agent-audit-store'
import { executeAgentToolCall } from '../lib/agent-execution-bridge'
import { evaluateAgentRollback } from '../lib/agent-rollback'
import { buildAgentCockpitViewModel } from '../lib/agent-view-model'
import { getEventActionsForZoneType, type EventActionDefinition } from '../lib/event-action-catalog'
import { getVisionConfigByZoneType, getVisionInputSource } from '../lib/vision-config'
import { createDetectionReplayDetector } from '../lib/vision-detector'
import { adaptVisionMetricsToBoothHeatup, adaptVisionMetricsToEntranceCongestion } from '../lib/vision-event-adapter'
import { buildVisionMetricsTimeline, type VisionMetricsFrame } from '../lib/vision-metrics'
import { createTrackingReplayTracker } from '../lib/vision-tracker'
import type { VisionDetectionReplayPayload, VisionEventCandidate, VisionTrackingReplayPayload, VisionZoneHint } from '../lib/vision-types'
import { checkLiveVisionHealth, createLiveVisionSource } from '../lib/vision-live-source'
import { getDispatchableStaffForZoneType, getStaffingSummaryByZoneType, type StaffPoolMember } from '../lib/staff-pool'
import { getFeedbackStatusLabel, getFeedbackSummary, getLatestFeedbackByTaskId } from '../lib/staff-feedback'
import { getPriorityLabel, getPriorityQueueSummary, listPriorityQueueItems } from '../lib/priority-queue'
import { getDemoTaskLifecycleById, getTaskLifecycleProgress, getTaskLifecycleStateLabel, listDemoTaskLifecycles } from '../lib/task-lifecycle'
import { getMonitorSourceSummary, listMonitorSources, type MonitorSource } from '../lib/monitor-sources'
import { getDemoTaskStatusLabel, readDemoState, subscribeDemoState } from '../lib/demo-state'
import { confirmDispatch, getCurrentTask, getRuntimeSourceLabel, resetDemo } from '../lib/api-client'
import { demoGuideTotalSteps, getNextDemoPath, inferDemoGuideStep, hasReachedDemoStatus } from '../lib/demo-guide'
import {
  getHighestSeverityAlert,
  getMonitoringAlertSummary,
  listMonitoringAlerts,
  type MonitoringAlert,
  type MonitoringAlertSeverity,
  type MonitoringAlertStatus,
} from '../lib/monitoring-alerts'
import {
  getEventReviewByAlertId,
  getReviewDecisionSummary,
  getReviewRiskLabel,
  type EventReviewAgentDecision,
  type ReviewHandlingDecision,
} from '../lib/event-review-agent'
import {
  getBackupAssignees,
  getDispatchRecommendationByReviewId,
  getPrimaryAssignee,
  type DispatchAgentRecommendation,
  type ManagerConfirmationStatus,
} from '../lib/dispatch-agent'
import { EVENT_DEFINITIONS, type VenueEventDefinition } from '../lib/venue-event-types'
import { listVenueZones, type VenueRiskLevel, type VenueZone, type VenueZoneType } from '../lib/venue-zones'
import { AgentCockpitPanel } from './AgentCockpitPanel'
import { AppFrame } from './AppFrame'
import { VisionDebugPanel } from './VisionDebugPanel'
import { VisionReplayPanel } from './VisionReplayPanel'

type ViewMode = 'all' | 'booth'
type VisionReplayStatus = 'idle' | 'loading' | 'ready' | 'error'

interface VisionDebugState {
  frameSatisfied: boolean
  consecutiveMatches: number
  cooldownActive: boolean
  cooldownMessage: string
}

interface LiveZoneViewModel {
  zoneId: string
  zoneName: string
  zoneType: VenueZoneType
  floor: string
  capacity: number
  ownerTeam: string
  defaultAssigneeRole: string
  riskLevel: VenueRiskLevel
  operationalZone?: ZoneOperationalStatus
  eventItems: EventOperationalItem[]
  sourceStatuses: SourceOperationalStatus[]
  eventDefinitions: VenueEventDefinition[]
  actionDefinitions: EventActionDefinition[]
  staffCandidates: StaffPoolMember[]
  staffingSummary: ReturnType<typeof getStaffingSummaryByZoneType>
}

interface MonitorCardView {
  source: MonitorSource
  alert: MonitoringAlert | null
  isFocused: boolean
  statusLabel: string
}

interface FocusedMonitorView {
  source: MonitorSource | null
  alert: MonitoringAlert | null
  review: EventReviewAgentDecision | null
  dispatch: DispatchAgentRecommendation | null
}

interface AgentPanelView {
  review: EventReviewAgentDecision | null
  dispatch: DispatchAgentRecommendation | null
  reviewSummary: string
  primaryAssigneeLabel: string
  backupAssigneeLabel: string
}

const liveStaffRoleLabel: Record<StaffPoolMember['role'] | 'project_manager', string> = {
  entrance_guide: '入口引导',
  registration_volunteer: '签到接待',
  floor_coordinator: '场馆协调',
  booth_reception: '展台接待',
  service_desk_agent: '服务台',
  stage_operator: '舞台执行',
  technical_support: '技术支持',
  security_guard: '安保',
  supervisor: '主管',
  project_manager: '项目经理',
}

const zoneTypeLabel: Record<VenueZoneType, string> = {
  entrance: '入口',
  registration: '签到',
  main_hall: '主展厅',
  booth: '展台',
  service_desk: '服务台',
  stage: '舞台',
  emergency_passage: '应急通道',
}

const riskLevelLabel: Record<VenueRiskLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

const actionPriorityLabel: Record<EventActionDefinition['defaultPriority'], string> = {
  low: '低',
  medium: '中',
  high: '高',
}

const actionCategoryLabel: Record<EventActionDefinition['category'], string> = {
  staffing: '人员调度',
  flow_control: '动线控制',
  communication: '信息通知',
  technical: '技术处理',
  escalation: '升级处理',
}

const staffAvailabilityLabel: Record<StaffPoolMember['availability'], string> = {
  available: '可调度',
  standby: '待命',
  assigned: '已分配',
  off_duty: '离岗',
}

const monitorSourceHealthLabel: Record<MonitorSource['health'], string> = {
  stable: '稳定',
  degraded: '降级',
  critical: '告红',
}

const monitoringSeverityLabel: Record<MonitoringAlertSeverity, string> = {
  critical: '告红',
  high: '高',
  medium: '中',
  low: '低',
}

const monitoringStatusLabel: Record<MonitoringAlertStatus, string> = {
  new: '新告警',
  reviewing: '审核中',
  needs_manager_review: '经理复核',
  acknowledged: '已确认',
  resolved: '已解决',
  dismissed: '已忽略',
}

const reviewHandlingDecisionLabel: Record<ReviewHandlingDecision, string> = {
  handle_required: '需要处理',
  watch_required: '持续观察',
  no_action_required: '无需处理',
}

const managerConfirmationLabel: Record<ManagerConfirmationStatus, string> = {
  pending_manager_confirmation: '等待项目经理确认',
  confirmed_for_demo: '已确认',
  rejected_by_manager: '已驳回',
  manual_review_required: '需人工复核',
}

const zoneTypeRemap: Record<ZoneOperationalStatus['zone_type'], VenueZoneType> = {
  entry: 'entrance',
  stage: 'main_hall',
  booth: 'booth',
  lounge: 'service_desk',
  service: 'service_desk',
}

function getVenueZoneTypeFromOperationalZone(zone: ZoneOperationalStatus): VenueZoneType {
  if (zone.name.includes('签到')) return 'registration'
  if (zone.name.includes('舞台')) return 'stage'
  if (zone.name.includes('应急')) return 'emergency_passage'
  if (zone.name.includes('服务')) return 'service_desk'
  if (zone.name.includes('主通道') || zone.name.includes('主展厅')) return 'main_hall'
  return zoneTypeRemap[zone.zone_type]
}

function matchVenueZone(venueZone: VenueZone, operationalZones: ZoneOperationalStatus[], usedOperationalZoneIds: Set<string>) {
  const explicitIdMap: Record<string, string[]> = {
    'zone-entrance-a': ['zone-entry'],
    'zone-registration': ['zone-registration'],
    'zone-main-hall': ['zone-main-corridor'],
    'zone-booth-512': ['zone-booth-a', 'zone-booth-b'],
    'zone-service-desk': ['zone-service-desk'],
    'zone-stage': ['zone-stage'],
    'zone-emergency-passage': ['zone-emergency-passage'],
  }
  const explicitIds = explicitIdMap[venueZone.zoneId] ?? []
  const exactMatch = operationalZones.find(
    (zone) => !usedOperationalZoneIds.has(zone.zone_id) && (zone.zone_id === venueZone.zoneId || explicitIds.includes(zone.zone_id)),
  )

  if (exactMatch) return exactMatch

  return operationalZones.find(
    (zone) => !usedOperationalZoneIds.has(zone.zone_id) && getVenueZoneTypeFromOperationalZone(zone) === venueZone.zoneType,
  )
}

function buildLiveZoneViewModels(
  operationalZones: ZoneOperationalStatus[],
  eventItems: EventOperationalItem[],
  sourceStatuses: SourceOperationalStatus[],
) {
  const usedOperationalZoneIds = new Set<string>()

  return listVenueZones().map<LiveZoneViewModel>((venueZone) => {
    const operationalZone = matchVenueZone(venueZone, operationalZones, usedOperationalZoneIds)

    if (operationalZone) {
      usedOperationalZoneIds.add(operationalZone.zone_id)
    }

    const runtimeZoneId = operationalZone?.zone_id ?? venueZone.zoneId

    return {
      zoneId: venueZone.zoneId,
      zoneName: operationalZone?.name ?? venueZone.zoneName,
      zoneType: venueZone.zoneType,
      floor: venueZone.floor,
      capacity: venueZone.capacity,
      ownerTeam: venueZone.ownerTeam,
      defaultAssigneeRole: venueZone.defaultAssigneeRole,
      riskLevel: venueZone.riskLevel,
      operationalZone,
      eventItems: eventItems.filter((item) => item.event.zone_id === runtimeZoneId),
      sourceStatuses: sourceStatuses.filter((source) => source.zone_id === runtimeZoneId),
      eventDefinitions: (Object.values(EVENT_DEFINITIONS) as VenueEventDefinition[]).filter((definition) =>
        isEventDefinitionSuitableForZone(definition, venueZone.zoneType),
      ),
      actionDefinitions: getEventActionsForZoneType(venueZone.zoneType),
      staffCandidates: getDispatchableStaffForZoneType(venueZone.zoneType).slice(0, 3),
      staffingSummary: getStaffingSummaryByZoneType(venueZone.zoneType),
    }
  })
}

function isEventDefinitionSuitableForZone(definition: VenueEventDefinition, zoneType: VenueZoneType) {
  const suitableZoneTypes: readonly VenueZoneType[] = definition.suitableZoneTypes
  return suitableZoneTypes.includes(zoneType)
}

function buildMonitorCards(
  sources: MonitorSource[],
  alerts: MonitoringAlert[],
  selectedAlertId: string | null,
): MonitorCardView[] {
  return sources.map((source) => {
    const alert = alerts.find((item) => item.sourceId === source.sourceId) ?? null

    return {
      source,
      alert,
      isFocused: Boolean(alert && alert.alertId === selectedAlertId),
      statusLabel: alert ? monitoringSeverityLabel[alert.severity] : monitorSourceHealthLabel[source.health],
    }
  })
}

function resolveFocusedAlert(alerts: MonitoringAlert[], selectedAlertId: string | null) {
  return alerts.find((alert) => alert.alertId === selectedAlertId) ?? getHighestSeverityAlert() ?? alerts[0] ?? null
}

function buildAgentPanelState(review: EventReviewAgentDecision | null, dispatch: DispatchAgentRecommendation | null): AgentPanelView {
  const primaryAssignee = dispatch ? getPrimaryAssignee(dispatch) : null
  const backupAssignees = dispatch ? getBackupAssignees(dispatch) : []

  return {
    review,
    dispatch,
    reviewSummary: review ? getReviewDecisionSummary(review) : '当前未选择事件审核结果。',
    primaryAssigneeLabel: primaryAssignee ? `${primaryAssignee.staffName} / ${liveStaffRoleLabel[primaryAssignee.role]}` : '等待派发建议',
    backupAssigneeLabel:
      backupAssignees.length > 0
        ? backupAssignees.slice(0, 2).map((assignee) => assignee.staffName).join(', ')
        : '暂无备选执行人',
  }
}

function zoneStatusLabel(zone: ZoneOperationalStatus) {
  if (zone.pending_event_count > 0) return '有待处理事件'
  if (zone.open_task_count > 0) return '任务处理中'
  if (zone.input_health === 'offline') return '输入离线'
  if (zone.input_health === 'degraded' || zone.input_health === 'mixed' || zone.input_health === 'unknown') return '输入降级'
  return '运行正常'
}

function liveZoneStatusLabel(zone: LiveZoneViewModel) {
  if (!zone.operationalZone) return '配置待接入'
  return zoneStatusLabel(zone.operationalZone)
}

function zoneRiskScore(zone: ZoneOperationalStatus) {
  return Math.min(100, Math.max(zone.heat, zone.density, zone.queue_minutes * 8))
}

function liveZoneRiskScore(zone: LiveZoneViewModel) {
  if (!zone.operationalZone) {
    return zone.riskLevel === 'high' ? 72 : zone.riskLevel === 'medium' ? 48 : 24
  }

  return zoneRiskScore(zone.operationalZone)
}

function getVisionEventLabel(zoneType: VisionZoneHint) {
  return zoneType === 'booth' ? '展台热度升高' : '入口拥堵'
}

function getSourceIdByKind(zoneType: VisionZoneHint, kind: 'detection-json' | 'tracking-json') {
  return zoneType === 'booth'
    ? kind === 'detection-json'
      ? 'booth-a-detection-replay'
      : 'booth-a-tracking-replay'
    : kind === 'detection-json'
      ? 'entry-detection-replay'
      : 'entry-tracking-replay'
}

function isFrameSatisfied(frame: VisionMetricsFrame | null | undefined, zoneType: VisionZoneHint, thresholds: ReturnType<typeof getVisionConfigByZoneType>['thresholds']) {
  if (!frame) return false

  if (zoneType === 'booth') {
    return (
      frame.peopleCount >= (thresholds.peopleCountThreshold ?? 0) &&
      frame.densityScore >= thresholds.densityThreshold &&
      frame.avgSpeed <= thresholds.avgSpeedThreshold &&
      frame.dwellCount >= (thresholds.dwellCountThreshold ?? 0) &&
      frame.lingerRatio >= (thresholds.lingerRatioThreshold ?? 0)
    )
  }

  return (
    frame.queueLength >= thresholds.queueLengthThreshold &&
    frame.densityScore >= thresholds.densityThreshold &&
    frame.avgSpeed <= thresholds.avgSpeedThreshold &&
    frame.spillover === thresholds.spilloverRequired
  )
}

function buildVisionDebugState(
  metricsTimeline: VisionMetricsFrame[],
  frameIndex: number,
  eventCandidate: VisionEventCandidate | null,
  zoneType: VisionZoneHint,
  thresholds: ReturnType<typeof getVisionConfigByZoneType>['thresholds'],
): VisionDebugState {
  const eventLabel = getVisionEventLabel(zoneType)
  const consecutiveRequired = thresholds.consecutiveWindowsRequired
  const cooldownMs = thresholds.cooldownMs
  const safeIndex = Math.min(Math.max(frameIndex, 0), Math.max(metricsTimeline.length - 1, 0))
  let consecutiveMatches = 0
  let lastTriggeredAt: number | null = null
  let currentState: VisionDebugState = {
    frameSatisfied: false,
    consecutiveMatches: 0,
    cooldownActive: false,
    cooldownMessage: '当前不在冷却期。',
  }

  metricsTimeline.forEach((frame, index) => {
    const frameAt = new Date(frame.timestamp).getTime()
    const frameSatisfied = isFrameSatisfied(frame, zoneType, thresholds)
    const cooldownActive = lastTriggeredAt !== null && frameAt - lastTriggeredAt < cooldownMs

    if (cooldownActive) {
      consecutiveMatches = 0
    } else if (frameSatisfied) {
      consecutiveMatches += 1
    } else {
      consecutiveMatches = 0
    }

    const eventGenerated =
      Boolean(eventCandidate) &&
      frameAt >= new Date((eventCandidate?.signal?.timestamp ?? frame.timestamp) as string).getTime()

    if (!cooldownActive && frameSatisfied && consecutiveMatches >= consecutiveRequired) {
      lastTriggeredAt = frameAt
    }

    if (index === safeIndex) {
      currentState = {
        frameSatisfied,
        consecutiveMatches,
        cooldownActive,
        cooldownMessage: cooldownActive
          ? `当前仍处于冷却期，短时间内不会重复产出第二个${eventLabel}。${eventGenerated ? ' 当前候选事件已生成。' : ''}`
          : eventGenerated
            ? `当前已达到连续窗口确认条件，并生成 ${eventLabel} 候选事件。`
            : '当前不在冷却期。',
      }
    }
  })

  return currentState
}

export function LivePage(props: {
  activeProject?: Project
  dashboardMetrics: LiveMetrics
  eventItems: EventOperationalItem[]
  focusEvent?: EventOperationalItem
  onDispatchEvent: (eventId: string, assigneeId?: string) => void
  onEscalateEvent: (eventId: string) => void
  onLogout: () => void
  onNavigate: (route: RouteState) => void
  onReset: () => void
  onConnectLiveCamera: (request?: { zoneType?: VisionZoneHint }) => void
  onReplayCameraSignal: (request?: { zoneType?: VisionZoneHint }) => void
  onRevokeTask: (taskId: string) => void
  onSimulateSignal: () => void
  role: RoleType
  runtimeSummary: RuntimeOperationalSummary
  session: Session | null
  sourceStatuses: SourceOperationalStatus[]
  zoneStatuses: ZoneOperationalStatus[]
  feedback?: UiFeedbackState | null
  blockedReason?: string
}) {
  const [viewMode, setViewMode] = useState<ViewMode>(props.role === 'brand' ? 'booth' : 'all')
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(props.zoneStatuses[0]?.zone_id ?? null)
  const [agentMode, setAgentMode] = useState<AgentMode>('assist')
  const [executedDecisionIds, setExecutedDecisionIds] = useState<Record<string, true>>({})
  const [persistedAuditRecords, setPersistedAuditRecords] = useState<AgentAuditRecord[]>([])
  const [agentDecision, setAgentDecision] = useState<AgentDecision | null>(null)
  const [visionReplayStatus, setVisionReplayStatus] = useState<VisionReplayStatus>('idle')
  const [visionReplayError, setVisionReplayError] = useState<string>()
  const [liveVisionActive, setLiveVisionActive] = useState(false)
  const [detectionPayload, setDetectionPayload] = useState<VisionDetectionReplayPayload | null>(null)
  const [trackingPayload, setTrackingPayload] = useState<VisionTrackingReplayPayload | null>(null)
  const [metricsTimeline, setMetricsTimeline] = useState<VisionMetricsFrame[]>([])
  const [debugFrameIndex, setDebugFrameIndex] = useState(0)
  const [visionEventCandidate, setVisionEventCandidate] = useState<VisionEventCandidate | null>(null)
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(() => getHighestSeverityAlert()?.alertId ?? null)
  const [demoState, setDemoState] = useState(readDemoState)
  const [demoNotice, setDemoNotice] = useState('')
  const [demoSourceLabel, setDemoSourceLabel] = useState(getRuntimeSourceLabel('local'))

  useEffect(() => {
    let cancelled = false

    getCurrentTask().then((result) => {
      if (cancelled) return
      setDemoState(result.data)
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

  const liveZoneModels = useMemo(
    () => buildLiveZoneViewModels(props.zoneStatuses, props.eventItems, props.sourceStatuses),
    [props.eventItems, props.sourceStatuses, props.zoneStatuses],
  )
  const visibleZoneModels = useMemo(
    () => (viewMode === 'booth' ? liveZoneModels.filter((zone) => zone.zoneType === 'booth') : liveZoneModels),
    [liveZoneModels, viewMode],
  )
  const visibleOperationalZoneIds = new Set(
    visibleZoneModels.map((zone) => zone.operationalZone?.zone_id ?? zone.zoneId),
  )
  const visibleEvents = props.eventItems.filter((item) => visibleOperationalZoneIds.has(item.event.zone_id))
  const visibleSources = props.sourceStatuses.filter((source) => !source.zone_id || visibleOperationalZoneIds.has(source.zone_id))
  const monitorSources = listMonitorSources()
  const monitoringAlerts = listMonitoringAlerts()
  const monitorSourceSummary = getMonitorSourceSummary()
  const monitoringAlertSummary = getMonitoringAlertSummary()
  const focusedAlert = resolveFocusedAlert(monitoringAlerts, selectedAlertId)
  const focusedMonitorSource = focusedAlert ? monitorSources.find((source) => source.sourceId === focusedAlert.sourceId) ?? null : null
  const focusedReview = focusedAlert ? getEventReviewByAlertId(focusedAlert.alertId) : null
  const focusedDispatch = focusedReview ? getDispatchRecommendationByReviewId(focusedReview.reviewId) : null
  const focusedMonitorView: FocusedMonitorView = {
    source: focusedMonitorSource,
    alert: focusedAlert,
    review: focusedReview,
    dispatch: focusedDispatch,
  }
  const agentPanelView = buildAgentPanelState(focusedReview, focusedDispatch)
  const monitorCardViews = buildMonitorCards(monitorSources, monitoringAlerts, focusedAlert?.alertId ?? null)
  const priorityQueueItems = listPriorityQueueItems()
  const topPriorityItems = priorityQueueItems.slice(0, 3)
  const priorityQueueSummary = getPriorityQueueSummary()
  const selectedZoneModel =
    visibleZoneModels.find((zone) => zone.zoneId === selectedZoneId || zone.operationalZone?.zone_id === selectedZoneId) ?? visibleZoneModels[0]
  const selectedZone = selectedZoneModel?.operationalZone
  const selectedZoneEvent = selectedZoneModel?.eventItems[0]
  const entryZone = props.zoneStatuses.find((zone) => zone.name === '入口区') ?? props.zoneStatuses[0]
  const stressedZoneCount = visibleZoneModels.filter((zone) => liveZoneRiskScore(zone) >= 70 || zone.eventItems.length > 0).length
  const dispatchableStaffCount = visibleZoneModels.reduce((total, zone) => total + zone.staffingSummary.dispatchable, 0)
  const selectedPrimaryActions = selectedZoneModel?.actionDefinitions.slice(0, 4) ?? []
  const selectedEventDefinitions = selectedZoneModel?.eventDefinitions.slice(0, 4) ?? []
  const selectedStaffCandidates = selectedZoneModel?.staffCandidates ?? []
  const focusEvent = props.focusEvent
  const demoTaskLifecycles = listDemoTaskLifecycles()
  const focusTaskLifecycle =
    getDemoTaskLifecycleById(priorityQueueSummary.topItem?.taskId ?? '') ?? demoTaskLifecycles[0] ?? null
  const focusTaskProgress = focusTaskLifecycle ? getTaskLifecycleProgress(focusTaskLifecycle) : 0
  const feedbackSummary = getFeedbackSummary()
  const latestStaffFeedback =
    (focusTaskLifecycle ? getLatestFeedbackByTaskId(focusTaskLifecycle.taskId) : null) ?? feedbackSummary.latestFeedback ?? null
  const zoneTaskSummaries = visibleZoneModels.slice(0, 4).map((zone) => {
    const zoneQueueItems = priorityQueueItems.filter((item) => item.zoneName === zone.zoneName)
    const activeTasks = zoneQueueItems.filter((item) => item.status !== 'completed').length
    const topItem = zoneQueueItems[0]

    return {
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      status: activeTasks > 0 ? '任务处理中' : zone.eventItems.length > 0 ? '事件观察中' : '稳定',
      activeTasks,
      topPriority: topItem ? getPriorityLabel(topItem.priority) : '待命',
    }
  })
  const closureFlow = ['事件识别', 'Agent 建议', '任务派发', '人员反馈', '审计复盘']
  const currentProjectId = props.activeProject?.project_id ?? null
  const activeVisionZoneType = useMemo<VisionZoneHint>(
    () => (selectedZoneModel?.zoneType === 'booth' || viewMode === 'booth' ? 'booth' : 'entry'),
    [selectedZoneModel?.zoneType, viewMode],
  )
  const activeVisionConfig = useMemo(() => getVisionConfigByZoneType(activeVisionZoneType), [activeVisionZoneType])
  const activeVisionEventLabel = useMemo(() => getVisionEventLabel(activeVisionZoneType), [activeVisionZoneType])

  const agentContext = useMemo(
    () =>
      buildAgentContext({
        mode: agentMode,
        projectId: currentProjectId ?? undefined,
        focusEvent,
        selectedZone,
        entryZoneLabel: entryZone?.name,
        runtimeSummary: props.runtimeSummary,
      }),
    [agentMode, currentProjectId, entryZone?.name, focusEvent, props.runtimeSummary, selectedZone],
  )
  const derivedAuditRecords = useMemo(
    () => (agentDecision ? buildDerivedAgentAuditRecords(agentContext, agentDecision) : []),
    [agentContext, agentDecision],
  )
  const auditScope = useMemo(
    () =>
      agentDecision
        ? {
            projectId: currentProjectId,
            contextId: agentDecision.contextId,
            decisionId: agentDecision.decisionId,
          }
        : null,
    [agentDecision, currentProjectId],
  )
  const agentViewModel = useMemo(
    () => (agentDecision ? buildAgentCockpitViewModel(agentContext, agentDecision, persistedAuditRecords) : null),
    [agentContext, agentDecision, persistedAuditRecords],
  )

  const detectionSource = useMemo(
    () => getVisionInputSource(getSourceIdByKind(activeVisionZoneType, 'detection-json'), activeVisionConfig),
    [activeVisionConfig, activeVisionZoneType],
  )
  const trackingSource = useMemo(
    () => getVisionInputSource(getSourceIdByKind(activeVisionZoneType, 'tracking-json'), activeVisionConfig),
    [activeVisionConfig, activeVisionZoneType],
  )
  const currentMetricsFrame = useMemo(() => {
    if (metricsTimeline.length === 0) return null
    const safeIndex = Math.min(Math.max(debugFrameIndex, 0), metricsTimeline.length - 1)
    return metricsTimeline[safeIndex] ?? null
  }, [debugFrameIndex, metricsTimeline])
  const visionDebugState = useMemo(
    () => buildVisionDebugState(metricsTimeline, debugFrameIndex, visionEventCandidate, activeVisionZoneType, activeVisionConfig.thresholds),
    [activeVisionConfig.thresholds, activeVisionZoneType, debugFrameIndex, metricsTimeline, visionEventCandidate],
  )

  const loadVisionReplayData = useCallback(async () => {
    setVisionReplayStatus('loading')
    setVisionReplayError(undefined)

    try {
      const nextDetectionPayload = await createDetectionReplayDetector(detectionSource).detect(import.meta.env.BASE_URL)
      const nextTrackingPayload = await createTrackingReplayTracker(trackingSource).track(import.meta.env.BASE_URL)
      const nextMetricsTimeline = buildVisionMetricsTimeline(nextTrackingPayload, activeVisionConfig)
      const nextEventCandidate =
        activeVisionZoneType === 'booth'
          ? adaptVisionMetricsToBoothHeatup(
              nextMetricsTimeline,
              currentProjectId ?? 'project-spring-2026',
              selectedZone?.zone_id ?? 'zone-booth-a',
              nextTrackingPayload.cameraId,
              activeVisionConfig.thresholds,
            )
          : adaptVisionMetricsToEntranceCongestion(
              nextMetricsTimeline,
              currentProjectId ?? 'project-spring-2026',
              entryZone?.zone_id ?? 'zone-entry',
              nextTrackingPayload.cameraId,
              activeVisionConfig.thresholds,
            )

      setDetectionPayload(nextDetectionPayload)
      setTrackingPayload(nextTrackingPayload)
      setMetricsTimeline(nextMetricsTimeline)
      setDebugFrameIndex(nextMetricsTimeline.length > 0 ? nextMetricsTimeline.length - 1 : 0)
      setVisionEventCandidate(nextEventCandidate)
      setVisionReplayStatus('ready')
    } catch (error) {
      setVisionReplayStatus('error')
      setVisionReplayError(error instanceof Error ? error.message : '视觉回放加载失败')
    }
  }, [
    activeVisionConfig,
    activeVisionZoneType,
    currentProjectId,
    detectionSource,
    entryZone,
    selectedZone,
    trackingSource,
  ])

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      if (!cancelled) {
        void loadVisionReplayData()
      }
    })

    return () => {
      cancelled = true
    }
  }, [loadVisionReplayData])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const nextDecision = await buildAgentDecision(
          agentContext,
          undefined,
          {
            executedDecisionIds,
          },
        )

        if (!cancelled) {
          setAgentDecision(nextDecision)
        }
      } catch {
        if (!cancelled) {
          setAgentDecision(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [agentContext, executedDecisionIds])

  useEffect(() => {
    if (!auditScope) {
      return
    }

    let cancelled = false

    appendAgentAuditRecords(derivedAuditRecords)
    queueMicrotask(() => {
      if (!cancelled) {
        setPersistedAuditRecords(listAgentAuditRecordsByScope(auditScope))
      }
    })

    return () => {
      cancelled = true
    }
  }, [auditScope, derivedAuditRecords])

  const handleReplayCameraSignal = () => {
    setLiveVisionActive(false)
    props.onReplayCameraSignal({ zoneType: activeVisionZoneType })
    void loadVisionReplayData()
  }

  const handleConnectLiveCamera = async () => {
    const health = await checkLiveVisionHealth()
    if (!health) {
      setVisionReplayStatus('error')
      setVisionReplayError('实时视觉服务未运行。请先启动: python scripts/live-vision-server.py')
      return
    }
    setLiveVisionActive(true)
    setVisionReplayStatus('loading')
    setMetricsTimeline([])
    setTrackingPayload(null)
    props.onConnectLiveCamera({ zoneType: activeVisionZoneType })
  }

  useEffect(() => {
    if (!liveVisionActive) return

    const source = createLiveVisionSource()
    const timer = setInterval(async () => {
      const frame = await source.fetchLatest()
      if (frame) {
        setMetricsTimeline((prev) => {
          const next = [...prev, frame]
          return next.length > 300 ? next.slice(-300) : next
        })
        setVisionReplayStatus('ready')
        setDebugFrameIndex((prev) => prev + 1)
      }
    }, 200)

    return () => clearInterval(timer)
  }, [liveVisionActive])

  const handleAgentPrimaryAction = () => {
    if (!agentDecision) {
      return
    }

    if (!auditScope) {
      return
    }

    const dispatchToolCall = findDispatchToolCall(agentDecision.toolCalls)
    if (!dispatchToolCall || !agentDecision.effectivePrimaryActionEnabled) {
      return
    }

    const alreadyExecuted = Boolean(executedDecisionIds[agentDecision.decisionId])
    const confirmationToolCall = agentDecision.toolCalls.find((toolCall) => toolCall.toolName === 'request_human_confirmation') ?? null
    let approvalGranted = !agentDecision.approvalRequired

    if (agentDecision.approvalRequired && confirmationToolCall) {
      appendAgentAuditRecord(createApprovalRequestedAuditRecord(currentProjectId, agentDecision, confirmationToolCall.toolCallId))
      const approvalResult = executeAgentToolCall({
        context: agentContext,
        decision: agentDecision,
        toolCall: confirmationToolCall,
        alreadyExecuted,
      })
      appendAgentAuditRecord(createApprovalAuditRecordFromResult(currentProjectId, agentDecision, approvalResult))

      const approvalRollback = evaluateAgentRollback({
        decision: agentDecision,
        result: approvalResult,
        takeoverPolicy: {
          takeoverAllowed: Boolean(agentDecision.takeoverAllowed),
          takeoverReason: agentDecision.takeoverReason ?? agentDecision.boundaryReason,
          postTakeoverMode: agentDecision.takeoverPostMode ?? 'assist',
          controlsLocked: Boolean(agentDecision.controlsLocked),
          humanOwnerRequired: Boolean(agentDecision.humanOwnerRequired),
          postActionStateLabel: agentDecision.postActionStateLabel ?? '当前建议等待人工处理',
        },
      })

      if (approvalRollback.rollbackRequired) {
        setAgentMode(approvalRollback.postActionMode)
        appendAgentAuditRecord(createRollbackAuditRecord(currentProjectId, agentDecision, approvalRollback, approvalResult.toolCallId))
      }

      setPersistedAuditRecords(listAgentAuditRecordsByScope(auditScope))
      approvalGranted = approvalResult.status === 'approved'
      if (!approvalGranted) {
        return
      }
    }

    const executionResult = executeAgentToolCall({
      context: agentContext,
      decision: agentDecision,
      toolCall: dispatchToolCall,
      dispatchEvent: props.onDispatchEvent,
      assigneeId: focusEvent?.task?.assignee_id ?? focusEvent?.event.recommended_assignee_id,
      approvalGranted,
      alreadyExecuted,
    })

    if (executionResult.status === 'executed') {
      setExecutedDecisionIds((current) => ({
        ...current,
        [agentDecision.decisionId]: true,
      }))
    }

    appendAgentAuditRecord(createExecutionAuditRecordFromResult(currentProjectId, agentDecision, executionResult))

    const executionRollback = evaluateAgentRollback({
      decision: agentDecision,
      result: executionResult,
      takeoverPolicy: {
        takeoverAllowed: Boolean(agentDecision.takeoverAllowed),
        takeoverReason: agentDecision.takeoverReason ?? agentDecision.boundaryReason,
        postTakeoverMode: agentDecision.takeoverPostMode ?? 'assist',
        controlsLocked: Boolean(agentDecision.controlsLocked),
        humanOwnerRequired: Boolean(agentDecision.humanOwnerRequired),
        postActionStateLabel: agentDecision.postActionStateLabel ?? '当前建议等待人工处理',
      },
    })

    if (executionRollback.rollbackRequired) {
      setAgentMode(executionRollback.postActionMode)
      appendAgentAuditRecord(createRollbackAuditRecord(currentProjectId, agentDecision, executionRollback, executionResult.toolCallId))
    }

    setPersistedAuditRecords(listAgentAuditRecordsByScope(auditScope))
  }

  const handleAgentTakeover = () => {
    if (!agentDecision) {
      return
    }

    if (!auditScope) {
      return
    }

    if (!agentDecision.takeoverAllowed) {
      return
    }

    setAgentMode(agentDecision.takeoverPostMode ?? 'assist')
    appendAgentAuditRecord(createHumanTakeoverAuditRecord(currentProjectId, agentDecision, agentDecision.takeoverReason ?? agentDecision.boundaryReason))
    setPersistedAuditRecords(listAgentAuditRecordsByScope(auditScope))
  }

  const replayPanelProps = {
    status: visionReplayStatus,
    errorMessage: visionReplayError,
    sourceLabel: activeVisionZoneType === 'booth' ? '展台摄像头离线回放' : '入口摄像头离线回放',
    cameraId: trackingPayload?.cameraId ?? activeVisionConfig.sources[0]?.cameraId ?? 'vision-camera-01',
    detectionSource,
    trackingSource,
    detectionFrameCount: detectionPayload?.frames.length ?? 0,
    trackingFrameCount: trackingPayload?.frames.length ?? 0,
    metricsFrameCount: metricsTimeline.length,
    onReload: loadVisionReplayData,
  }

  const debugPanelProps = {
    currentFrame: currentMetricsFrame,
    frameIndex: Math.min(debugFrameIndex, Math.max(metricsTimeline.length - 1, 0)),
    totalFrames: metricsTimeline.length,
    zoneType: activeVisionZoneType,
    thresholds: activeVisionConfig.thresholds,
    frameSatisfied: visionDebugState.frameSatisfied,
    consecutiveMatches: visionDebugState.consecutiveMatches,
    cooldownActive: visionDebugState.cooldownActive,
    cooldownMessage: visionDebugState.cooldownMessage,
    eventCandidate: visionEventCandidate,
  }

  const handleConfirmDemoDispatch = async () => {
    const result = await confirmDispatch()
    setDemoState(result.data)
    setDemoSourceLabel(getRuntimeSourceLabel(result.source))
    setDemoNotice(result.source === 'backend' ? '已通过本地后端服务确认派发，下一步请打开工作人员任务端。' : '已确认派发，下一步请打开工作人员任务端。')
  }

  const handleResetDemoState = async () => {
    const result = await resetDemo()
    setDemoState(result.data)
    setDemoSourceLabel(getRuntimeSourceLabel(result.source))
    setDemoNotice('演示状态已重置，等待项目经理确认派发。')
  }

  const liveGuideStep = inferDemoGuideStep('live', demoState)
  const liveNextPath = getNextDemoPath('live', demoState)
  const liveGuideAction = hasReachedDemoStatus(demoState.taskStatus, 'dispatched') ? '打开工作人员任务端' : liveGuideStep.primaryActionLabel

  const appFrameProps = {
    title: '实时监控',
    subtitle: '实时掌握现场状态、视觉输入与 Agent 建议。',
    current: { page: 'live' as const },
    activeProject: props.activeProject,
    session: props.session,
    role: props.role,
    onNavigate: props.onNavigate,
    onLogout: props.onLogout,
  }

  return (
    <AppFrame {...appFrameProps}>
      <div className="live-board">
        <section className="panel panel-span live-hero-panel" style={{ display: 'grid', gap: '16px' }}>
          <div className="panel-head">
            <div>
              <h3>运行概览</h3>
              <p className="helper-line" style={{ margin: '6px 0 0' }}>
                当前展示 {visibleZoneModels.length} 个区域、{visibleEvents.length} 个可见事件、{visibleSources.length} 个可见输入源。
              </p>
            </div>
            <div className="inline-actions">
              <button onClick={props.onSimulateSignal}>触发 mock 事件</button>
              <button onClick={handleReplayCameraSignal}>回放当前摄像头</button>
              <button onClick={handleConnectLiveCamera}>接入实时摄像头</button>
              <button className="ghost-button" onClick={props.onReset}>
                重置快照
              </button>
            </div>
          </div>

          <div className="live-demo-thread" aria-label="当前演示主线">
            <span>当前事件：入口 A 人流拥堵异常处置</span>
            <strong>{demoState.dispatchConfirmed ? '当前状态：已确认派发' : '下一步：确认派发入口引导员'}</strong>
            <small>本地演示状态：{getDemoTaskStatusLabel(demoState.taskStatus)}。Agent 仅提供建议，最终派发由项目经理确认。</small>
          </div>

          <section className="demo-guide-card demo-guide-card--live" aria-label="演示引导模式">
            <div className="demo-guide-progress">
              <span>演示进度 {liveGuideStep.order} / {demoGuideTotalSteps}</span>
              <strong>{liveGuideStep.title}</strong>
            </div>
            <p>{hasReachedDemoStatus(demoState.taskStatus, 'dispatched') ? '已确认派发，下一步请打开 Mobile H5 进行工作人员处理。' : liveGuideStep.description}</p>
            <div className="demo-guide-status">
              <span>当前状态：{getDemoTaskStatusLabel(demoState.taskStatus)}</span>
              <span>当前事件：{demoState.eventName}</span>
            </div>
            <div className="demo-guide-actions">
              {hasReachedDemoStatus(demoState.taskStatus, 'dispatched') ? (
                <button type="button" onClick={() => { window.location.hash = liveNextPath || '#/mobile' }}>
                  {liveGuideAction}
                </button>
              ) : (
                <button type="button" onClick={handleConfirmDemoDispatch}>
                  {liveGuideAction}
                </button>
              )}
              <button className="demo-guide-reset" type="button" onClick={handleResetDemoState}>
                重置演示状态
              </button>
            </div>
            <small className="demo-guide-muted">当前使用：{demoSourceLabel}；未连接后端时仅在当前浏览器内记录。</small>
            {demoNotice ? <small className="demo-guide-notice">{demoNotice}</small> : null}
          </section>

          <div className="metrics-row summary-strip">
            <div className="metric-card">
              <span>当前视图</span>
              <strong>{viewMode === 'booth' ? '展台视图' : '全局视图'}</strong>
            </div>
            <div className="metric-card">
              <span>高压区域</span>
              <strong>{stressedZoneCount}</strong>
            </div>
            <div className="metric-card">
              <span>当前区域</span>
              <strong>{selectedZoneModel?.zoneName ?? '未选择'}</strong>
            </div>
            <div className="metric-card">
              <span>可调度人员</span>
              <strong>{dispatchableStaffCount}</strong>
            </div>
            <div className="metric-card">
              <span>当前视觉事件</span>
              <strong>{activeVisionEventLabel}</strong>
            </div>
          </div>

          <div className="segmented-control" style={{ width: 'fit-content' }}>
            <button className={viewMode === 'all' ? 'active' : ''} onClick={() => setViewMode('all')}>
              全局视图
            </button>
            <button className={viewMode === 'booth' ? 'active' : ''} onClick={() => setViewMode('booth')}>
              展台视图
            </button>
          </div>
        </section>

        <section className="panel panel-span live-monitor-command-panel">
          <div className="panel-head">
            <div>
              <h3>总监控与双 Agent</h3>
              <p className="helper-line" style={{ margin: '6px 0 0' }}>
                多路监控源、告红事件、事件审核 Agent 和派发建议 Agent 仅作为本地演示展示，不执行任务。
              </p>
            </div>
            <span className="status-pill">{monitoringAlertSummary.active} 条活动告警 / {monitoringAlertSummary.managerAttentionRequired} 条待经理复核</span>
          </div>

          <div className="live-monitor-command-summary">
            <span>{monitorSourceSummary.total} 路监控源</span>
            <span>{monitorSourceSummary.critical} 路告红</span>
            <span>{monitoringAlertSummary.critical} 条关键告警</span>
            <span>{monitorSourceSummary.zonesCovered} 个区域</span>
          </div>

          <div className="live-monitor-command-grid">
            <div className="live-monitor-source-grid">
              {monitorCardViews.map((card) => (
                <button
                  key={card.source.sourceId}
                  className={`live-monitor-source-card live-monitor-source-card--${card.alert?.severity ?? card.source.health} ${card.isFocused ? 'active' : ''}`}
                  onClick={() => {
                    if (card.alert) {
                      setSelectedAlertId(card.alert.alertId)
                    }
                    setSelectedZoneId(card.source.zoneId)
                  }}
                >
                  <div className="live-monitor-source-card__top">
                    <span>{card.source.streamLabel}</span>
                    <strong>{card.statusLabel}</strong>
                  </div>
                  <h4>{card.source.sourceName}</h4>
                  <p>{card.alert?.title ?? card.source.lastSignalLabel}</p>
                  <div className="live-monitor-source-card__meta">
                    <span>{card.source.zoneName}</span>
                    <span>{card.source.ownerTeam}</span>
                    <span>{card.source.lastUpdatedLabel}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="live-focused-monitor-panel">
              <article className="live-focused-alert-card">
                <div className="live-closure-card__head">
                  <span>焦点监控</span>
                  <strong>{focusedMonitorView.alert ? monitoringSeverityLabel[focusedMonitorView.alert.severity] : '待命'}</strong>
                </div>
                <h4>{focusedMonitorView.alert?.title ?? focusedMonitorView.source?.sourceName ?? '未选择告警'}</h4>
                <p>{focusedMonitorView.alert?.summary ?? focusedMonitorView.source?.lastSignalLabel ?? '当前所有监控源稳定。'}</p>
                <div className="live-feedback-meta">
                  <span>{focusedMonitorView.source?.streamLabel ?? '无监控源'}</span>
                  <span>{focusedMonitorView.alert ? monitoringStatusLabel[focusedMonitorView.alert.status] : '无告警'}</span>
                  <span>{focusedMonitorView.alert?.timestampLabel ?? focusedMonitorView.source?.lastUpdatedLabel ?? '待处理'}</span>
                </div>
              </article>

              <div className="live-dual-agent-grid">
                <article className="live-agent-review-card">
                  <div className="live-closure-card__head">
                    <span>EventReviewAgent · 异常审核与证据解释</span>
                    <strong>{agentPanelView.review ? getReviewRiskLabel(agentPanelView.review.riskLevel) : '无审核'}</strong>
                  </div>
                  <h4>{agentPanelView.review?.finding.title ?? '等待告警'}</h4>
                  <p>{agentPanelView.review?.finding.whatHappened ?? '请选择异常监控源进行审核。'}</p>
                  <div className="live-agent-evidence-list">
                    {agentPanelView.review?.finding.evidence.slice(0, 2).map((evidence) => (
                      <span key={evidence.evidenceId}>{evidence.label} / {Math.round(evidence.confidence * 100)}%</span>
                    )) ?? <span>无证据</span>}
                  </div>
                  <small>{agentPanelView.review ? reviewHandlingDecisionLabel[agentPanelView.review.handlingDecision] : agentPanelView.reviewSummary}</small>
                </article>

                <article className="live-agent-review-card live-agent-dispatch-card">
                  <div className="live-closure-card__head">
                    <span>DispatchAgent · 处置建议与人员推荐</span>
                    <strong>{agentPanelView.dispatch ? managerConfirmationLabel[agentPanelView.dispatch.managerConfirmationStatus] : '无派发建议'}</strong>
                  </div>
                  <h4>{agentPanelView.dispatch?.recommendedActionLabel ?? '等待派发建议'}</h4>
                  <p>{agentPanelView.dispatch?.recommendedActionDescription ?? 'DispatchAgent 只提供建议，需项目经理确认。'}</p>
                  <div className="live-dispatch-assignee-grid">
                    <span>主执行人：{agentPanelView.primaryAssigneeLabel}</span>
                    <span>备选：{agentPanelView.backupAssigneeLabel}</span>
                  </div>
                  <div className="live-agent-evidence-list">
                    {agentPanelView.dispatch?.reasons.slice(0, 2).map((reason) => (
                      <span key={reason.reasonCode}>{reason.label}</span>
                    )) ?? <span>无派发依据</span>}
                  </div>
                </article>
              </div>

              <div className="live-manager-confirmation-strip">
                <div>
                  <span>项目经理确认</span>
                  <strong>{demoState.dispatchConfirmed ? '已确认派发' : focusedDispatch ? managerConfirmationLabel[focusedDispatch.managerConfirmationStatus] : '等待建议'}</strong>
                  <small>
                    {demoState.dispatchConfirmed
                      ? '已确认派发，任务进入已派发状态。该状态仅在当前浏览器内记录。'
                      : '下一步：确认派发入口引导员。确认后才进入任务状态流；当前不创建真实任务。'}
                  </small>
                </div>
                <div className="live-demo-state-actions">
                  <button disabled={demoState.dispatchConfirmed} onClick={handleConfirmDemoDispatch} type="button">
                    {demoState.dispatchConfirmed ? '已确认派发' : '确认派发入口引导员'}
                  </button>
                  <button className="ghost-button" onClick={handleResetDemoState} type="button">
                    重置演示状态
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel panel-span live-closure-panel">
          <div className="panel-head">
            <div>
              <h3>任务闭环</h3>
              <p className="helper-line" style={{ margin: '6px 0 0' }}>
                优先队列、任务状态流、人员反馈和区域运营状态仅作为展示层。Agent、风控、审计和执行流程不变。
              </p>
            </div>
            <span className="status-pill">{priorityQueueSummary.total} 条排队中 / {priorityQueueSummary.blocked} 条阻塞</span>
          </div>

          <div className="live-closure-flow" aria-label="现场任务流程">
            {closureFlow.map((item, index) => (
              <span key={item}>
                {item}
                {index < closureFlow.length - 1 ? <small>/</small> : null}
              </span>
            ))}
          </div>

          <div className="live-closure-grid">
            <article className="live-closure-card live-closure-card--wide">
              <div className="live-closure-card__head">
                <span>焦点任务</span>
                <strong>{focusTaskLifecycle ? getTaskLifecycleStateLabel(focusTaskLifecycle.currentState) : '无任务'}</strong>
              </div>
              {focusTaskLifecycle ? (
                <>
                  <h4>{focusTaskLifecycle.taskTitle}</h4>
                  <p>{focusTaskLifecycle.eventLabel} / {focusTaskLifecycle.zoneName} / {focusTaskLifecycle.actionLabel}</p>
                  <div className="live-task-progress">
                    <span style={{ width: `${Math.round(focusTaskProgress * 100)}%` }} />
                  </div>
                  <div className="live-task-steps live-task-steps--timeline">
                    {focusTaskLifecycle.steps.map((step) => (
                      <span className={`live-task-step live-task-step--${step.status}`} key={`${focusTaskLifecycle.taskId}-${step.state}`}>
                        <strong>{step.label}</strong>
                        <small>{step.timestampLabel}</small>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="empty-copy">暂无演示任务状态流。</p>
              )}
            </article>

            <article className={`live-closure-card live-feedback-card live-feedback-card--${latestStaffFeedback?.supportRequested ? 'warning' : 'success'}`}>
              <div className="live-closure-card__head">
                <span>人员反馈</span>
                <strong>{latestStaffFeedback ? getFeedbackStatusLabel(latestStaffFeedback.status) : '暂无反馈'}</strong>
              </div>
              <h4>{latestStaffFeedback?.staffName ?? '等待人员反馈'}</h4>
              <p>{latestStaffFeedback?.message ?? '该演示任务暂无现场反馈。'}</p>
              <div className="live-feedback-meta">
                <span>{latestStaffFeedback ? liveStaffRoleLabel[latestStaffFeedback.role] : '未分配'}</span>
                <span>{latestStaffFeedback?.supportRequested ? '已请求支援' : '无需支援'}</span>
                <span>{latestStaffFeedback?.timestampLabel ?? '待处理'}</span>
              </div>
            </article>

            <article className="live-closure-card">
              <div className="live-closure-card__head">
                <span>运营摘要</span>
                <strong>{priorityQueueSummary.topItem ? `#${priorityQueueSummary.topItem.rank}` : '待命'}</strong>
              </div>
              <h4>{priorityQueueSummary.topItem?.eventLabel ?? '无排队任务'}</h4>
              <p>{priorityQueueSummary.topItem ? `${priorityQueueSummary.topItem.actionLabel} / ${priorityQueueSummary.topItem.assigneeLabel}` : '当前视图暂无队列压力。'}</p>
              <div className="live-summary-metrics">
                <span>{feedbackSummary.total} 条反馈</span>
                <span>{feedbackSummary.supportRequested} 条待支援</span>
                <span>{priorityQueueSummary.overdue} 条超时</span>
              </div>
            </article>
          </div>

          {topPriorityItems.length > 0 ? (
            <div className="live-priority-queue">
              {topPriorityItems.map((item) => (
                <article className={`live-priority-item live-priority-item--${item.priority}`} key={item.queueItemId}>
                  <span>#{item.rank}</span>
                  <div>
                    <strong>{getPriorityLabel(item.priority)} / {item.eventLabel}</strong>
                    <small>{item.zoneName} / {item.actionLabel} / {item.assigneeLabel}</small>
                    <small>已耗时 {item.elapsedMinutes} 分钟 / 时限 {item.slaMinutes} 分钟</small>
                  </div>
                  <em>{item.priorityScore}</em>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-copy">当前视图暂无优先队列项。</p>
          )}

          <div className="live-zone-task-strip">
            {zoneTaskSummaries.map((zone) => (
              <article key={zone.zoneId}>
                <span>{zone.zoneName}</span>
                <strong>{zone.status}</strong>
                <small>{zone.activeTasks} 个任务 / {zone.topPriority}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="panel panel-span live-zone-overview-panel">
          <div className="panel-head">
            <div>
              <h3>多区域视图</h3>
              <p className="helper-line" style={{ margin: '6px 0 0' }}>
                按场馆配置展示入口、签到、主展厅、展台、服务台、舞台和应急通道。
              </p>
            </div>
            <span className="status-pill">{visibleZoneModels.length} 个区域</span>
          </div>

          <div className="live-zone-overview-grid">
            {visibleZoneModels.map((zone) => {
              const riskScore = liveZoneRiskScore(zone)
              const isActive = zone.zoneId === selectedZoneModel?.zoneId
              const runtimeStatus = liveZoneStatusLabel(zone)

              return (
                <button
                  key={zone.zoneId}
                  className={`live-zone-card live-zone-card--${zone.riskLevel} ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedZoneId(zone.zoneId)}
                >
                  <div className="live-zone-card__top">
                    <span>{zone.floor}</span>
                    <strong>{riskScore}</strong>
                  </div>
                  <h4>{zone.zoneName}</h4>
                  <p>{zoneTypeLabel[zone.zoneType]} / {zone.ownerTeam}</p>
                  <div className="live-zone-card__bar">
                    <span style={{ width: `${riskScore}%` }} />
                  </div>
                  <div className="live-zone-card__meta">
                    <span>{runtimeStatus}</span>
                    <span>{zone.eventItems.length} 事件</span>
                    <span>{zone.staffingSummary.dispatchable} 可调度</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="live-monitor-shell panel">
          <div className="panel-head">
            <div>
              <h3>视觉输入与回放</h3>
              <p className="helper-line" style={{ margin: '6px 0 0' }}>
{liveVisionActive ? '实时摄像头接入中，持续更新视觉指标。' : '当前以离线摄像头回放驱动视觉指标和事件候选。'}
              </p>
            </div>
            <span className="status-pill">{activeVisionZoneType === 'booth' ? '展台摄像头' : '入口摄像头'}</span>
          </div>
          <div className="live-monitor-viewport">
            {liveVisionActive ? (
              <img
                src="http://127.0.0.1:8765/stream"
                alt="实时摄像头画面"
                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '6px' }}
              />
            ) : (
              <div className="live-monitor-gridline" />
            )}
            <div className="live-monitor-stage">
              <span>{activeVisionZoneType === 'booth' ? '展台 A' : '入口 A'}</span>
              <strong>{activeVisionEventLabel}</strong>
              <small>{trackingPayload?.cameraId ?? activeVisionConfig.sources[0]?.cameraId ?? 'vision-camera-01'}</small>
            </div>
            <div className="live-monitor-badges">
              <span>{metricsTimeline.length} 帧</span>
              <span>{currentMetricsFrame ? formatDateTime(currentMetricsFrame.timestamp) : '等待中'}</span>
            </div>
          </div>
        </section>

        {agentViewModel ? (
          <section className="live-agent-shell">
            <AgentCockpitPanel
              mode={agentMode}
              onModeChange={setAgentMode}
              onPrimaryAction={handleAgentPrimaryAction}
              onTakeover={handleAgentTakeover}
              viewModel={agentViewModel}
            />
          </section>
        ) : null}

        <div className="live-debug-grid">
          <VisionReplayPanel {...replayPanelProps} />
          <VisionDebugPanel {...debugPanelProps} />
        </div>

        <div className="live-split-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '16px' }}>
          <section className="panel" style={{ display: 'grid', gap: '12px' }}>
            <div className="panel-head">
              <h3>当前重点</h3>
              <span>{focusEvent ? severityLabel(focusEvent.event.severity) : '无'}</span>
            </div>
            {focusEvent ? (
              <>
                <div className="chip-row">
                  <span className="chip">区域：{focusEvent.zone_name}</span>
                  <span className="chip">状态：{eventOperationalStateLabel(focusEvent.operational_state)}</span>
                  <span className="chip">来源模式：{String(focusEvent.source_mode)}</span>
                  <span className="chip">快照来源：{(focusEvent as EventOperationalItem & { snapshot_origin_label?: string }).snapshot_origin_label ?? '当前快照'}</span>
                </div>
                <p className="helper-line" style={{ margin: 0 }}>
                  {focusEvent.event.summary}
                </p>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <strong>{focusEvent.event.title}</strong>
                  <span className="helper-line">事件类型：{focusEvent.event.event_type}</span>
                  <span className="helper-line">推荐动作：{focusEvent.event.recommended_action}</span>
                  <span className="helper-line">推荐执行人：{focusEvent.assignee_name ?? focusEvent.event.recommended_assignee_id ?? '待定'}</span>
                  <span className="helper-line">最近反馈：{focusEvent.latest_feedback_label ?? '暂无'}</span>
                  <span className="helper-line">更新时间：{formatDateTime(focusEvent.event.timestamp)}</span>
                </div>
                <div className="inline-actions">
                  <button onClick={() => props.onDispatchEvent(focusEvent.event.event_id, focusEvent.event.recommended_assignee_id)}>
                    直接派发当前事件
                  </button>
                  <button className="ghost-button" onClick={() => props.onEscalateEvent(focusEvent.event.event_id)}>
                    升级事件
                  </button>
                  {focusEvent.task ? (
                    <button className="ghost-button" onClick={() => props.onRevokeTask(focusEvent.task?.task_id ?? '')}>
                      撤销当前任务
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="empty-copy">当前没有焦点事件，系统保持观察。</p>
            )}
          </section>

          <section className="panel" style={{ display: 'grid', gap: '12px' }}>
            <div className="panel-head">
              <h3>当前区域</h3>
              <span>{selectedZoneModel?.zoneName ?? '未选择'}</span>
            </div>
            {selectedZoneModel ? (
              <>
                <div className="metrics-row summary-strip">
                  <div className="metric-card">
                    <span>风险分</span>
                    <strong>{liveZoneRiskScore(selectedZoneModel)}</strong>
                  </div>
                  <div className="metric-card">
                    <span>区域状态</span>
                    <strong>{liveZoneStatusLabel(selectedZoneModel)}</strong>
                  </div>
                  <div className="metric-card">
                    <span>承载容量</span>
                    <strong>{selectedZoneModel.capacity}</strong>
                  </div>
                  <div className="metric-card">
                    <span>配置风险</span>
                    <strong>{riskLevelLabel[selectedZoneModel.riskLevel]}</strong>
                  </div>
                </div>
                <div className="live-zone-profile">
                  <div>
                    <span>责任组</span>
                    <strong>{selectedZoneModel.ownerTeam}</strong>
                  </div>
                  <div>
                    <span>默认角色</span>
                    <strong>{selectedZoneModel.defaultAssigneeRole}</strong>
                  </div>
                  <div>
                    <span>输入源</span>
                    <strong>{selectedZoneModel.sourceStatuses.length}</strong>
                  </div>
                </div>
                {selectedZoneEvent ? (
                  <p className="helper-line" style={{ margin: 0 }}>
                    区域当前重点：{selectedZoneEvent.event.title} / {eventOperationalStateLabel(selectedZoneEvent.operational_state)}
                  </p>
                ) : (
                  <p className="empty-copy">当前区域没有重点事件。</p>
                )}
                {selectedZoneModel.operationalZone ? (
                  <p className="helper-line" style={{ margin: 0 }}>
                    运行指标：密度 {selectedZoneModel.operationalZone.density} / 热度 {selectedZoneModel.operationalZone.heat} / 队列 {selectedZoneModel.operationalZone.queue_minutes} 分钟
                  </p>
                ) : (
                  <p className="empty-copy">该配置区域暂无运行态输入，等待后续接入。</p>
                )}
              </>
            ) : (
              <p className="empty-copy">当前没有可见区域。</p>
            )}
          </section>
        </div>

        <div className="live-split-grid live-capability-grid">
          <section className="panel" style={{ display: 'grid', gap: '12px' }}>
            <div className="panel-head">
              <h3>区域事件模型</h3>
              <span>{selectedEventDefinitions.length} 类</span>
            </div>
            {selectedEventDefinitions.length > 0 ? (
              <div className="live-capability-list">
                {selectedEventDefinitions.map((definition) => (
                  <div key={definition.eventType} className="live-capability-card">
                    <div>
                      <strong>{definition.label}</strong>
                      <span>{definition.eventType}</span>
                    </div>
                    <p>{definition.description}</p>
                    <div className="chip-row">
                      {definition.triggerPointLabels.slice(0, 3).map((label) => (
                        <span key={label} className="chip">{label}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-copy">当前区域没有匹配的事件模型。</p>
            )}
          </section>

          <section className="panel" style={{ display: 'grid', gap: '12px' }}>
            <div className="panel-head">
              <h3>动作与人员</h3>
              <span>{selectedPrimaryActions.length} 个建议动作</span>
            </div>
            <div className="live-action-stack">
              {selectedPrimaryActions.map((action) => (
                <div key={action.actionKey} className="live-action-card">
                  <div>
                    <strong>{action.label}</strong>
                    <span>{actionCategoryLabel[action.category]} / {actionPriorityLabel[action.defaultPriority]}</span>
                  </div>
                  <p>{action.description}</p>
                </div>
              ))}
            </div>
            <div className="live-staff-strip">
              {selectedStaffCandidates.length > 0 ? (
                selectedStaffCandidates.map((staff) => (
                  <div key={staff.staffId} className="live-staff-pill">
                    <strong>{staff.displayName}</strong>
                    <span>{staffAvailabilityLabel[staff.availability]} / 负载 {staff.loadScore}</span>
                  </div>
                ))
              ) : (
                <p className="empty-copy">当前区域暂无可调度人员。</p>
              )}
            </div>
          </section>
        </div>

        <div className="live-split-grid live-event-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <section className="panel" style={{ display: 'grid', gap: '12px' }}>
            <div className="panel-head">
              <h3>区域列表</h3>
              <span>{visibleZoneModels.length} 个</span>
            </div>
            {visibleZoneModels.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {visibleZoneModels.map((zone) => (
                  <button
                    key={zone.zoneId}
                    className={`config-card live-zone-row ${zone.zoneId === selectedZoneModel?.zoneId ? 'active' : ''}`}
                    style={{ margin: 0, textAlign: 'left' }}
                    onClick={() => setSelectedZoneId(zone.zoneId)}
                  >
                    <div className="config-head">
                      <strong>{zone.zoneName}</strong>
                      <span>{liveZoneRiskScore(zone)}</span>
                    </div>
                    <p className="helper-line" style={{ margin: 0 }}>
                      {liveZoneStatusLabel(zone)} / {zoneTypeLabel[zone.zoneType]} / {zone.ownerTeam}
                    </p>
                    <p className="helper-line" style={{ margin: '6px 0 0' }}>
                      事件 {zone.eventItems.length} / 输入源 {zone.sourceStatuses.length} / 可调度 {zone.staffingSummary.dispatchable}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-copy">当前没有可见区域。</p>
            )}
          </section>

          <section className="panel" style={{ display: 'grid', gap: '12px' }}>
            <div className="panel-head">
              <h3>事件中心</h3>
              <span>{visibleEvents.length} 条</span>
            </div>
            {visibleEvents.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {visibleEvents.map((item) => (
                  <div key={item.event.event_id} className="config-card" style={{ margin: 0 }}>
                    <div className="config-head">
                      <strong>{item.event.title}</strong>
                      <span>{severityLabel(item.event.severity)}</span>
                    </div>
                    <p className="helper-line" style={{ margin: 0 }}>
                      {item.zone_name} / {eventOperationalStateLabel(item.operational_state)} / {(item as EventOperationalItem & { snapshot_origin_label?: string }).snapshot_origin_label ?? '当前快照'}
                    </p>
                    <p className="helper-line" style={{ margin: '6px 0 0' }}>
                      {item.event.summary}
                    </p>
                    <p className="helper-line" style={{ margin: '6px 0 0' }}>
                      最近反馈：{item.latest_feedback_label ?? '暂无'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-copy">当前没有可见事件。</p>
            )}
          </section>
        </div>

        <section className="panel panel-span" style={{ display: 'grid', gap: '12px' }}>
          <div className="panel-head">
            <h3>输入源摘要</h3>
            <span>{visibleSources.length} 个</span>
          </div>
          {visibleSources.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {visibleSources.map((source) => (
                <div key={source.source_id} className="config-card" style={{ margin: 0 }}>
                  <div className="config-head">
                    <strong>{source.name}</strong>
                    <span>{String((source as SourceOperationalStatus & { connector_status?: string }).connector_status ?? 'unknown')}</span>
                  </div>
                  <p className="helper-line" style={{ margin: 0 }}>
                    类型：{String(source.source_type)} / 模式：{String((source as SourceOperationalStatus & { mode?: string }).mode ?? 'unknown')} / 健康度：{String((source as SourceOperationalStatus & { connector_status?: string }).connector_status ?? 'unknown')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-copy">当前没有可见输入源。</p>
          )}
        </section>
      </div>
    </AppFrame>
  )
}

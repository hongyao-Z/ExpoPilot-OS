import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { defaultSystemSettings, isProjectOperationallyReady, roleProfiles, routeGuard, SESSION_KEY, SETTINGS_KEY } from './app-config'
import { ConfigPage } from './components/ConfigPage'
import { DispatchPage } from './components/DispatchPage'
import { EventCenterPage } from './components/EventCenterPage'
import { ExplainPage } from './components/ExplainPage'
import { LivePage } from './components/LivePage'
import { LoginPage } from './components/LoginPage'
import { MobileShowcasePage } from './components/MobileShowcasePage'
import { PeoplePage } from './components/PeoplePage'
import { ProjectsPage } from './components/ProjectsPage'
import { ReplayPage } from './components/ReplayPage'
import { SettingsPage } from './components/SettingsPage'
import { StaffPage } from './components/StaffPage'
import { StrategiesPage } from './components/StrategiesPage'
import type { EventOperationalItem, ExpoPilotSnapshot, RoleType, Session, SnapshotSourceOrigin, SystemSettings, Task, UiFeedbackState, Zone } from './domain/types'
import { parseRoute, toHash, type RouteState } from './lib/router'
import { loadJson, removeKey, saveJson } from './lib/storage'
import {
  selectEventOperationalItems,
  selectLiveMetrics,
  selectProjectScope,
  selectProjectSummaries,
  selectRuntimeOperationalSummary,
  selectSourceOperationalStatuses,
  selectStaffStatuses,
  selectTaskOperationalItems,
  selectZoneOperationalStatuses,
} from './selectors/dashboard-selectors'
import {
  addZoneAction,
  confirmEventAction,
  createManualEventAction,
  createProjectAction,
  dispatchEventAction,
  escalateEventAction,
  fallbackSourceAction,
  ignoreEventAction,
  markReportExportedAction,
  reassignStaffZoneAction,
  removeZoneAction,
  revokeTaskAction,
  saveStrategyAction,
  simulateSignalAction,
  updateSettingsAction,
  updateSourceStatusAction,
  updateTaskStatusAction,
  updateZoneAction,
} from './services/action-service'
import { localAgentGateway } from './services/agent-gateway'
import { localAuthGateway } from './services/auth-gateway'
import { localNotificationGateway } from './services/notification-gateway'
import { createEmbeddedSnapshotState, createSnapshotState, loadBootstrapSnapshotState, loadPersistedSnapshotState, saveSnapshot } from './services/snapshot-service'
import { buildVisionMetricsTimeline } from './lib/vision-metrics'
import { createTrackingReplayTracker } from './lib/vision-tracker'
import { ENTRY_CAMERA_VISION_CONFIG, getVisionConfigByZoneType, getVisionInputSource } from './lib/vision-config'
import { adaptVisionMetricsToBoothHeatup, adaptVisionMetricsToEntranceCongestion, adaptVisionSignalsToEntranceCongestion } from './lib/vision-event-adapter'
import { loadVisionReplaySignals } from './lib/vision-signal-normalizer'
import type { VisionEventCandidate, VisionZoneHint } from './lib/vision-types'
import { createLiveVisionSource, checkLiveVisionHealth, clearLiveTimeline, getLiveTimelineBuffer } from './lib/vision-live-source'

function resolveUiVariant() {
  return new URLSearchParams(window.location.search).get('ui') === 'designcode' ? 'designcode' : 'classic'
}

interface CameraReplayRequest {
  zoneType?: VisionZoneHint
}

function buildCameraReplayEventMeta(candidate: VisionEventCandidate) {
  if (candidate.signal.signal_type === 'booth_heatup') {
    return {
      title: '展台摄像头感知到升温',
      sourceLabel: '展台摄像头离线回放',
      recommendedAction: '支援接待',
      successMessage: '已回放展台摄像头信号并生成 camera 来源的 booth_heatup 事件。',
      blockingReason: '当前事件来自展台摄像头离线回放，建议主管先确认后再进入调度。',
    }
  }

  return {
    title: '入口摄像头感知到拥堵',
    sourceLabel: '入口摄像头离线回放',
    recommendedAction: '补位',
    successMessage: '已回放入口摄像头信号并生成 camera 来源的入口拥堵事件。',
    blockingReason: '当前事件来自入口摄像头离线回放，建议主管先确认后再进入调度。',
  }
}

function App() {
  const [snapshotState, setSnapshotState] = useState(() => loadPersistedSnapshotState() ?? createEmbeddedSnapshotState())
  const [session, setSession] = useState<Session | null>(() => loadJson<Session>(SESSION_KEY))
  const [settings, setSettings] = useState<SystemSettings>(() => loadJson<SystemSettings>(SETTINGS_KEY) ?? defaultSystemSettings)
  const [route, setRoute] = useState<RouteState>(() => parseRoute(window.location.hash))
  const [feedback, setFeedback] = useState<UiFeedbackState | null>(null)
  const [loading, setLoading] = useState(false)
  const uiVariant = useMemo(() => resolveUiVariant(), [])

  const snapshot = snapshotState.snapshot

  const commitSnapshot = useCallback((next: ExpoPilotSnapshot, nextFeedback?: UiFeedbackState, origin: SnapshotSourceOrigin = 'persisted') => {
    setSnapshotState(createSnapshotState(next, origin))
    saveSnapshot(next)
    if (nextFeedback) setFeedback(nextFeedback)
  }, [])

  const resetProjectState = useCallback(async () => {
    setLoading(true)
    try {
      const nextState = await loadBootstrapSnapshotState(import.meta.env.BASE_URL)
      commitSnapshot(nextState.snapshot, { kind: 'success', message: '项目快照已重置。', scope: 'global' }, nextState.origin)
    } finally {
      setLoading(false)
    }
  }, [commitSnapshot])

  useEffect(() => {
    document.body.dataset.uiVariant = uiVariant
    return () => {
      delete document.body.dataset.uiVariant
    }
  }, [uiVariant])

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (loadPersistedSnapshotState()) return
    let cancelled = false

    queueMicrotask(() => {
      if (!cancelled) {
        void resetProjectState()
      }
    })

    return () => {
      cancelled = true
    }
  }, [resetProjectState])

  useEffect(() => {
    if (!feedback || feedback.kind === 'idle') return undefined
    const timeout = feedback.kind === 'loading' ? 1600 : 2600
    const timer = window.setTimeout(() => setFeedback(null), timeout)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const guardedRoute = routeGuard(route, session)

  useEffect(() => {
    const targetHash = toHash(guardedRoute)
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash
    }
  }, [guardedRoute])

  const projectSummaries = useMemo(() => selectProjectSummaries(snapshot, session), [snapshot, session])
  const visibleProjectIds = useMemo(() => new Set(projectSummaries.map((project) => project.project_id)), [projectSummaries])
  const activeProject =
    snapshot.projects.find((project) => project.project_id === guardedRoute.projectId && visibleProjectIds.has(project.project_id)) ??
    snapshot.projects.find((project) => visibleProjectIds.has(project.project_id) && project.status === 'running') ??
    snapshot.projects.find((project) => visibleProjectIds.has(project.project_id))

  const projectScope = useMemo(() => selectProjectScope(snapshot, activeProject?.project_id, session), [snapshot, activeProject?.project_id, session])
  const zoneStatuses = useMemo(() => selectZoneOperationalStatuses(snapshot, activeProject?.project_id, session), [snapshot, activeProject?.project_id, session])
  const sourceStatuses = useMemo(
    () => selectSourceOperationalStatuses(snapshot, activeProject?.project_id, session),
    [snapshot, activeProject?.project_id, session],
  )
  const eventItemsBase = useMemo(() => selectEventOperationalItems(snapshot, activeProject?.project_id, session), [snapshot, activeProject?.project_id, session])
  const eventItems = useMemo(() => decorateCameraEventItems(snapshot, eventItemsBase), [snapshot, eventItemsBase])
  const taskItems = useMemo(() => selectTaskOperationalItems(snapshot, activeProject?.project_id, session), [snapshot, activeProject?.project_id, session])
  const dashboardMetrics = useMemo(() => selectLiveMetrics(snapshot, activeProject?.project_id, session), [snapshot, activeProject?.project_id, session])
  const runtimeSummary = useMemo(
    () => selectRuntimeOperationalSummary(snapshot, activeProject?.project_id, session, snapshotState.metadata),
    [snapshot, activeProject?.project_id, session, snapshotState.metadata],
  )
  const people = useMemo(() => selectStaffStatuses(snapshot, activeProject?.project_id, session), [snapshot, activeProject?.project_id, session])

  const scopedStrategies = projectScope.strategies
  const scopedAuditLogs = projectScope.auditLogs
  const focusEvent = eventItems.find((item) => item.operational_state !== 'closed') ?? eventItems[0]
  const selectedEventItem = eventItems.find((item) => item.event.event_id === guardedRoute.itemId) ?? focusEvent
  const selectedEvent = selectedEventItem?.event
  const report = activeProject ? localAgentGateway.buildReplay(snapshot, activeProject.project_id) : undefined
  const explainResult = selectedEvent ? localAgentGateway.explainEvent(snapshot, selectedEvent.event_id) : undefined
  const workerProfile =
    session?.role === 'staff'
      ? snapshot.staff.find((member) => member.staff_id === session.staffId) ?? snapshot.staff[0]
      : snapshot.staff.find((member) => member.staff_id === 'staff-01') ?? snapshot.staff[0]
  const workerTaskItems = taskItems.filter((item) => item.task.assignee_id === workerProfile?.staff_id)

  const operationalBlocked =
    ['live', 'events', 'dispatch', 'people'].includes(guardedRoute.page) && !isProjectOperationallyReady(snapshot, activeProject?.project_id)
  const blockedReason = operationalBlocked
    ? '当前项目尚未完成区域或数据源配置，不能进入实时运行链路。请先在现场配置页补齐区域、数据源和岗位绑定。'
    : undefined

  function commitSettings(next: SystemSettings, nextFeedback?: UiFeedbackState, nextSnapshot?: ExpoPilotSnapshot) {
    setSettings(next)
    saveJson(SETTINGS_KEY, next)
    if (nextSnapshot) {
      commitSnapshot(nextSnapshot, nextFeedback)
      return
    }
    if (nextFeedback) setFeedback(nextFeedback)
  }

  function navigate(next: RouteState) {
    window.location.hash = toHash(next)
  }

  function loginAs(credentials: FormData, role: RoleType) {
    const profile = roleProfiles.find((item) => item.role === role)
    if (!profile) return
    const nextSession: Session = localAuthGateway.signIn({
      email: String(credentials.get('email') || '').trim() || 'pilot@expopilot.cn',
      password: String(credentials.get('password') || '').trim() || 'ExpoPilot2026',
      role: profile.role,
      displayName: profile.displayName,
      organization_label: profile.organizationLabel,
      orgId: profile.orgId,
      staffId: profile.staffId,
    })
    startTransition(() => {
      setSession(nextSession)
      saveJson(SESSION_KEY, nextSession)
      navigate(nextSession.role === 'staff' ? { page: 'staff' } : { page: 'projects' })
    })
  }

  function logout() {
    setSession(null)
    removeKey(SESSION_KEY)
    navigate({ page: 'login' })
  }

  function createProject(formData: FormData) {
    if (!session) return
    const ownerRole = session.role === 'staff' ? 'agency' : session.role
    const result = createProjectAction(snapshot, ownerRole, session.displayName, formData)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function updateZone(zoneId: string, patch: Partial<Zone>) {
    if (!session) return
    const result = updateZoneAction(snapshot, session.displayName, zoneId, patch)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function addZone(projectId: string, formData: FormData) {
    if (!session) return
    const result = addZoneAction(snapshot, session.displayName, projectId, formData)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function removeZone(zoneId: string) {
    if (!session) return
    const result = removeZoneAction(snapshot, session.displayName, zoneId)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function updateSource(sourceId: string, health: ExpoPilotSnapshot['dataSources'][number]['health']) {
    if (!session) return
    const result = updateSourceStatusAction(snapshot, session.displayName, sourceId, health)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function fallbackSource(sourceId: string) {
    if (!session) return
    const result = fallbackSourceAction(snapshot, session.displayName, sourceId)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function reassignStaffZone(staffId: string, zoneId: string) {
    if (!session) return
    const result = reassignStaffZoneAction(snapshot, session.displayName, staffId, zoneId)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function createManualEvent(formData: FormData) {
    if (!session || !activeProject) return
    const result = createManualEventAction(snapshot, session.displayName, activeProject.project_id, localAgentGateway, formData)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function confirmEvent(eventId: string) {
    if (!session) return
    const result = confirmEventAction(snapshot, session.displayName, eventId)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function ignoreEvent(eventId: string) {
    if (!session) return
    const result = ignoreEventAction(snapshot, session.displayName, eventId)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function escalateEvent(eventId: string) {
    if (!session) return
    const result = escalateEventAction(snapshot, session.displayName, eventId)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function dispatchEvent(eventId: string, assigneeId?: string) {
    if (!session) return
    const result = dispatchEventAction(snapshot, session.displayName, eventId, localAgentGateway, localNotificationGateway, assigneeId)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function retryTask(taskId: string) {
    const item = taskItems.find((taskItem) => taskItem.task.task_id === taskId)
    if (!item) return
    dispatchEvent(item.task.event_id, item.task.assignee_id)
  }

  function revokeTask(taskId: string) {
    if (!session) return
    const result = revokeTaskAction(snapshot, session.displayName, taskId, localNotificationGateway)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function updateTaskStatus(taskId: string, status: Task['status']) {
    if (!session) return
    const result = updateTaskStatusAction(snapshot, session.displayName, taskId, status, localNotificationGateway)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function simulateSignal() {
    if (!session || !activeProject) return
    const result = simulateSignalAction(snapshot, session.displayName, localAgentGateway, activeProject.project_id)
    commitSnapshot(result.snapshot, result.feedback)
  }

  async function replayCameraSignal(request?: CameraReplayRequest) {
    if (!session || !activeProject) return

    const zoneType = request?.zoneType === 'booth' ? 'booth' : 'entry'
    const visionConfig = getVisionConfigByZoneType(zoneType)
    const targetZone = projectScope.zones.find((zone) => zone.zone_type === zoneType)

    if (!targetZone) {
      setFeedback({
        kind: 'error',
        message: zoneType === 'booth' ? '当前项目缺少展台区，无法接入展台摄像头离线回放。' : '当前项目缺少入口区，无法接入入口摄像头离线回放。',
        scope: 'global',
      })
      return
    }

    setLoading(true)
    setFeedback({
      kind: 'loading',
      message: zoneType === 'booth' ? '正在回放展台摄像头离线信号。' : '正在回放入口摄像头离线信号。',
      scope: 'global',
    })

    try {
      const existingCameraSignals = snapshot.signals.filter(
        (signal) => signal.source.startsWith('camera:') && signal.zone_id === targetZone.zone_id,
      )
      let candidate: VisionEventCandidate | null = null

      try {
        const trackingSource = getVisionInputSource(
          zoneType === 'booth' ? 'booth-a-tracking-replay' : 'entry-tracking-replay',
          visionConfig,
        )
        const trackingReplay = await createTrackingReplayTracker(trackingSource).track(import.meta.env.BASE_URL)
        const metricsTimeline = buildVisionMetricsTimeline(trackingReplay, visionConfig)
        candidate =
          zoneType === 'booth'
            ? adaptVisionMetricsToBoothHeatup(
                metricsTimeline,
                activeProject.project_id,
                targetZone.zone_id,
                trackingReplay.cameraId,
                visionConfig.thresholds,
                existingCameraSignals,
              )
            : adaptVisionMetricsToEntranceCongestion(
                metricsTimeline,
                activeProject.project_id,
                targetZone.zone_id,
                trackingReplay.cameraId,
                visionConfig.thresholds,
                existingCameraSignals,
              )
      } catch (metricsError) {
        console.warn('camera metrics replay failed, falling back to signal replay', metricsError)
      }

      if (!candidate && zoneType === 'entry') {
        const signals = await loadVisionReplaySignals(import.meta.env.BASE_URL, targetZone.zone_id)
        candidate = adaptVisionSignalsToEntranceCongestion(
          signals,
          activeProject.project_id,
          targetZone.zone_id,
          ENTRY_CAMERA_VISION_CONFIG.thresholds,
        )
      }

      if (!candidate) {
        setFeedback({
          kind: 'warning',
          message: zoneType === 'booth' ? '当前回放未达到 booth_heatup 阈值，未生成业务事件。' : '当前回放未达到入口拥堵阈值，未生成业务事件。',
          scope: 'global',
        })
        return
      }

      if (snapshot.signals.some((item) => item.signal_id === candidate.signal.signal_id)) {
        setFeedback({
          kind: 'warning',
          message: zoneType === 'booth' ? '当前展台摄像头回放事件已经注入，无需重复加载。' : '当前入口摄像头回放事件已经注入，无需重复加载。',
          scope: 'global',
        })
        return
      }

      const resolvedEvent = localAgentGateway.resolveEvent(snapshot, candidate.signal)
      const eventMeta = buildCameraReplayEventMeta(candidate)
      const nextEvent = {
        ...resolvedEvent,
        source: candidate.signal.source,
        event_type: candidate.signal.signal_type,
        title: eventMeta.title,
        summary: candidate.signal.summary,
        recommended_action: eventMeta.recommendedAction,
        explanation: `系统根据${eventMeta.sourceLabel}生成 ${candidate.signal.signal_type} 事件：${candidate.triggerPoints.join('、')}。`,
        requires_confirmation: true,
      }
      const nextSnapshot: ExpoPilotSnapshot = {
        ...snapshot,
        signals: [candidate.signal, ...snapshot.signals],
        events: [nextEvent, ...snapshot.events],
      }

      commitSnapshot(nextSnapshot, { kind: 'success', message: eventMeta.successMessage, scope: 'global' })
    } catch (error) {
      console.error(error)
      setFeedback({
        kind: 'error',
        message: zoneType === 'booth' ? '加载展台摄像头离线回放失败。' : '加载入口摄像头离线回放失败。',
        scope: 'global',
      })
    } finally {
      setLoading(false)
    }
  }

  async function connectLiveCamera(request?: CameraReplayRequest) {
    if (!session || !activeProject) return

    const zoneType = request?.zoneType === 'booth' ? 'booth' : 'entry'
    const targetZone = projectScope.zones.find((zone) => zone.zone_type === zoneType)

    if (!targetZone) {
      setFeedback({
        kind: 'error',
        message: zoneType === 'booth' ? '当前项目缺少展台区，无法使用实时摄像头。' : '当前项目缺少入口区，无法使用实时摄像头。',
        scope: 'global',
      })
      return
    }

    const health = await checkLiveVisionHealth()
    if (!health) {
      setFeedback({
        kind: 'error',
        message: '实时视觉服务未运行。请先启动: python scripts/live-vision-server.py',
        scope: 'global',
      })
      return
    }

    setLoading(true)
    clearLiveTimeline()
    const source = createLiveVisionSource()
    const statusMsg = zoneType === 'booth' ? '展台 A 实时摄像头' : '入口实时摄像头'

    setFeedback({ kind: 'loading', message: `正在接入${statusMsg}，收集帧数据…`, scope: 'global' })

    const visionConfigForEvent = getVisionConfigByZoneType(zoneType)
    const existingCameraSignals = snapshot.signals.filter(
      (signal) => signal.source.startsWith('camera:') && signal.zone_id === targetZone.zone_id,
    )

    let pollCount = 0
    const maxPolls = 120
    const pollInterval = 400

    const poll = (): Promise<VisionEventCandidate | null> =>
      new Promise((resolve) => {
        const timer = setInterval(async () => {
          pollCount++
          const latest = await source.fetchLatest()
          if (latest) {
            const buffer = getLiveTimelineBuffer()
            if (buffer.length >= 10) {
              const candidate =
                zoneType === 'booth'
                  ? adaptVisionMetricsToBoothHeatup(buffer, activeProject.project_id, targetZone.zone_id, `${zoneType}-live`, visionConfigForEvent.thresholds, existingCameraSignals)
                  : adaptVisionMetricsToEntranceCongestion(buffer, activeProject.project_id, targetZone.zone_id, `${zoneType}-live`, visionConfigForEvent.thresholds, existingCameraSignals)

              if (candidate) {
                clearInterval(timer)
                resolve(candidate)
                return
              }
            }
          }
          if (pollCount >= maxPolls) {
            clearInterval(timer)
            resolve(null)
          }
        }, pollInterval)
      })

    try {
      const candidate = await poll()

      if (!candidate) {
        clearLiveTimeline()
        setFeedback({
          kind: 'warning',
          message: `实时视觉数据收集完成（${getLiveTimelineBuffer().length} 帧），但未达到${zoneType === 'booth' ? 'booth_heatup' : 'entrance_congestion'}阈值。`,
          scope: 'global',
        })
        return
      }

      if (snapshot.signals.some((item) => item.signal_id === candidate.signal.signal_id)) {
        setFeedback({ kind: 'warning', message: '该实时事件已注入。', scope: 'global' })
        return
      }

      const resolvedEvent = localAgentGateway.resolveEvent(snapshot, candidate.signal)
      const eventMeta = buildCameraReplayEventMeta(candidate)
      const nextEvent = {
        ...resolvedEvent,
        source: candidate.signal.source,
        event_type: candidate.signal.signal_type,
        title: eventMeta.title,
        summary: candidate.signal.summary,
        recommended_action: eventMeta.recommendedAction,
        explanation: `系统根据实时摄像头（${statusMsg}）生成 ${candidate.signal.signal_type} 事件：${candidate.triggerPoints.join('、')}。`,
        requires_confirmation: true,
      }
      const nextSnapshot: ExpoPilotSnapshot = {
        ...snapshot,
        signals: [candidate.signal, ...snapshot.signals],
        events: [nextEvent, ...snapshot.events],
      }

      commitSnapshot(nextSnapshot, { kind: 'success', message: `实时摄像头事件已注入（${statusMsg}）。`, scope: 'global' })
    } catch (error) {
      console.error(error)
      setFeedback({ kind: 'error', message: '实时摄像头接入失败。', scope: 'global' })
    } finally {
      setLoading(false)
    }
  }

  function saveStrategy(eventId: string) {
    if (!session) return
    const result = saveStrategyAction(snapshot, session.displayName, eventId, localAgentGateway)
    commitSnapshot(result.snapshot, result.feedback)
  }

  function updateSettings(patch: Partial<SystemSettings>) {
    if (!session) return
    const nextSettings = { ...settings, ...patch }
    const result = updateSettingsAction(snapshot, session.displayName)
    commitSettings(nextSettings, result.feedback, result.snapshot)
  }

  function exportReplay(projectId?: string) {
    if (!session) return
    const result = markReportExportedAction(snapshot, session.displayName, projectId)
    commitSnapshot(result.snapshot, result.feedback)
    window.setTimeout(() => {
      window.print()
      setFeedback({ kind: 'success', message: '复盘摘要已进入浏览器打印流程。', scope: 'export' })
    }, 200)
  }

  if (guardedRoute.page === 'mobile') {
    return <MobileShowcasePage />
  }

  if (guardedRoute.page === 'login') {
    return <LoginPage roleProfiles={roleProfiles} onLogin={loginAs} authModeLabel={localAuthGateway.descriptor.mode} />
  }

  if (guardedRoute.page === 'projects') {
    return (
      <ProjectsPage
        activeProject={activeProject}
        projects={projectSummaries}
        onCreateProject={createProject}
        onLogout={logout}
        onNavigate={navigate}
        role={session?.role ?? 'organizer'}
        session={session}
        loading={loading}
        feedback={feedback}
      />
    )
  }

  if (guardedRoute.page === 'config' || blockedReason) {
    return (
      <ConfigPage
        activeProject={activeProject}
        addZone={addZone}
        blockedReason={blockedReason}
        fallbackSource={fallbackSource}
        onLogout={logout}
        onNavigate={navigate}
        reassignStaffZone={reassignStaffZone}
        removeZone={removeZone}
        role={session?.role ?? 'organizer'}
        session={session}
        snapshot={snapshot}
        updateSource={updateSource}
        updateZone={updateZone}
        feedback={feedback}
      />
    )
  }

  if (guardedRoute.page === 'live') {
    return (
      <LivePage
        activeProject={activeProject}
        dashboardMetrics={dashboardMetrics}
        eventItems={eventItems}
        focusEvent={focusEvent}
        onDispatchEvent={dispatchEvent}
        onEscalateEvent={escalateEvent}
        onLogout={logout}
        onNavigate={navigate}
        onReset={resetProjectState}
        onConnectLiveCamera={connectLiveCamera}
        onReplayCameraSignal={replayCameraSignal}
        onRevokeTask={revokeTask}
        onSimulateSignal={simulateSignal}
        role={session?.role ?? 'organizer'}
        runtimeSummary={runtimeSummary}
        session={session}
        sourceStatuses={sourceStatuses}
        zoneStatuses={zoneStatuses}
        feedback={feedback}
        blockedReason={blockedReason}
      />
    )
  }

  if (guardedRoute.page === 'events') {
    return (
      <EventCenterPage
        activeProject={activeProject}
        eventItems={eventItems}
        zones={projectScope.zones}
        role={session?.role ?? 'organizer'}
        session={session}
        onNavigate={navigate}
        onLogout={logout}
        onDispatchEvent={dispatchEvent}
        onConfirmEvent={confirmEvent}
        onIgnoreEvent={ignoreEvent}
        onEscalateEvent={escalateEvent}
        onCreateManualEvent={createManualEvent}
        feedback={feedback}
      />
    )
  }

  if (guardedRoute.page === 'dispatch') {
    return (
      <DispatchPage
        activeProject={activeProject}
        eventItems={eventItems}
        taskItems={taskItems}
        role={session?.role ?? 'organizer'}
        session={session}
        onNavigate={navigate}
        onLogout={logout}
        onDispatchEvent={dispatchEvent}
        onEscalateEvent={escalateEvent}
        onRetryTask={retryTask}
        onRevokeTask={revokeTask}
        feedback={feedback}
      />
    )
  }

  if (guardedRoute.page === 'people') {
    return (
      <PeoplePage
        activeProject={activeProject}
        snapshot={snapshot}
        people={people}
        role={session?.role ?? 'organizer'}
        session={session}
        onNavigate={navigate}
        onLogout={logout}
        feedback={feedback}
      />
    )
  }

  if (guardedRoute.page === 'explain') {
    return (
      <ExplainPage
        activeProject={activeProject}
        selectedEvent={selectedEvent}
        explainResult={explainResult}
        onDispatchEvent={dispatchEvent}
        onLogout={logout}
        onNavigate={navigate}
        onEscalateEvent={escalateEvent}
        role={session?.role ?? 'organizer'}
        snapshot={snapshot}
        session={session}
        feedback={feedback}
      />
    )
  }

  if (guardedRoute.page === 'replay') {
    return (
      <ReplayPage
        activeProject={activeProject}
        auditLogs={scopedAuditLogs}
        events={eventItems}
        report={report}
        role={session?.role ?? 'organizer'}
        session={session}
        onNavigate={navigate}
        onLogout={logout}
        onExportReport={exportReplay}
        onSaveStrategy={saveStrategy}
        feedback={feedback}
      />
    )
  }

  if (guardedRoute.page === 'strategies') {
    return (
      <StrategiesPage
        activeProject={activeProject}
        strategies={scopedStrategies}
        role={session?.role ?? 'organizer'}
        session={session}
        onNavigate={navigate}
        onLogout={logout}
        feedback={feedback}
      />
    )
  }

  if (guardedRoute.page === 'staff') {
    return (
      <StaffPage
        activeProject={activeProject}
        onLogout={logout}
        onNavigate={navigate}
        role={session?.role ?? 'staff'}
        session={session}
        settings={settings}
        taskItems={workerTaskItems}
        updateSettings={updateSettings}
        updateTaskStatus={updateTaskStatus}
        workerProfile={workerProfile}
        feedback={feedback}
      />
    )
  }

  if (guardedRoute.page === 'settings') {
    return (
      <SettingsPage
        activeProject={activeProject}
        gatewayDescriptor={localAgentGateway.descriptor}
        authDescriptor={localAuthGateway.descriptor}
        notificationDescriptor={localNotificationGateway.descriptor}
        connectorStatuses={sourceStatuses}
        onLogout={logout}
        onNavigate={navigate}
        markConnectorHealthy={(sourceId) => updateSource(sourceId, 'online')}
        fallbackConnector={fallbackSource}
        role={session?.role ?? 'organizer'}
        session={session}
        settings={settings}
        snapshot={snapshot}
        snapshotMetadata={snapshotState.metadata}
        updateSettings={updateSettings}
        feedback={feedback}
      />
    )
  }

  return null
}

function decorateCameraEventItems(snapshot: ExpoPilotSnapshot, items: EventOperationalItem[]): EventOperationalItem[] {
  const cameraSignalIds = new Set(snapshot.signals.filter((signal) => signal.source.startsWith('camera:')).map((signal) => signal.signal_id))

  return items.map((item) => {
    const isCameraEvent = item.event.signal_ids.some((signalId) => cameraSignalIds.has(signalId))
    if (!isCameraEvent) return item

    const eventMeta = buildCameraReplayEventMeta({
      signal: {
        signal_type: item.event.event_type,
      },
    } as VisionEventCandidate)
    const nextTriggerPoints = item.trigger_points.includes('source = camera')
      ? item.trigger_points
      : ['source = camera', ...item.trigger_points.filter((rule) => rule !== 'source = recorded')]

    return {
      ...item,
      source_label: eventMeta.sourceLabel,
      source_mode: 'camera' as unknown as EventOperationalItem['source_mode'],
      trigger_points: nextTriggerPoints,
      blocking_reason: eventMeta.blockingReason,
    }
  })
}

export default App








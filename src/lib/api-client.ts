import {
  readDemoState,
  resetDemoState,
  transitionDemoTaskStatus,
  type DemoState,
  type DemoStateHistoryEntry,
  type DemoTaskStatus,
} from './demo-state'

export type DemoRuntimeSource = 'backend' | 'local'

export interface DemoApiResult<T> {
  data: T
  source: DemoRuntimeSource
}

interface BackendTask {
  taskId: string
  eventId: string
  eventName?: string
  taskStatus: DemoTaskStatus
  assigneeName: string
  assigneeRole: string
  dispatchConfirmed: boolean
  lastFeedbackText: string
  updatedAt: string
  history: DemoStateHistoryEntry[]
}

interface BackendReplay {
  event: {
    eventId: string
    eventName: string
    riskLevel: string
    zoneName: string
    evidence: string[]
    createdAt: string
  }
  task: BackendTask
  auditLogs: unknown[]
  replaySummary: {
    whatHappened: string
    whyDetected: string
    whatWasRecommended: string
    whoConfirmed: string
    whoExecuted: string
    result: string
    playbookSuggestion: string
  }
  evidenceChain: string[]
  decisionChain: string[]
  executionChain: DemoStateHistoryEntry[]
  responsibilityChain: string[]
  playbookSuggestion: string
}

interface BackendState {
  event: BackendReplay['event']
  task: BackendTask
  auditLogs: unknown[]
}

export interface DemoReplayResult {
  replay: BackendReplay | null
  state: DemoState
}

const API_BASE = (import.meta.env.VITE_EXPOPILOT_API_BASE ?? '').trim().replace(/\/$/, '')
const taskStatuses = new Set<DemoTaskStatus>([
  'pending_approval',
  'dispatched',
  'accepted',
  'en_route',
  'in_progress',
  'feedback_submitted',
  'archived',
])

export function isBackendApiConfigured() {
  return API_BASE.length > 0
}

export function getRuntimeSourceLabel(source: DemoRuntimeSource) {
  return source === 'backend' ? '本地后端演示服务' : '本地前端演示状态'
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!isBackendApiConfigured()) return null

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })

    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

function mapBackendTaskToDemoState(task: BackendTask): DemoState {
  const current = readDemoState()
  const safeStatus = taskStatuses.has(task.taskStatus) ? task.taskStatus : current.taskStatus

  return {
    ...current,
    eventId: task.eventId ?? current.eventId,
    eventName: task.eventName ?? current.eventName,
    dispatchConfirmed: task.dispatchConfirmed === true,
    taskStatus: safeStatus,
    assigneeName: task.assigneeName ?? current.assigneeName,
    assigneeRole: task.assigneeRole ?? current.assigneeRole,
    lastFeedbackText: task.lastFeedbackText ?? current.lastFeedbackText,
    updatedAt: task.updatedAt ?? current.updatedAt,
    history: Array.isArray(task.history) ? task.history : current.history,
  }
}

async function withTaskFallback(
  path: string,
  fallback: () => DemoState,
  body?: unknown,
): Promise<DemoApiResult<DemoState>> {
  const backendTask = await requestJson<BackendTask>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (backendTask) {
    return { data: mapBackendTaskToDemoState(backendTask), source: 'backend' }
  }

  return { data: fallback(), source: 'local' }
}

export async function getCurrentTask(): Promise<DemoApiResult<DemoState>> {
  const backendTask = await requestJson<BackendTask>('/api/tasks/current')
  if (backendTask) {
    return { data: mapBackendTaskToDemoState(backendTask), source: 'backend' }
  }

  return { data: readDemoState(), source: 'local' }
}

export function confirmDispatch() {
  return withTaskFallback('/api/tasks/confirm-dispatch', () =>
    transitionDemoTaskStatus('dispatched', {
      label: '项目经理已确认派发入口引导员',
      actorLabel: '项目经理',
      dispatchConfirmed: true,
    }),
  )
}

export function acceptTask() {
  return withTaskFallback('/api/tasks/accept', () =>
    transitionDemoTaskStatus('accepted', {
      label: '工作人员已接收任务',
      actorLabel: '入口引导员 A',
    }),
  )
}

export function markEnRoute() {
  return withTaskFallback('/api/tasks/en-route', () =>
    transitionDemoTaskStatus('en_route', {
      label: '工作人员已到达入口 A 分流点',
      actorLabel: '入口引导员 A',
    }),
  )
}

export function startTask() {
  return withTaskFallback('/api/tasks/start', () =>
    transitionDemoTaskStatus('in_progress', {
      label: '工作人员开始现场分流',
      actorLabel: '入口引导员 A',
    }),
  )
}

export function submitFeedback(feedbackText: string) {
  return withTaskFallback(
    '/api/tasks/feedback',
    () =>
      transitionDemoTaskStatus('feedback_submitted', {
        label: '工作人员已提交完成反馈',
        actorLabel: '入口引导员 A',
        lastFeedbackText: feedbackText,
      }),
    { feedbackText },
  )
}

export async function resetDemo(): Promise<DemoApiResult<DemoState>> {
  const backendState = await requestJson<BackendState>('/api/demo/reset', { method: 'POST' })
  if (backendState) {
    return { data: mapBackendTaskToDemoState(backendState.task), source: 'backend' }
  }

  return { data: resetDemoState(), source: 'local' }
}

export async function getReplay(): Promise<DemoApiResult<DemoReplayResult>> {
  const replay = await requestJson<BackendReplay>('/api/replay/current')
  if (replay) {
    return {
      data: {
        replay,
        state: mapBackendTaskToDemoState(replay.task),
      },
      source: 'backend',
    }
  }

  return {
    data: {
      replay: null,
      state: readDemoState(),
    },
    source: 'local',
  }
}

export async function reviewEvent(input: unknown) {
  return requestJson('/api/agent/review-event', { method: 'POST', body: JSON.stringify(input) })
}

export async function recommendDispatch(input: unknown) {
  return requestJson('/api/agent/recommend-dispatch', { method: 'POST', body: JSON.stringify(input) })
}

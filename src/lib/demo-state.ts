export const DEMO_STATE_STORAGE_KEY = 'expopilot.demo.state.v1'

export type DemoTaskStatus =
  | 'pending_approval'
  | 'dispatched'
  | 'accepted'
  | 'en_route'
  | 'in_progress'
  | 'feedback_submitted'
  | 'archived'

export interface DemoStateHistoryEntry {
  id: string
  status: DemoTaskStatus
  label: string
  actorLabel: string
  timestamp: string
  timestampLabel: string
}

export interface DemoState {
  eventId: string
  eventName: string
  dispatchConfirmed: boolean
  taskStatus: DemoTaskStatus
  assigneeName: string
  assigneeRole: string
  lastFeedbackText: string
  updatedAt: string
  history: DemoStateHistoryEntry[]
}

const STATUS_LABELS: Record<DemoTaskStatus, string> = {
  pending_approval: '待确认',
  dispatched: '已派发',
  accepted: '已接收',
  en_route: '前往中',
  in_progress: '处理中',
  feedback_submitted: '已反馈',
  archived: '已归档',
}

function nowIso() {
  return new Date().toISOString()
}

function formatTimeLabel(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function createHistoryEntry(status: DemoTaskStatus, label: string, actorLabel: string, timestamp = nowIso()): DemoStateHistoryEntry {
  return {
    id: `${status}-${timestamp}`,
    status,
    label,
    actorLabel,
    timestamp,
    timestampLabel: formatTimeLabel(timestamp),
  }
}

export function createDefaultDemoState(): DemoState {
  const timestamp = nowIso()

  return {
    eventId: 'demo-event-entrance-a-congestion',
    eventName: '入口 A 人流拥堵异常处置',
    dispatchConfirmed: false,
    taskStatus: 'pending_approval',
    assigneeName: '入口引导员 A',
    assigneeRole: '工作人员任务端',
    lastFeedbackText: '现场已完成分流，排队长度下降，需要继续观察 5 分钟。',
    updatedAt: timestamp,
    history: [
      createHistoryEntry('pending_approval', '系统识别入口 A 人流拥堵异常，等待项目经理确认派发', 'ExpoPilot OS', timestamp),
    ],
  }
}

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function safeParseDemoState(raw: string | null): DemoState | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<DemoState>
    if (!parsed || parsed.eventId !== 'demo-event-entrance-a-congestion') return null
    if (!parsed.taskStatus || !(parsed.taskStatus in STATUS_LABELS)) return null

    return {
      ...createDefaultDemoState(),
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : createDefaultDemoState().history,
    }
  } catch {
    return null
  }
}

export function readDemoState(): DemoState {
  const storage = getStorage()
  const parsed = safeParseDemoState(storage?.getItem(DEMO_STATE_STORAGE_KEY) ?? null)
  return parsed ?? createDefaultDemoState()
}

export function writeDemoState(state: DemoState) {
  getStorage()?.setItem(DEMO_STATE_STORAGE_KEY, JSON.stringify(state))
  return state
}

export function resetDemoState() {
  return writeDemoState(createDefaultDemoState())
}

export function getDemoTaskStatusLabel(status: DemoTaskStatus) {
  return STATUS_LABELS[status]
}

export function updateDemoState(updater: (state: DemoState) => DemoState) {
  return writeDemoState(updater(readDemoState()))
}

export function transitionDemoTaskStatus(
  status: DemoTaskStatus,
  options: {
    label: string
    actorLabel: string
    dispatchConfirmed?: boolean
    lastFeedbackText?: string
  },
) {
  return updateDemoState((current) => {
    const timestamp = nowIso()

    return {
      ...current,
      dispatchConfirmed: options.dispatchConfirmed ?? current.dispatchConfirmed,
      taskStatus: status,
      lastFeedbackText: options.lastFeedbackText ?? current.lastFeedbackText,
      updatedAt: timestamp,
      history: [...current.history, createHistoryEntry(status, options.label, options.actorLabel, timestamp)],
    }
  })
}

export function appendDemoHistory(label: string, actorLabel: string) {
  return updateDemoState((current) => {
    const timestamp = nowIso()

    return {
      ...current,
      updatedAt: timestamp,
      history: [...current.history, createHistoryEntry(current.taskStatus, label, actorLabel, timestamp)],
    }
  })
}

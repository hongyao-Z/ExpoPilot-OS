import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAuditLogEntry } from '../audit/audit-log.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const DEMO_DB_PATH = path.join(__dirname, 'demo-db.json')

// Local JSON state for the controlled MVP demo. This is not a production
// database, not a cloud sync layer, and must not contain private user data.
export const taskStatusLabels = {
  pending_approval: '待确认',
  dispatched: '已派发',
  accepted: '已接收',
  en_route: '前往中',
  in_progress: '处理中',
  feedback_submitted: '已反馈',
  archived: '已归档',
}

export const taskStatuses = Object.keys(taskStatusLabels)

function nowIso() {
  return new Date().toISOString()
}

function formatTimeLabel(value) {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function createHistoryEntry(status, label, actorLabel, timestamp = nowIso()) {
  return {
    id: `${status}-${timestamp}`,
    status,
    label,
    actorLabel,
    timestamp,
    timestampLabel: formatTimeLabel(timestamp),
  }
}

export function createDefaultState() {
  const timestamp = nowIso()
  const eventId = 'demo-event-entrance-a-congestion'
  const taskId = 'demo-task-entrance-a-guide'

  return {
    event: {
      eventId,
      eventName: '入口 A 人流拥堵异常处置',
      riskLevel: 'medium_high',
      zoneName: '入口 A',
      evidence: [
        '入口 A 人流密度持续上升',
        '排队长度超过预设阈值',
        '闸机设备状态正常',
      ],
      createdAt: timestamp,
    },
    task: {
      taskId,
      eventId,
      eventName: '入口 A 人流拥堵异常处置',
      dispatchConfirmed: false,
      taskStatus: 'pending_approval',
      assigneeName: '入口引导员',
      assigneeRole: '工作人员任务端',
      lastFeedbackText: '现场已完成分流，排队长度下降，需要继续观察 5 分钟。',
      updatedAt: timestamp,
      history: [
        createHistoryEntry('pending_approval', '系统识别入口 A 人流拥堵异常，等待项目经理确认派发', 'ExpoPilot OS', timestamp),
      ],
    },
    auditLogs: [
      createAuditLogEntry({
        actor: 'system',
        action: 'demo_state_initialized',
        source: 'local_demo_db',
        summary: '本地 demo DB 初始化入口 A 人流拥堵异常处置状态。',
        afterStatus: 'pending_approval',
        relatedEventId: eventId,
        relatedTaskId: taskId,
      }),
    ],
  }
}

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.event || !parsed?.task || !Array.isArray(parsed.auditLogs)) return null
    if (!taskStatuses.includes(parsed.task.taskStatus)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveState(state) {
  fs.mkdirSync(path.dirname(DEMO_DB_PATH), { recursive: true })
  fs.writeFileSync(DEMO_DB_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  return state
}

export function loadState() {
  if (!fs.existsSync(DEMO_DB_PATH)) {
    return saveState(createDefaultState())
  }

  const parsed = safeParse(fs.readFileSync(DEMO_DB_PATH, 'utf8'))
  if (!parsed) {
    return saveState(createDefaultState())
  }

  return parsed
}

export function resetState() {
  const state = createDefaultState()
  state.auditLogs.push(
    createAuditLogEntry({
      actor: 'system',
      action: 'reset_demo_state',
      source: 'local_demo_api',
      summary: '演示状态已重置到待确认。',
      afterStatus: 'pending_approval',
      relatedEventId: state.event.eventId,
      relatedTaskId: state.task.taskId,
    }),
  )
  return saveState(state)
}

export function appendAuditLog(input) {
  const state = loadState()
  state.auditLogs.push(createAuditLogEntry(input))
  return saveState(state)
}

export function updateTask(updater, auditInput) {
  const state = loadState()
  const beforeStatus = state.task.taskStatus
  const nextTask = updater({ ...state.task, history: [...state.task.history] })
  const timestamp = nowIso()

  state.task = {
    ...nextTask,
    updatedAt: timestamp,
  }

  if (auditInput) {
    state.auditLogs.push(
      createAuditLogEntry({
        ...auditInput,
        beforeStatus,
        afterStatus: state.task.taskStatus,
        relatedEventId: state.event.eventId,
        relatedTaskId: state.task.taskId,
      }),
    )
  }

  return saveState(state).task
}

export function transitionTask(status, label, actorLabel, auditInput, patch = {}) {
  return updateTask(
    (task) => ({
      ...task,
      ...patch,
      taskStatus: status,
      history: [...task.history, createHistoryEntry(status, label, actorLabel)],
    }),
    auditInput,
  )
}

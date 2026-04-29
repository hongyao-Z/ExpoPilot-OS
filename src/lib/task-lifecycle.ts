import type { Feedback, FeedbackType, Task, TaskStatus } from '../domain/types'
import type { EventActionKey } from './event-action-catalog'
import type { VenueEventType } from './venue-event-types'

export type TaskLifecycleStepState = 'done' | 'current' | 'pending' | 'skipped'
export type TaskLifecycleState =
  | 'suggested'
  | 'pending_approval'
  | 'created'
  | 'dispatched'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'rolled_back'
  | 'closed'

export type DemoTaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface TaskLifecycleStep {
  state: TaskLifecycleState
  label: string
  description: string
  timestampLabel: string
  actorLabel: string
  status: TaskLifecycleStepState
}

export interface DemoTaskLifecycle {
  taskId: string
  taskTitle: string
  eventType: VenueEventType
  eventLabel: string
  zoneId: string
  zoneName: string
  actionKey: EventActionKey
  actionLabel: string
  assigneeId: string
  assigneeLabel: string
  currentState: TaskLifecycleState
  priority: DemoTaskPriority
  steps: TaskLifecycleStep[]
}

export interface TaskLifecycleStepDefinition {
  status: TaskStatus
  label: string
  description: string
  progress: number
  terminal: boolean
}

export interface TaskLifecycleStepView extends TaskLifecycleStepDefinition {
  state: TaskLifecycleStepState
  at?: string
}

export interface TaskLifecycleViewModel {
  taskId: string
  currentStatus: TaskStatus
  currentLabel: string
  progress: number
  isTerminal: boolean
  isException: boolean
  latestFeedback?: Feedback
  latestFeedbackAt?: string
  elapsedMinutes?: number
  responseMinutes?: number
  steps: TaskLifecycleStepView[]
}

export const TASK_LIFECYCLE_STEPS: readonly TaskLifecycleStepDefinition[] = [
  {
    status: 'created',
    label: '已创建',
    description: '任务已生成，等待工作人员接收。',
    progress: 0.15,
    terminal: false,
  },
  {
    status: 'received',
    label: '已接收',
    description: '指定工作人员已接收任务。',
    progress: 0.35,
    terminal: false,
  },
  {
    status: 'processing',
    label: '处理中',
    description: '指定工作人员正在现场处理任务。',
    progress: 0.7,
    terminal: false,
  },
  {
    status: 'completed',
    label: '已完成',
    description: '任务已完成，可用于复盘。',
    progress: 1,
    terminal: true,
  },
  {
    status: 'exception',
    label: '异常',
    description: '任务需要支援、升级或重新分配。',
    progress: 1,
    terminal: true,
  },
] as const

const lifecycleStepMap = new Map<TaskStatus, TaskLifecycleStepDefinition>(
  TASK_LIFECYCLE_STEPS.map((step) => [step.status, step]),
)

const feedbackStatusMap: Partial<Record<FeedbackType, TaskStatus>> = {
  received: 'received',
  processing: 'processing',
  completed: 'completed',
  exception: 'exception',
}

const taskStatusOrder: Record<TaskStatus, number> = {
  created: 0,
  received: 1,
  processing: 2,
  completed: 3,
  exception: 3,
}

const demoTaskLifecycleStateLabels: Record<TaskLifecycleState, string> = {
  suggested: '已建议',
  pending_approval: '待审批',
  created: '已创建',
  dispatched: '已派发',
  in_progress: '处理中',
  blocked: '阻塞',
  completed: '已完成',
  rolled_back: '已回退',
  closed: '已关闭',
}

const demoTaskLifecycleProgress: Record<TaskLifecycleState, number> = {
  suggested: 0.08,
  pending_approval: 0.18,
  created: 0.3,
  dispatched: 0.42,
  in_progress: 0.68,
  blocked: 0.72,
  completed: 0.88,
  rolled_back: 0.88,
  closed: 1,
}

export const DEMO_TASK_LIFECYCLES: readonly DemoTaskLifecycle[] = [
  {
    taskId: 'demo-task-entrance-fill-position',
    taskTitle: '入口拥堵补位任务',
    eventType: 'entrance_congestion',
    eventLabel: '入口拥堵',
    zoneId: 'zone-entrance-a',
    zoneName: '入口 A',
    actionKey: 'fill_position',
    actionLabel: '入口补位',
    assigneeId: 'staff-entrance-01',
    assigneeLabel: '入口引导员 A',
    currentState: 'in_progress',
    priority: 'high',
    steps: [
      {
        state: 'suggested',
        label: '已建议',
        description: '视觉信号和事件规则建议执行入口补位。',
        timestampLabel: 'T+00:00',
        actorLabel: 'ExpoPilot',
        status: 'done',
      },
      {
        state: 'pending_approval',
        label: '待审批',
        description: '派发前由操作员审核建议动作。',
        timestampLabel: 'T+00:15',
        actorLabel: '操作员',
        status: 'done',
      },
      {
        state: 'created',
        label: '已创建',
        description: '已为入口压力事件生成任务记录。',
        timestampLabel: 'T+00:30',
        actorLabel: 'ExpoPilot',
        status: 'done',
      },
      {
        state: 'dispatched',
        label: '已派发',
        description: '入口引导员 A 已接收入口补位任务。',
        timestampLabel: 'T+00:45',
        actorLabel: '指挥台',
        status: 'done',
      },
      {
        state: 'in_progress',
        label: '处理中',
        description: '工作人员正在前往入口，并引导观众分流到备用通道。',
        timestampLabel: 'T+02:10',
        actorLabel: '入口引导员 A',
        status: 'current',
      },
      {
        state: 'completed',
        label: '已完成',
        description: '入口排队已降到预警阈值以下。',
        timestampLabel: '待处理',
        actorLabel: '入口引导员 A',
        status: 'pending',
      },
      {
        state: 'closed',
        label: '已关闭',
        description: '操作员复核后关闭，可直接用于复盘。',
        timestampLabel: '待处理',
        actorLabel: '操作员',
        status: 'pending',
      },
    ],
  },
  {
    taskId: 'demo-task-booth-reception-support',
    taskTitle: '展台热度接待任务',
    eventType: 'booth_heatup',
    eventLabel: '展台热度上升',
    zoneId: 'zone-booth-512',
    zoneName: '展台 512',
    actionKey: 'booth_reception_support',
    actionLabel: '增加展台接待支援',
    assigneeId: 'staff-booth-512-01',
    assigneeLabel: '展台 512 接待 A',
    currentState: 'completed',
    priority: 'medium',
    steps: [
      {
        state: 'suggested',
        label: '已建议',
        description: '展台 512 周边关注度已超过演示阈值。',
        timestampLabel: 'T+00:00',
        actorLabel: 'ExpoPilot',
        status: 'done',
      },
      {
        state: 'created',
        label: '已创建',
        description: '已为展台 512 创建接待支援任务。',
        timestampLabel: 'T+00:20',
        actorLabel: 'ExpoPilot',
        status: 'done',
      },
      {
        state: 'dispatched',
        label: '已派发',
        description: '已指派展台接待负责人处理上升中的观众流量。',
        timestampLabel: 'T+00:35',
        actorLabel: '指挥台',
        status: 'done',
      },
      {
        state: 'in_progress',
        label: '处理中',
        description: '工作人员已建立接待队列，并处理产品咨询。',
        timestampLabel: 'T+01:40',
        actorLabel: '展台 512 接待 A',
        status: 'done',
      },
      {
        state: 'completed',
        label: '已完成',
        description: '展台接待压力已处理，人流恢复稳定。',
        timestampLabel: 'T+05:10',
        actorLabel: '展台 512 接待 A',
        status: 'current',
      },
      {
        state: 'closed',
        label: '已关闭',
        description: '复盘记录已就绪，可用于事后查看。',
        timestampLabel: '待处理',
        actorLabel: '操作员',
        status: 'pending',
      },
    ],
  },
  {
    taskId: 'demo-task-equipment-inspection',
    taskTitle: '设备异常检查任务',
    eventType: 'equipment_issue',
    eventLabel: '设备异常',
    zoneId: 'zone-stage',
    zoneName: '舞台区',
    actionKey: 'dispatch_technical_support',
    actionLabel: '派发技术支持',
    assigneeId: 'staff-tech-01',
    assigneeLabel: '技术支持 A',
    currentState: 'blocked',
    priority: 'critical',
    steps: [
      {
        state: 'suggested',
        label: '已建议',
        description: '舞台设备告警已触发技术支持建议。',
        timestampLabel: 'T+00:00',
        actorLabel: 'ExpoPilot',
        status: 'done',
      },
      {
        state: 'pending_approval',
        label: '待审批',
        description: '操作员确认舞台问题需要技术检查。',
        timestampLabel: 'T+00:10',
        actorLabel: '操作员',
        status: 'done',
      },
      {
        state: 'created',
        label: '已创建',
        description: '技术检查任务已创建。',
        timestampLabel: 'T+00:25',
        actorLabel: 'ExpoPilot',
        status: 'done',
      },
      {
        state: 'dispatched',
        label: '已派发',
        description: '技术支持 A 已派往舞台区。',
        timestampLabel: 'T+00:45',
        actorLabel: '指挥台',
        status: 'done',
      },
      {
        state: 'in_progress',
        label: '处理中',
        description: '技术人员正在检查异常设备和备用方案。',
        timestampLabel: 'T+02:00',
        actorLabel: '技术支持 A',
        status: 'done',
      },
      {
        state: 'blocked',
        label: '阻塞',
        description: '需要替换线缆后才能完成处理。',
        timestampLabel: 'T+03:30',
        actorLabel: '技术支持 A',
        status: 'current',
      },
      {
        state: 'rolled_back',
        label: '已回退',
        description: '如果启用备用设备，操作员可将任务回退到人工处理。',
        timestampLabel: '待处理',
        actorLabel: '操作员',
        status: 'pending',
      },
      {
        state: 'closed',
        label: '已关闭',
        description: '技术确认后完成复核并关闭。',
        timestampLabel: '待处理',
        actorLabel: '操作员',
        status: 'pending',
      },
    ],
  },
] as const

export function listTaskLifecycleSteps() {
  return [...TASK_LIFECYCLE_STEPS]
}

export function getTaskLifecycleStep(status: TaskStatus) {
  return lifecycleStepMap.get(status) ?? TASK_LIFECYCLE_STEPS[0]
}

export function getTaskLifecycleProgress(status: TaskStatus): number
export function getTaskLifecycleProgress(task: DemoTaskLifecycle): number
export function getTaskLifecycleProgress(input: TaskStatus | DemoTaskLifecycle) {
  return typeof input === 'string' ? getTaskLifecycleStep(input).progress : demoTaskLifecycleProgress[input.currentState]
}

export function listDemoTaskLifecycles() {
  return [...DEMO_TASK_LIFECYCLES]
}

export function getDemoTaskLifecycleById(taskId: string) {
  return DEMO_TASK_LIFECYCLES.find((task) => task.taskId === taskId) ?? null
}

export function getTaskLifecycleStateLabel(state: TaskLifecycleState) {
  return demoTaskLifecycleStateLabels[state]
}

export function getActiveTaskLifecycles() {
  return DEMO_TASK_LIFECYCLES.filter((task) => !isDemoTaskLifecycleTerminal(task.currentState))
}

export function getCompletedTaskLifecycles() {
  return DEMO_TASK_LIFECYCLES.filter((task) => task.currentState === 'completed' || task.currentState === 'closed')
}

function isDemoTaskLifecycleTerminal(state: TaskLifecycleState) {
  return state === 'completed' || state === 'rolled_back' || state === 'closed'
}

export function isTaskLifecycleTerminal(status: TaskStatus) {
  return getTaskLifecycleStep(status).terminal
}

export function compareTaskStatus(left: TaskStatus, right: TaskStatus) {
  return taskStatusOrder[left] - taskStatusOrder[right]
}

export function getLatestTaskFeedback(feedback: readonly Feedback[] | undefined) {
  if (!feedback || feedback.length === 0) return undefined

  return [...feedback].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0]
}

export function inferTaskLifecycleStatus(task: Task, feedback: readonly Feedback[] = []) {
  const latestFeedback = getLatestTaskFeedback(feedback)
  const feedbackStatus = latestFeedback ? feedbackStatusMap[latestFeedback.type] : undefined

  if (!feedbackStatus) return task.status
  if (task.status === 'completed' || task.status === 'exception') return task.status
  if (feedbackStatus === 'completed' || feedbackStatus === 'exception') return feedbackStatus

  return compareTaskStatus(feedbackStatus, task.status) > 0 ? feedbackStatus : task.status
}

export function buildTaskLifecycle(task: Task, feedback: readonly Feedback[] = [], now: Date = new Date()): TaskLifecycleViewModel {
  const currentStatus = inferTaskLifecycleStatus(task, feedback)
  const currentStep = getTaskLifecycleStep(currentStatus)
  const latestFeedback = getLatestTaskFeedback(feedback)
  const currentOrder = taskStatusOrder[currentStatus]
  const completedAt = task.completed_at || (currentStatus === 'completed' ? latestFeedback?.timestamp : undefined)
  const terminalAt = completedAt || (currentStatus === 'exception' ? latestFeedback?.timestamp : undefined)
  const responseMinutes = completedAt ? diffMinutes(task.dispatched_at, completedAt) : undefined
  const elapsedEnd = terminalAt ? new Date(terminalAt) : now
  const elapsedMinutes = diffMinutes(task.dispatched_at, elapsedEnd)

  return {
    taskId: task.task_id,
    currentStatus,
    currentLabel: currentStep.label,
    progress: currentStep.progress,
    isTerminal: currentStep.terminal,
    isException: currentStatus === 'exception',
    latestFeedback,
    latestFeedbackAt: latestFeedback?.timestamp,
    elapsedMinutes,
    responseMinutes,
    steps: TASK_LIFECYCLE_STEPS.map((step) => {
      return {
        ...step,
        state: resolveStepState(step.status, currentStatus, currentOrder),
        at: getTaskLifecycleTimestamp(task, step.status, latestFeedback),
      }
    }),
  }
}

export function getTaskLifecycleTimestamp(task: Task, status: TaskStatus, latestFeedback?: Feedback) {
  switch (status) {
    case 'created':
      return task.dispatched_at
    case 'received':
      return task.received_at || feedbackTimestampForStatus(latestFeedback, 'received')
    case 'processing':
      return task.processing_at || feedbackTimestampForStatus(latestFeedback, 'processing')
    case 'completed':
      return task.completed_at || feedbackTimestampForStatus(latestFeedback, 'completed')
    case 'exception':
      return task.status === 'exception' ? latestFeedback?.timestamp : undefined
  }
}

function resolveStepState(status: TaskStatus, currentStatus: TaskStatus, currentOrder: number): TaskLifecycleStepState {
  if (status === currentStatus) return 'current'
  if (currentStatus === 'completed' && status === 'exception') return 'skipped'
  if (currentStatus === 'exception' && status === 'completed') return 'skipped'
  return taskStatusOrder[status] < currentOrder ? 'done' : 'pending'
}

function feedbackTimestampForStatus(feedback: Feedback | undefined, status: TaskStatus) {
  return feedback && feedbackStatusMap[feedback.type] === status ? feedback.timestamp : undefined
}

function diffMinutes(start: string, end: string | Date) {
  const startTime = new Date(start).getTime()
  const endTime = end instanceof Date ? end.getTime() : new Date(end).getTime()

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return undefined
  return Math.max(0, Math.round((endTime - startTime) / 1000 / 60))
}

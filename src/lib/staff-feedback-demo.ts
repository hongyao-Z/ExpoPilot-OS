import type { FeedbackType, TaskStatus } from '../domain/types'

export type StaffFeedbackDemoTone = 'neutral' | 'active' | 'success' | 'warning'

export interface StaffFeedbackDemoStep {
  id: string
  feedbackType: FeedbackType
  taskStatus: TaskStatus
  label: string
  shortLabel: string
  staffName: string
  zoneName: string
  taskTitle: string
  note: string
  timestampLabel: string
  nextAction: string
  tone: StaffFeedbackDemoTone
}

export const STAFF_FEEDBACK_DEMO_STEPS: readonly StaffFeedbackDemoStep[] = [
  {
    id: 'received',
    feedbackType: 'received',
    taskStatus: 'received',
    label: 'Task received',
    shortLabel: 'Received',
    staffName: 'Entry Guide A',
    zoneName: '入口 A',
    taskTitle: '入口补位',
    note: '已收到入口 A 补位任务，正在前往闸口外侧。',
    timestampLabel: 'T+00:20',
    nextAction: '等待现场到位',
    tone: 'neutral',
  },
  {
    id: 'processing',
    feedbackType: 'processing',
    taskStatus: 'processing',
    label: 'Processing on site',
    shortLabel: 'Processing',
    staffName: 'Entry Guide A',
    zoneName: '入口 A',
    taskTitle: '入口补位',
    note: '已到达入口 A，正在拆分排队人流并引导观众进入备用通道。',
    timestampLabel: 'T+02:10',
    nextAction: '持续观察队列变化',
    tone: 'active',
  },
  {
    id: 'completed',
    feedbackType: 'completed',
    taskStatus: 'completed',
    label: 'Task completed',
    shortLabel: 'Completed',
    staffName: 'Entry Guide A',
    zoneName: '入口 A',
    taskTitle: '入口补位',
    note: '备用通道已打开，入口队列下降，现场任务完成。',
    timestampLabel: 'T+05:40',
    nextAction: '进入复盘链路',
    tone: 'success',
  },
  {
    id: 'exception',
    feedbackType: 'exception',
    taskStatus: 'exception',
    label: 'Exception reported',
    shortLabel: 'Exception',
    staffName: 'Entry Guide A',
    zoneName: '入口 A',
    taskTitle: '入口补位',
    note: '入口外侧仍有团体集中到达，需要主管增派第二名引导员。',
    timestampLabel: 'T+03:30',
    nextAction: '升级主管处理',
    tone: 'warning',
  },
] as const

export function listStaffFeedbackDemoSteps() {
  return [...STAFF_FEEDBACK_DEMO_STEPS]
}

export function getDefaultStaffFeedbackDemoStep() {
  return STAFF_FEEDBACK_DEMO_STEPS[1]
}

export function getStaffFeedbackDemoStep(id: string) {
  return STAFF_FEEDBACK_DEMO_STEPS.find((step) => step.id === id) ?? getDefaultStaffFeedbackDemoStep()
}

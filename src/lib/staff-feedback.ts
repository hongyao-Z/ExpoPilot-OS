import type { StaffRole } from './staff-pool'

export type StaffFeedbackStatus =
  | 'acknowledged'
  | 'arrived'
  | 'in_progress'
  | 'need_support'
  | 'completed'
  | 'blocked'
  | 'unable_to_handle'

export interface StaffFeedback {
  feedbackId: string
  taskId: string
  staffId: string
  staffName: string
  role: StaffRole | 'project_manager'
  status: StaffFeedbackStatus
  message: string
  timestampLabel: string
  locationLabel: string
  supportRequested: boolean
  attachmentsCount: number
}

export interface StaffFeedbackSummary {
  total: number
  supportRequested: number
  completed: number
  blocked: number
  unableToHandle: number
  latestFeedback?: StaffFeedback
}

const feedbackStatusLabels: Record<StaffFeedbackStatus, string> = {
  acknowledged: '已确认',
  arrived: '已到达',
  in_progress: '处理中',
  need_support: '需要支援',
  completed: '已完成',
  blocked: '阻塞',
  unable_to_handle: '无法处理',
}

export const DEMO_STAFF_FEEDBACK: readonly StaffFeedback[] = [
  {
    feedbackId: 'feedback-entrance-arrived',
    taskId: 'demo-task-entrance-fill-position',
    staffId: 'staff-entrance-01',
    staffName: '入口引导员 A',
    role: 'entrance_guide',
    status: 'arrived',
    message: '已到达入口 A，开始引导观众分流到备用通道。',
    timestampLabel: 'T+01:20',
    locationLabel: '入口 A',
    supportRequested: false,
    attachmentsCount: 0,
  },
  {
    feedbackId: 'feedback-booth-processing',
    taskId: 'demo-task-booth-reception-support',
    staffId: 'staff-booth-512-01',
    staffName: '展台 512 接待 A',
    role: 'booth_reception',
    status: 'in_progress',
    message: '接待队列已建立，正在处理观众咨询。',
    timestampLabel: 'T+02:40',
    locationLabel: '展台 512',
    supportRequested: false,
    attachmentsCount: 1,
  },
  {
    feedbackId: 'feedback-tech-need-support',
    taskId: 'demo-task-equipment-inspection',
    staffId: 'staff-tech-01',
    staffName: '技术支持 A',
    role: 'technical_support',
    status: 'need_support',
    message: '舞台设备检查发现缺少替换线缆，需要后备支援。',
    timestampLabel: 'T+03:30',
    locationLabel: '舞台区',
    supportRequested: true,
    attachmentsCount: 2,
  },
  {
    feedbackId: 'feedback-security-completed',
    taskId: 'demo-task-emergency-passage-clearance',
    staffId: 'staff-security-01',
    staffName: '安保 A',
    role: 'security_guard',
    status: 'completed',
    message: '应急通道已清空，人流已恢复正常路线。',
    timestampLabel: 'T+04:50',
    locationLabel: '应急通道',
    supportRequested: false,
    attachmentsCount: 1,
  },
  {
    feedbackId: 'feedback-volunteer-unable',
    taskId: 'demo-task-registration-backup',
    staffId: 'staff-registration-01',
    staffName: '签到负责人',
    role: 'registration_volunteer',
    status: 'unable_to_handle',
    message: '当前签到台负载过高，无法离岗支援。',
    timestampLabel: 'T+05:15',
    locationLabel: '签到区',
    supportRequested: true,
    attachmentsCount: 0,
  },
  {
    feedbackId: 'feedback-manager-closed',
    taskId: 'demo-task-booth-reception-support',
    staffId: 'staff-manager-01',
    staffName: '项目经理',
    role: 'project_manager',
    status: 'completed',
    message: '展台接待任务已确认关闭，可进入复盘查看。',
    timestampLabel: 'T+07:00',
    locationLabel: '指挥台',
    supportRequested: false,
    attachmentsCount: 0,
  },
] as const

export function listStaffFeedback() {
  return [...DEMO_STAFF_FEEDBACK]
}

export function getFeedbackByTaskId(taskId: string) {
  return DEMO_STAFF_FEEDBACK.filter((feedback) => feedback.taskId === taskId)
}

export function getLatestFeedbackByTaskId(taskId: string) {
  return getFeedbackByTaskId(taskId).at(-1) ?? null
}

export function getFeedbackStatusLabel(status: StaffFeedbackStatus) {
  return feedbackStatusLabels[status]
}

export function getFeedbackSummary(): StaffFeedbackSummary {
  const feedback = listStaffFeedback()

  return {
    total: feedback.length,
    supportRequested: feedback.filter((item) => item.supportRequested).length,
    completed: feedback.filter((item) => item.status === 'completed').length,
    blocked: feedback.filter((item) => item.status === 'blocked' || item.status === 'need_support').length,
    unableToHandle: feedback.filter((item) => item.status === 'unable_to_handle').length,
    latestFeedback: feedback.at(-1),
  }
}

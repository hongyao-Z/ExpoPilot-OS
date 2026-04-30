import type { DemoState, DemoTaskStatus } from './demo-state'

export type DemoGuidePage = 'login' | 'live' | 'mobile' | 'replay'

export interface DemoGuideStep {
  id: string
  order: number
  page: DemoGuidePage
  title: string
  description: string
  primaryActionLabel: string
  nextLabel: string
  nextPath: string
  expectedStatus?: DemoTaskStatus
}

export const demoGuideSteps: DemoGuideStep[] = [
  {
    id: 'login',
    order: 1,
    page: 'login',
    title: '登录进入演示',
    description: '选择项目经理进入控制台，先查看入口 A 人流拥堵异常。',
    primaryActionLabel: '选择项目经理',
    nextLabel: '进入实时监控',
    nextPath: '#/project/project-spring-2026/live',
    expectedStatus: 'pending_approval',
  },
  {
    id: 'live-review',
    order: 2,
    page: 'live',
    title: '查看现场异常',
    description: '入口 A 出现人流拥堵异常，系统展示多监控源证据和 Agent 建议。',
    primaryActionLabel: '确认派发入口引导员',
    nextLabel: '打开工作人员任务端',
    nextPath: '#/mobile',
    expectedStatus: 'pending_approval',
  },
  {
    id: 'mobile-accept',
    order: 3,
    page: 'mobile',
    title: '工作人员接收任务',
    description: '工作人员查看任务地点、动作、时限和派发来源。',
    primaryActionLabel: '确认接收',
    nextLabel: '继续现场处理',
    nextPath: '#/mobile',
    expectedStatus: 'dispatched',
  },
  {
    id: 'mobile-process',
    order: 4,
    page: 'mobile',
    title: '工作人员到场处理',
    description: '工作人员到达入口 A，开始引导观众分流。',
    primaryActionLabel: '我已到达 / 开始处理',
    nextLabel: '完成反馈',
    nextPath: '#/mobile',
    expectedStatus: 'accepted',
  },
  {
    id: 'mobile-feedback',
    order: 5,
    page: 'mobile',
    title: '完成反馈',
    description: '工作人员提交现场处理结果，供项目经理复盘查看。',
    primaryActionLabel: '完成反馈',
    nextLabel: '查看审计复盘',
    nextPath: '#/project/project-spring-2026/replay',
    expectedStatus: 'in_progress',
  },
  {
    id: 'replay',
    order: 6,
    page: 'replay',
    title: '审计复盘',
    description: '查看证据链、决策链、执行链、责任链和经验沉淀。',
    primaryActionLabel: '沉淀为预案模板',
    nextLabel: '回到实时监控',
    nextPath: '#/project/project-spring-2026/live',
    expectedStatus: 'feedback_submitted',
  },
]

export const demoGuideTotalSteps = demoGuideSteps.length

const statusOrder: DemoTaskStatus[] = ['pending_approval', 'dispatched', 'accepted', 'en_route', 'in_progress', 'feedback_submitted', 'archived']

export function hasReachedDemoStatus(current: DemoTaskStatus, target: DemoTaskStatus) {
  return statusOrder.indexOf(current) >= statusOrder.indexOf(target)
}

export function getDemoGuideStepById(stepId: string) {
  return demoGuideSteps.find((step) => step.id === stepId) ?? demoGuideSteps[0]
}

export function inferDemoGuideStep(page: DemoGuidePage, demoState: DemoState): DemoGuideStep {
  if (page === 'login') return getDemoGuideStepById('login')
  if (page === 'live') return getDemoGuideStepById('live-review')
  if (page === 'replay') return getDemoGuideStepById('replay')

  if (demoState.taskStatus === 'pending_approval' || demoState.taskStatus === 'dispatched') {
    return getDemoGuideStepById('mobile-accept')
  }
  if (demoState.taskStatus === 'accepted' || demoState.taskStatus === 'en_route') {
    return getDemoGuideStepById('mobile-process')
  }
  return getDemoGuideStepById('mobile-feedback')
}

export function getNextDemoPath(page: DemoGuidePage, demoState: DemoState) {
  if (page === 'live' && !hasReachedDemoStatus(demoState.taskStatus, 'dispatched')) {
    return ''
  }
  if (page === 'mobile' && !hasReachedDemoStatus(demoState.taskStatus, 'feedback_submitted')) {
    return ''
  }
  return inferDemoGuideStep(page, demoState).nextPath
}

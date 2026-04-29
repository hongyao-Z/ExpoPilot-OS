import type { EventActionKey } from './event-action-catalog'
import type { VenueEventType } from './venue-event-types'

export type DemoScenarioSurface = 'dashboard' | 'live' | 'mobile' | 'replay'
export type DemoScenarioPhase =
  | 'pre_open_check'
  | 'audience_entry'
  | 'multi_monitor_red_alert'
  | 'focused_monitor_review'
  | 'event_review_agent'
  | 'dispatch_agent'
  | 'manager_confirmation'
  | 'task_lifecycle'
  | 'staff_feedback'
  | 'pressure_relief'
  | 'booth_heatup'
  | 'equipment_check'
  | 'audit_replay'

export interface DemoScenarioStep {
  stepId: string
  order: number
  timeLabel: string
  phase: DemoScenarioPhase
  surface: DemoScenarioSurface
  route: string
  title: string
  eventType?: VenueEventType
  zoneName?: string
  monitorSourceId?: string
  alertId?: string
  reviewId?: string
  dispatchRecommendationId?: string
  actionKey?: EventActionKey
  taskId?: string
  operatorAction: string
  pageFocus: string
  talkTrack: string
  fallback: string
}

export interface Stage5DemoScenarioStep extends DemoScenarioStep {
  stage5Focus: 'monitoring' | 'review_agent' | 'dispatch_agent' | 'manager_confirmation' | 'task_feedback' | 'replay'
}

export interface DemoScenario {
  scenarioId: string
  title: string
  objective: string
  durationLabel: string
  routes: Record<DemoScenarioSurface, string>
  phases: DemoScenarioPhase[]
  steps: DemoScenarioStep[]
  boundaries: string[]
}

export interface DemoScenarioSummary {
  scenarioId: string
  title: string
  totalSteps: number
  durationLabel: string
  primaryStory: string
  keyMoments: string[]
  boundaries: string[]
}

export const DEFAULT_DEMO_SCENARIO: DemoScenario = {
  scenarioId: 'stage5-multi-monitor-dual-agent-demo',
  title: 'Stage 5 Multi-Monitor Dual-Agent Demo',
  objective:
    'Show how ExpoPilot OS moves from multi-source monitoring red alerts to EventReviewAgent review, DispatchAgent recommendation, project manager confirmation, task lifecycle, staff feedback, and replay review.',
  durationLabel: '09:55-10:40',
  routes: {
    dashboard: '/#/projects',
    live: '/#/project/project-spring-2026/live',
    mobile: '/#/mobile',
    replay: '/#/project/project-spring-2026/replay',
  },
  phases: [
    'pre_open_check',
    'audience_entry',
    'multi_monitor_red_alert',
    'focused_monitor_review',
    'event_review_agent',
    'dispatch_agent',
    'manager_confirmation',
    'task_lifecycle',
    'staff_feedback',
    'pressure_relief',
    'booth_heatup',
    'equipment_check',
    'audit_replay',
  ],
  boundaries: [
    'OpenClaw only provides why_event, why_action, why_assignee, and why_state.',
    'EventReviewAgent and DispatchAgent are deterministic local demo models.',
    'No Agent directly executes a task; dispatch recommendation waits for project manager confirmation.',
    'Risk, audit, takeover, rollback, services, selectors, and vision logic stay unchanged.',
    'All scenario records are front-end demo data; no real backend dispatch is introduced.',
  ],
  steps: [
    {
      stepId: 'pre-open-check',
      order: 1,
      timeLabel: '09:55',
      phase: 'pre_open_check',
      surface: 'dashboard',
      route: '/#/projects',
      title: '开馆前检查',
      operatorAction: '打开 Dashboard，确认项目、实时监控和复盘入口可见。',
      pageFocus: '项目总览、运行状态、LivePage 和 ReplayPage 入口。',
      talkTrack: '演示从开馆前检查开始，系统先展示会展现场控制台入口。',
      fallback: '如果 Dashboard 未停在目标项目，直接进入 LivePage 路由继续演示。',
    },
    {
      stepId: 'audience-entry',
      order: 2,
      timeLabel: '10:00',
      phase: 'audience_entry',
      surface: 'live',
      route: '/#/project/project-spring-2026/live',
      title: '观众入场',
      zoneName: '入口 A',
      operatorAction: '打开 LivePage，展示多区域视图和总监控区。',
      pageFocus: '多区域视图、总监控源卡片、camera replay、mock event、Agent 驾驶舱。',
      talkTrack: '观众开始入场，多个监控源同时把现场信号放到一个运营视图里。',
      fallback: '如果视觉区没有动态变化，使用已有 mock event 说明信号来源是 demo replay。',
    },
    {
      stepId: 'entrance-monitor-red-alert',
      order: 3,
      timeLabel: '10:03',
      phase: 'multi_monitor_red_alert',
      surface: 'live',
      route: '/#/project/project-spring-2026/live',
      title: '入口 A 监控卡片告红',
      eventType: 'entrance_congestion',
      zoneName: '入口 A',
      monitorSourceId: 'monitor-entrance-a-main',
      alertId: 'alert-entrance-a-congestion',
      operatorAction: '点击 Entrance A Main Camera 异常监控卡片。',
      pageFocus: '总监控卡片、High 告警、sourceName、zoneName、timestamp。',
      talkTrack: '入口 A 的监控源先告红，项目经理从总监控面板定位到异常区域。',
      fallback: '如果焦点不在入口卡片，点击 High 或 Entrance A 监控卡片。',
    },
    {
      stepId: 'focused-monitor-review',
      order: 4,
      timeLabel: '10:05',
      phase: 'focused_monitor_review',
      surface: 'live',
      route: '/#/project/project-spring-2026/live',
      title: '焦点监控显示 entrance_congestion',
      eventType: 'entrance_congestion',
      zoneName: '入口 A',
      monitorSourceId: 'monitor-entrance-a-main',
      alertId: 'alert-entrance-a-congestion',
      taskId: 'demo-task-entrance-fill-position',
      operatorAction: '展示焦点监控详情和证据摘要。',
      pageFocus: 'focused alert、summary、evidence、manager review 状态。',
      talkTrack: '系统识别 entrance_congestion，但仍只把它作为运营输入，不自动执行。',
      fallback: '如果事件列表顺序变化，使用监控源卡片重新定位入口告警。',
    },
    {
      stepId: 'event-review-agent',
      order: 5,
      timeLabel: '10:06',
      phase: 'event_review_agent',
      surface: 'live',
      route: '/#/project/project-spring-2026/live',
      title: 'EventReviewAgent 审核事件',
      eventType: 'entrance_congestion',
      zoneName: '入口 A',
      alertId: 'alert-entrance-a-congestion',
      reviewId: 'review-alert-entrance-a-congestion',
      operatorAction: '指向 EventReviewAgent 面板。',
      pageFocus: 'what happened、evidence、risk level、handling decision、confidence。',
      talkTrack: '事件审核 Agent 解释发生了什么、证据是什么、风险等级以及是否需要处理。',
      fallback: '如果面板未显示，点击入口监控卡片重新加载本地 demo 审核结果。',
    },
    {
      stepId: 'dispatch-agent',
      order: 6,
      timeLabel: '10:06',
      phase: 'dispatch_agent',
      surface: 'live',
      route: '/#/project/project-spring-2026/live',
      title: 'DispatchAgent 给出派发建议',
      eventType: 'entrance_congestion',
      actionKey: 'fill_position',
      zoneName: '入口 A',
      dispatchRecommendationId: 'dispatch-review-alert-entrance-a-congestion',
      taskId: 'demo-task-entrance-fill-position',
      operatorAction: '指向 DispatchAgent 面板。',
      pageFocus: 'recommendedAction、primaryAssignee、backupAssignees、dispatch reasons。',
      talkTrack: '派发建议 Agent 推荐补位动作和执行人，但它只给建议，不创建任务。',
      fallback: '如果候选人展示空间不足，讲主执行人和 backup 字段即可。',
    },
    {
      stepId: 'manager-confirmation',
      order: 7,
      timeLabel: '10:07',
      phase: 'manager_confirmation',
      surface: 'live',
      route: '/#/project/project-spring-2026/live',
      title: '项目经理确认后进入任务状态',
      eventType: 'entrance_congestion',
      actionKey: 'fill_position',
      zoneName: '入口 A',
      taskId: 'demo-task-entrance-fill-position',
      operatorAction: '展示项目经理确认状态和任务状态流。',
      pageFocus: 'pending_manager_confirmation、suggested、created、dispatched、in_progress。',
      talkTrack: '确认权在项目经理手里，确认后才进入任务状态展示。',
      fallback: '如果状态仍显示 pending，说明这是演示边界：只展示确认等待，不模拟真实后端写入。',
    },
    {
      stepId: 'staff-arrived',
      order: 8,
      timeLabel: '10:07',
      phase: 'staff_feedback',
      surface: 'mobile',
      route: '/#/mobile',
      title: '执行人员确认到达',
      zoneName: '入口 A',
      taskId: 'demo-task-entrance-fill-position',
      operatorAction: '打开 mobile H5 或 LivePage 反馈摘要，展示工作人员到达反馈。',
      pageFocus: 'staffName、role、status label、message、supportRequested。',
      talkTrack: '现场人员反馈到达后，任务从建议变成可展示的执行状态。',
      fallback: '如果手机无法访问本机地址，在桌面浏览器打开 /#/mobile。',
    },
    {
      stepId: 'entrance-pressure-relief',
      order: 9,
      timeLabel: '10:10',
      phase: 'pressure_relief',
      surface: 'live',
      route: '/#/project/project-spring-2026/live',
      title: '拥堵缓解',
      eventType: 'entrance_congestion',
      zoneName: '入口 A',
      taskId: 'demo-task-entrance-fill-position',
      operatorAction: '回到 LivePage，展示任务进度和工作人员反馈。',
      pageFocus: '任务状态流、反馈摘要、运营摘要。',
      talkTrack: '入口压力降低后，现场处理过程可以进入复盘。',
      fallback: '如果任务仍显示进行中，说明 demo 数据保留当前状态用于展示进度。',
    },
    {
      stepId: 'booth-heatup',
      order: 10,
      timeLabel: '10:20',
      phase: 'booth_heatup',
      surface: 'live',
      route: '/#/project/project-spring-2026/live',
      title: '展台 512 热度升高',
      eventType: 'booth_heatup',
      zoneName: '展台 512',
      monitorSourceId: 'monitor-booth-512-heat',
      alertId: 'alert-booth-512-heatup',
      taskId: 'demo-task-booth-reception-support',
      operatorAction: '点击 Booth 512 Heat Camera，展示展台异常和双 Agent 结果。',
      pageFocus: '展台监控源、booth_heatup、reviewing 状态、接待建议。',
      talkTrack: '系统不是只处理入口问题，也能把展台热度纳入同一套监控和建议流程。',
      fallback: '如果展台项不在焦点位置，点击 Booth 512 监控源卡片。',
    },
    {
      stepId: 'notify-booth-reception',
      order: 11,
      timeLabel: '10:22',
      phase: 'task_lifecycle',
      surface: 'live',
      route: '/#/project/project-spring-2026/live',
      title: '通知展台接待',
      eventType: 'booth_heatup',
      actionKey: 'booth_reception_support',
      zoneName: '展台 512',
      taskId: 'demo-task-booth-reception-support',
      operatorAction: '展示展台接待任务的执行人和反馈。',
      pageFocus: 'actionLabel、assigneeLabel、completed 状态、工作人员反馈。',
      talkTrack: '展台接待任务展示的是同一套状态流在不同区域的复用。',
      fallback: '如果 LivePage 空间不足，直接在 ReplayPage 详情面板展示同一任务。',
    },
    {
      stepId: 'equipment-check',
      order: 12,
      timeLabel: '10:30',
      phase: 'equipment_check',
      surface: 'live',
      route: '/#/project/project-spring-2026/live',
      title: '设备异常检查',
      eventType: 'equipment_issue',
      actionKey: 'dispatch_technical_support',
      zoneName: '舞台区',
      monitorSourceId: 'monitor-stage-equipment',
      alertId: 'alert-stage-equipment-issue',
      taskId: 'demo-task-equipment-inspection',
      operatorAction: '点击 Stage Equipment Watch，展示 critical 告警和技术支持建议。',
      pageFocus: 'critical alert、technical support、blocked 状态、need_support 反馈。',
      talkTrack: '设备异常优先级更高，但仍然只是 demo 建议和展示层，不接真实执行器。',
      fallback: '如果 critical 项未显示，选择设备异常任务即可。',
    },
    {
      stepId: 'audit-chain',
      order: 13,
      timeLabel: '10:40',
      phase: 'audit_replay',
      surface: 'replay',
      route: '/#/project/project-spring-2026/replay',
      title: '复盘页面生成双 Agent 审计视图',
      operatorAction: '打开 ReplayPage，选择入口或设备事件，展示双 Agent 处理过程和审计上下文。',
      pageFocus: '监控源、告警、事件审核 Agent、派发建议 Agent、项目经理确认、任务反馈、审计记录。',
      talkTrack: '复盘页把现场过程变成可说明的视图：哪个监控源发现问题、为什么需要处理、建议谁处理、项目经理是否确认、反馈如何。',
      fallback: '如果日志较少，聚焦双 Agent 复盘面板和任务详情，不声称已有真实后端审计扩展。',
    },
  ],
}

export function getDefaultDemoScenario() {
  return DEFAULT_DEMO_SCENARIO
}

export function listDemoScenarioSteps() {
  return [...DEFAULT_DEMO_SCENARIO.steps]
}

export function getScenarioStepById(stepId: string) {
  return DEFAULT_DEMO_SCENARIO.steps.find((step) => step.stepId === stepId) ?? null
}

export function getScenarioSummary(): DemoScenarioSummary {
  return {
    scenarioId: DEFAULT_DEMO_SCENARIO.scenarioId,
    title: DEFAULT_DEMO_SCENARIO.title,
    totalSteps: DEFAULT_DEMO_SCENARIO.steps.length,
    durationLabel: DEFAULT_DEMO_SCENARIO.durationLabel,
    primaryStory:
      '开馆检查 -> 多监控源告红 -> 焦点监控 -> 事件审核 Agent -> 派发建议 Agent -> 项目经理确认 -> 任务反馈 -> 双 Agent 复盘',
    keyMoments: DEFAULT_DEMO_SCENARIO.steps.map((step) => `${step.timeLabel} ${step.title}`),
    boundaries: [...DEFAULT_DEMO_SCENARIO.boundaries],
  }
}

export function getStage5DemoScenario() {
  return DEFAULT_DEMO_SCENARIO
}

export function listStage5DemoSteps(): Stage5DemoScenarioStep[] {
  return DEFAULT_DEMO_SCENARIO.steps.map((step): Stage5DemoScenarioStep => {
    const stage5Focus: Stage5DemoScenarioStep['stage5Focus'] =
      step.phase === 'multi_monitor_red_alert' || step.phase === 'focused_monitor_review'
        ? 'monitoring'
        : step.phase === 'event_review_agent'
          ? 'review_agent'
          : step.phase === 'dispatch_agent'
            ? 'dispatch_agent'
            : step.phase === 'manager_confirmation'
              ? 'manager_confirmation'
              : step.phase === 'audit_replay'
                ? 'replay'
                : 'task_feedback'

    return {
      ...step,
      stage5Focus,
    }
  })
}

export function getStage5ScenarioSummary() {
  return getScenarioSummary()
}

export function listStage4DemoSteps() {
  return listDemoScenarioSteps()
}

export function getStage4DemoStep(id: string) {
  return getScenarioStepById(id) ?? DEFAULT_DEMO_SCENARIO.steps[0]
}

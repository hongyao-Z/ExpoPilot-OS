import { useEffect, useMemo, useState } from 'react'
import {
  appendDemoHistory,
  getDemoTaskStatusLabel,
  readDemoState,
  resetDemoState,
  subscribeDemoState,
  transitionDemoTaskStatus,
  type DemoTaskStatus,
} from '../lib/demo-state'
import { demoGuideTotalSteps, getNextDemoPath, inferDemoGuideStep } from '../lib/demo-guide'
import { getDemoTaskLifecycleById } from '../lib/task-lifecycle'
import { getLatestFeedbackByTaskId } from '../lib/staff-feedback'

type MobileTaskState = DemoTaskStatus | 'support' | 'exception'

interface TaskAction {
  id: string
  label: string
  detail: string
}

interface TimelineStep {
  id: MobileTaskState
  label: string
  timeLabel: string
}

const focusTaskId = 'demo-task-entrance-fill-position'

const stateLabels: Record<MobileTaskState, string> = {
  pending_approval: '待确认',
  dispatched: '已派发',
  accepted: '已接收',
  en_route: '前往中',
  in_progress: '处理中',
  feedback_submitted: '已反馈',
  archived: '已归档',
  support: '请求支援',
  exception: '现场异常',
}

const stateTone: Record<MobileTaskState, string> = {
  pending_approval: 'warning',
  dispatched: 'warning',
  accepted: 'active',
  en_route: 'active',
  in_progress: 'active',
  feedback_submitted: 'success',
  archived: 'success',
  support: 'warning',
  exception: 'danger',
}

const timelineOrder: DemoTaskStatus[] = ['pending_approval', 'dispatched', 'accepted', 'en_route', 'in_progress', 'feedback_submitted', 'archived']

const timelineSteps: TimelineStep[] = [
  { id: 'pending_approval', label: '等待项目经理确认', timeLabel: '待确认' },
  { id: 'dispatched', label: '任务已派发', timeLabel: '待操作' },
  { id: 'accepted', label: '工作人员已接收', timeLabel: '待操作' },
  { id: 'en_route', label: '已到达现场', timeLabel: '待操作' },
  { id: 'in_progress', label: '处理中', timeLabel: '待操作' },
  { id: 'feedback_submitted', label: '已反馈', timeLabel: '待操作' },
]

const commandButtons: Array<{ target: MobileTaskState; label: string; tone?: 'secondary' | 'danger'; historyLabel?: string }> = [
  { target: 'accepted', label: '确认接收' },
  { target: 'en_route', label: '我已到达' },
  { target: 'in_progress', label: '开始处理' },
  { target: 'feedback_submitted', label: '完成反馈' },
  { target: 'support', label: '请求支援', tone: 'secondary', historyLabel: '工作人员请求现场支援' },
  { target: 'exception', label: '现场异常', tone: 'danger', historyLabel: '工作人员上报现场异常' },
]

const taskActions: TaskAction[] = [
  { id: 'go', label: '前往入口 A', detail: '到达 A1 主入口外侧分流点。' },
  { id: 'route', label: '引导观众至备用通道', detail: '优先引导排队尾部观众，不直接封闭入口。' },
  { id: 'security', label: '协助安保维持排队秩序', detail: '保持队列单向移动，避免逆向穿行。' },
  { id: 'arrive', label: '到场后点击“我已到达”', detail: '让项目经理知道你已经进入处理位置。' },
  { id: 'feedback', label: '处理完成后提交反馈', detail: '说明排队长度变化和是否需要继续观察。' },
]

function getTimelineState(step: MobileTaskState, currentState: MobileTaskState) {
  if (currentState === 'support' || currentState === 'exception') {
    return step === 'in_progress' ? 'current' : timelineOrder.indexOf(step as DemoTaskStatus) < timelineOrder.indexOf('in_progress') ? 'done' : 'pending'
  }

  const currentIndex = timelineOrder.indexOf(currentState as DemoTaskStatus)
  const stepIndex = timelineOrder.indexOf(step as DemoTaskStatus)

  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}

function getPrimaryCommandTarget(currentState: MobileTaskState): MobileTaskState | null {
  if (currentState === 'dispatched') return 'accepted'
  if (currentState === 'accepted') return 'en_route'
  if (currentState === 'en_route') return 'in_progress'
  if (currentState === 'in_progress') return 'feedback_submitted'
  return null
}

function getCommandClassName(target: MobileTaskState, currentState: MobileTaskState, tone?: 'secondary' | 'danger') {
  const classes = ['mobile-command-button']
  if (target === getPrimaryCommandTarget(currentState)) classes.push('mobile-command-primary')
  else classes.push('mobile-command-muted')
  if (target === currentState) classes.push('is-current')
  if (tone === 'secondary') classes.push('mobile-command-secondary')
  if (tone === 'danger') classes.push('mobile-command-danger')
  return classes.join(' ')
}

function isCommandDisabled(target: MobileTaskState, currentState: MobileTaskState) {
  if (target === 'support' || target === 'exception') return currentState === 'pending_approval'
  return getPrimaryCommandTarget(currentState) !== target
}

function getTransitionLabel(status: DemoTaskStatus) {
  if (status === 'accepted') return '工作人员已接收任务'
  if (status === 'en_route') return '工作人员已到达入口 A 分流点'
  if (status === 'in_progress') return '工作人员开始现场分流'
  if (status === 'feedback_submitted') return '工作人员已提交完成反馈'
  return `任务状态更新为${getDemoTaskStatusLabel(status)}`
}

function getRecommendedActionLabel(currentState: MobileTaskState) {
  if (currentState === 'pending_approval') return '等待项目经理确认'
  if (currentState === 'dispatched') return '确认接收'
  if (currentState === 'accepted') return '我已到达'
  if (currentState === 'en_route') return '开始处理'
  if (currentState === 'in_progress') return '完成反馈'
  if (currentState === 'feedback_submitted' || currentState === 'archived') return '查看复盘'
  if (currentState === 'support') return '等待支援确认'
  return '等待现场指令'
}

export function MobileShowcasePage() {
  const task = getDemoTaskLifecycleById(focusTaskId)
  const latestFeedback = getLatestFeedbackByTaskId(focusTaskId)
  const [demoState, setDemoState] = useState(readDemoState)
  const [taskState, setTaskState] = useState<MobileTaskState>(() => readDemoState().taskStatus)
  const [feedbackNote, setFeedbackNote] = useState(() => readDemoState().lastFeedbackText)
  const [localNotice, setLocalNotice] = useState('')

  useEffect(
    () =>
      subscribeDemoState((nextState) => {
        setDemoState(nextState)
        setTaskState(nextState.taskStatus)
        setFeedbackNote(nextState.lastFeedbackText)
      }),
    [],
  )

  const progressLabel = useMemo(() => {
    if (taskState === 'support') return '已通知项目经理，请等待支援确认'
    if (taskState === 'exception') return '现场情况异常，请保持安全距离并等待指令'
    if (taskState === 'pending_approval') return '等待项目经理确认派发；当前手机端仅展示任务预览'
    if (taskState === 'dispatched') return '任务已派发，请确认接收'
    if (taskState === 'feedback_submitted') return '反馈已记录，任务进入已反馈状态'
    return '请按任务步骤处理入口 A 人流拥堵'
  }, [taskState])

  const applyTaskStatus = (target: MobileTaskState, historyLabel?: string) => {
    if (target === 'support' || target === 'exception') {
      const nextState = appendDemoHistory(historyLabel ?? stateLabels[target], '入口引导员 A')
      setDemoState(nextState)
      setTaskState(target)
      setLocalNotice(target === 'support' ? '支援请求已记录在当前浏览器演示状态中。' : '现场异常已记录在当前浏览器演示状态中。')
      return
    }

    const nextState = transitionDemoTaskStatus(target, {
      label: getTransitionLabel(target),
      actorLabel: '入口引导员 A',
      lastFeedbackText: target === 'feedback_submitted' ? feedbackNote : undefined,
    })
    setDemoState(nextState)
    setTaskState(nextState.taskStatus)
    setLocalNotice('')
  }

  const handleResetDemoState = () => {
    const nextState = resetDemoState()
    setDemoState(nextState)
    setTaskState(nextState.taskStatus)
    setFeedbackNote(nextState.lastFeedbackText)
    setLocalNotice('演示状态已重置，等待项目经理确认派发。')
  }

  const goToLive = () => {
    window.location.hash = '#/project/project-spring-2026/live'
  }

  const goToReplay = () => {
    window.location.hash = '#/project/project-spring-2026/replay'
  }

  const mobileGuideStep = inferDemoGuideStep('mobile', demoState)
  const mobileNextPath = getNextDemoPath('mobile', demoState)
  const recommendedActionLabel = getRecommendedActionLabel(taskState)

  return (
    <main className="mobile-showcase">
      <section className="mobile-phone-frame mobile-worker-frame" aria-label="场脉工作人员任务端">
        <header className="mobile-worker-topbar">
          <div>
            <span>场脉任务端</span>
            <strong>入口引导员 A</strong>
          </div>
          <em>在线</em>
        </header>

        <section className="demo-guide-card demo-guide-card--mobile" aria-label="移动端演示引导">
          <div className="demo-guide-progress">
            <span>演示进度 {mobileGuideStep.order} / {demoGuideTotalSteps}</span>
            <strong>{mobileGuideStep.title}</strong>
          </div>
          <p>{mobileGuideStep.description}</p>
          <div className="demo-guide-status">
            <span>当前状态：{stateLabels[taskState]}</span>
            <span>推荐操作：{recommendedActionLabel}</span>
          </div>
          {taskState === 'feedback_submitted' || taskState === 'archived' ? (
            <button className="demo-guide-action" type="button" onClick={() => { window.location.hash = mobileNextPath || '#/project/project-spring-2026/replay' }}>
              查看复盘
            </button>
          ) : null}
          <small className="demo-guide-muted">这是当前浏览器内记录的本地演示状态，不代表跨设备实时同步。</small>
        </section>

        <section className={`mobile-card mobile-task-hero mobile-task-hero--${stateTone[taskState]}`}>
          <div className="mobile-task-status-row">
            <span>当前状态</span>
            <strong>当前状态：{stateLabels[taskState]}</strong>
          </div>
          <h1>入口 A 人流拥堵引导</h1>
          <p>{progressLabel}</p>
          <div className="mobile-task-meta-grid" aria-label="任务关键信息">
            <span>
              位置
              <strong>{task?.zoneName === '入口 A' ? 'A1 主入口 / 展馆入口 A' : 'A1 主入口 / 展馆入口 A'}</strong>
            </span>
            <span>
              要求到达
              <strong>5 分钟内</strong>
            </span>
            <span>
              优先级
              <strong>高</strong>
            </span>
            <span>
              联系人
              <strong>现场项目经理</strong>
            </span>
          </div>
          <div className="mobile-dispatch-source">
            <span>派发来源</span>
            <strong>{demoState.dispatchConfirmed ? '项目经理确认 / DispatchAgent 建议' : '等待项目经理确认派发'}</strong>
          </div>
          <p className="mobile-command-hint">本页读取当前浏览器内的本地演示状态，不代表跨设备实时同步。</p>
        </section>

        <section className="mobile-card mobile-action-card">
          <div className="mobile-section-head">
            <span>处理动作</span>
            <strong>按顺序执行</strong>
          </div>
          <ol className="mobile-action-list">
            {taskActions.map((action, index) => (
              <li key={action.id}>
                <span>{index + 1}</span>
                <div>
                  <strong>{action.label}</strong>
                  <p>{action.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mobile-card mobile-command-card">
          <div className="mobile-section-head">
            <span>现场操作</span>
            <strong>优先点击高亮按钮</strong>
          </div>
          <div className="mobile-command-grid">
            {commandButtons.map((button) => (
              <button
                className={getCommandClassName(button.target, taskState, button.tone)}
                disabled={isCommandDisabled(button.target, taskState)}
                key={button.target}
                type="button"
                onClick={() => applyTaskStatus(button.target, button.historyLabel)}
              >
                {button.label}
              </button>
            ))}
          </div>
          {taskState === 'pending_approval' ? <p className="mobile-command-hint">待项目经理确认派发后，工作人员再开始接收和处理。</p> : null}
          <p className="mobile-command-hint">请求支援 / 现场异常用于无法独立处理时上报，不会离开当前浏览器。</p>
          {localNotice ? <p className="mobile-success-note">{localNotice}</p> : null}
          {taskState === 'feedback_submitted' ? (
            <button className="mobile-replay-button" type="button" onClick={goToReplay}>
              查看复盘
            </button>
          ) : null}
        </section>

        <section className="mobile-card mobile-feedback-card mobile-worker-feedback">
          <div className="mobile-section-head">
            <span>完成反馈</span>
            <strong>给项目经理看的结果</strong>
          </div>
          <div className="mobile-result-list">
            <span>现场已完成分流</span>
            <span>排队长度下降</span>
            <span>需要继续观察</span>
          </div>
          {taskState === 'feedback_submitted' ? <p className="mobile-success-note">反馈已记录，项目经理可在复盘页查看。</p> : null}
          <label className="mobile-note-field">
            <span>现场备注</span>
            <textarea
              value={feedbackNote}
              onChange={(event) => setFeedbackNote(event.target.value)}
              placeholder="可填写现场情况，例如：已完成分流，备用通道压力正常"
              rows={4}
            />
          </label>
          {latestFeedback ? (
            <p className="mobile-feedback-hint">最近一次系统反馈：{latestFeedback.timestampLabel} / 入口引导员 A 已到达现场。</p>
          ) : null}
        </section>

        <section className="mobile-card mobile-worker-timeline">
          <div className="mobile-section-head">
            <span>任务时间线</span>
            <strong>{stateLabels[taskState]}</strong>
          </div>
          <ol>
            {timelineSteps.map((step) => (
              <li className={`mobile-timeline-${getTimelineState(step.id, taskState)}`} key={step.id}>
                <i aria-hidden="true" />
                <div>
                  <strong>{step.label}</strong>
                  <span>{getTimelineState(step.id, taskState) === 'current' ? stateLabels[taskState] : step.timeLabel}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mobile-cta mobile-worker-cta">
          <button onClick={goToLive} type="button">查看桌面控制台</button>
          <button onClick={goToReplay} type="button">查看审计复盘</button>
          <button className="mobile-ghost-button" onClick={handleResetDemoState} type="button">重置演示状态</button>
        </footer>
      </section>
    </main>
  )
}

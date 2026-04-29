import { useMemo, useState } from 'react'
import { getDemoTaskLifecycleById } from '../lib/task-lifecycle'
import { getLatestFeedbackByTaskId } from '../lib/staff-feedback'

type MobileTaskState = 'pending' | 'accepted' | 'en_route' | 'processing' | 'completed' | 'support' | 'exception'

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
  pending: '待接收',
  accepted: '已接收',
  en_route: '前往中',
  processing: '处理中',
  completed: '已完成',
  support: '请求支援',
  exception: '现场异常',
}

const stateTone: Record<MobileTaskState, string> = {
  pending: 'warning',
  accepted: 'active',
  en_route: 'active',
  processing: 'active',
  completed: 'success',
  support: 'warning',
  exception: 'danger',
}

const timelineOrder: MobileTaskState[] = ['pending', 'accepted', 'en_route', 'processing', 'completed']

const timelineSteps: TimelineStep[] = [
  { id: 'pending', label: '任务已派发', timeLabel: '10:06' },
  { id: 'accepted', label: '工作人员已接收', timeLabel: '待操作' },
  { id: 'en_route', label: '已到达现场', timeLabel: '待操作' },
  { id: 'processing', label: '处理中', timeLabel: '待操作' },
  { id: 'completed', label: '已完成反馈', timeLabel: '待操作' },
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
    return step === 'processing' ? 'current' : timelineOrder.indexOf(step) < timelineOrder.indexOf('processing') ? 'done' : 'pending'
  }

  const currentIndex = timelineOrder.indexOf(currentState)
  const stepIndex = timelineOrder.indexOf(step)

  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}

export function MobileShowcasePage() {
  const task = getDemoTaskLifecycleById(focusTaskId)
  const latestFeedback = getLatestFeedbackByTaskId(focusTaskId)
  const [taskState, setTaskState] = useState<MobileTaskState>('pending')
  const [feedbackNote, setFeedbackNote] = useState('现场已完成分流，排队长度下降，需要继续观察 5 分钟。')

  const progressLabel = useMemo(() => {
    if (taskState === 'support') return '已通知项目经理，请等待支援确认'
    if (taskState === 'exception') return '现场情况异常，请保持安全距离并等待指令'
    if (taskState === 'completed') return '反馈已提交，等待项目经理归档'
    return '请按任务步骤处理入口 A 人流拥堵'
  }, [taskState])

  const goToLive = () => {
    window.location.hash = '#/project/project-spring-2026/live'
  }

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

        <section className={`mobile-card mobile-task-hero mobile-task-hero--${stateTone[taskState]}`}>
          <div className="mobile-task-status-row">
            <span>当前任务</span>
            <strong>{stateLabels[taskState]}</strong>
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
            <strong>项目经理确认 / DispatchAgent 建议</strong>
          </div>
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
            <strong>点击后只改变演示状态</strong>
          </div>
          <div className="mobile-command-grid">
            <button type="button" onClick={() => setTaskState('accepted')}>确认接收</button>
            <button type="button" onClick={() => setTaskState('en_route')}>我已到达</button>
            <button type="button" onClick={() => setTaskState('processing')}>开始处理</button>
            <button type="button" onClick={() => setTaskState('completed')}>完成反馈</button>
            <button className="mobile-command-secondary" type="button" onClick={() => setTaskState('support')}>请求支援</button>
            <button className="mobile-command-danger" type="button" onClick={() => setTaskState('exception')}>现场异常</button>
          </div>
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
          <label className="mobile-note-field">
            <span>现场备注</span>
            <textarea value={feedbackNote} onChange={(event) => setFeedbackNote(event.target.value)} rows={4} />
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
        </footer>
      </section>
    </main>
  )
}

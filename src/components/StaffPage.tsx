import type { Project, RoleType, Session, Staff, SystemSettings, Task, TaskOperationalItem, UiFeedbackState } from '../domain/types'
import { feedbackClassName, formatDateTime, receiptStatusLabel, taskStatusLabel } from '../lib/format'
import type { RouteState } from '../lib/router'
import { AppFrame } from './AppFrame'

export function StaffPage(props: {
  activeProject?: Project
  onLogout: () => void
  onNavigate: (route: RouteState) => void
  role: RoleType
  session: Session | null
  settings: SystemSettings
  taskItems: TaskOperationalItem[]
  updateTaskStatus: (taskId: string, status: Task['status']) => void
  updateSettings: (patch: Partial<SystemSettings>) => void
  workerProfile?: Staff
  feedback?: UiFeedbackState | null
}) {
  const currentTask = props.taskItems.find((item) => item.task.status !== 'completed' && item.task.status !== 'exception')
  const historyTasks = props.taskItems.filter((item) => item.task.task_id !== currentTask?.task.task_id)

  return (
    <AppFrame
      activeProject={props.activeProject}
      current={{ page: 'staff' }}
      onLogout={props.onLogout}
      onNavigate={props.onNavigate}
      role={props.role}
      session={props.session}
      title={`${props.workerProfile?.name ?? '工作人员'} 的工作端`}
      subtitle="当前只保留一线执行所需内容：当前任务、任务详情、状态反馈和历史任务。"
    >
      <section className="staff-mobile-page">
        {props.feedback?.kind && props.feedback.kind !== 'idle' ? (
          <article className={`panel feedback-banner ${feedbackClassName(props.feedback)}`}>{props.feedback.message}</article>
        ) : null}

        <article className="mobile-header">
          <span className="mobile-kicker">一线执行端</span>
          <h2>{props.workerProfile?.name ?? '工作人员'}</h2>
          <p>{props.workerProfile?.title ?? '当前仅显示执行任务与必要反馈。'}</p>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>当前任务</h3>
            <span>只保留执行链路，不显示后台策略、解释或设置。</span>
          </div>
          {currentTask ? (
            <CurrentTaskCard item={currentTask} onUpdateStatus={props.updateTaskStatus} />
          ) : (
            <p className="empty-copy">当前没有分配给此人员的待执行任务。</p>
          )}
        </article>

        {currentTask ? (
          <article className="panel">
            <div className="panel-head">
              <h3>任务详情</h3>
              <span>只展示当前任务的关键信息。</span>
            </div>
            <div className="stack-cards">
              <div className="task-card">
                <div className="task-title-row">
                  <strong>{currentTask.task.title}</strong>
                  <span className={`status-pill status-${currentTask.task.status}`}>{taskStatusLabel(currentTask.task.status)}</span>
                </div>
                <p>
                  {currentTask.zone_name} / {currentTask.assignee_name}
                </p>
                <small>任务类型：{currentTask.task.task_type}</small>
                <small>事件：{currentTask.event ? currentTask.event.title : '无关联事件'}</small>
                <p>{currentTask.task.action_summary}</p>
                <small>派发时间：{formatDateTime(currentTask.task.dispatched_at)}</small>
                <small>{currentTask.latest_feedback_label}</small>
                {currentTask.task.notification_receipts?.length ? (
                  <div className="chip-row">
                    {currentTask.task.notification_receipts.map((receipt) => (
                      <span className="chip" key={receipt.receipt_id}>
                        {receipt.channel} / {receiptStatusLabel(receipt.status)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ) : null}

        <article className="panel">
          <div className="panel-head">
            <h3>历史任务</h3>
            <span>默认折叠已完成任务，方便查看刚结束的补位任务。</span>
          </div>
          {historyTasks.length > 0 ? (
            <div className="stack-cards compact-list">
              {historyTasks.map((item) => (
                <div className="task-card" key={item.task.task_id}>
                  <div className="task-title-row">
                    <strong>{item.task.title}</strong>
                    <span className={`status-pill status-${item.task.status}`}>{taskStatusLabel(item.task.status)}</span>
                  </div>
                  <p>
                    {item.zone_name} / {item.assignee_name}
                  </p>
                  <small>{item.event?.summary}</small>
                  <small>{item.latest_feedback_label}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-copy">暂无历史任务。</p>
          )}
        </article>
      </section>
    </AppFrame>
  )
}

function CurrentTaskCard(props: {
  item: TaskOperationalItem
  onUpdateStatus: (taskId: string, status: Task['status']) => void
}) {
  const isAbnormal = props.item.task.status === 'exception'

  return (
    <article className={`mobile-task-card active-task-hero ${isAbnormal ? 'task-alert' : ''}`}>
      <div className="mobile-task-top">
        <span className={`status-pill status-${props.item.task.status}`}>{taskStatusLabel(props.item.task.status)}</span>
        <span>{props.item.zone_name}</span>
      </div>
      <strong>{props.item.task.title}</strong>
      <p>{props.item.task.action_summary}</p>
      <small>任务类型：{props.item.task.task_type}</small>
      <small>{props.item.event ? `关联事件：${props.item.event.title}` : '当前无关联事件说明。'}</small>
      <p className="helper-line">
        {isAbnormal ? '后台已收到当前异常状态，可等待主管支援或重新分派。' : props.item.latest_feedback_label}
      </p>
      <div className="mobile-actions">
        <button onClick={() => props.onUpdateStatus(props.item.task.task_id, 'received')}>已接收</button>
        <button onClick={() => props.onUpdateStatus(props.item.task.task_id, 'processing')}>处理中</button>
        <button onClick={() => props.onUpdateStatus(props.item.task.task_id, 'completed')}>已完成</button>
        <button className="ghost-button" onClick={() => props.onUpdateStatus(props.item.task.task_id, 'exception')}>
          无法执行
        </button>
      </div>
    </article>
  )
}

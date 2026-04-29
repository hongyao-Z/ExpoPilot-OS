import type { EventOperationalItem, Project, RoleType, Session, TaskOperationalItem, UiFeedbackState } from '../domain/types'
import {
  channelLabel,
  eventOperationalStateLabel,
  feedbackClassName,
  formatDateTime,
  receiptStatusLabel,
  severityLabel,
  taskStatusLabel,
} from '../lib/format'
import type { RouteState } from '../lib/router'
import { AppFrame } from './AppFrame'

export function DispatchPage(props: {
  activeProject?: Project
  eventItems: EventOperationalItem[]
  taskItems: TaskOperationalItem[]
  role: RoleType
  session: Session | null
  onNavigate: (route: RouteState) => void
  onLogout: () => void
  onDispatchEvent: (eventId: string, assigneeId?: string) => void
  onEscalateEvent: (eventId: string) => void
  onRetryTask: (taskId: string) => void
  onRevokeTask: (taskId: string) => void
  feedback?: UiFeedbackState | null
}) {
  const focusEvent = props.eventItems.find((item) => item.event.event_type === 'entrance_congestion') ?? props.eventItems[0]
  const relevantTasks = props.taskItems.filter((item) => item.task.task_type === '补位' || item.task.event_id === focusEvent?.event.event_id)

  return (
    <AppFrame
      activeProject={props.activeProject}
      current={{ page: 'dispatch', projectId: props.activeProject?.project_id }}
      onLogout={props.onLogout}
      onNavigate={props.onNavigate}
      role={props.role}
      session={props.session}
      title="任务调度"
      subtitle="当前 MVP 只严格验证首次派发链路：把入口拥堵事件转成一条“补位”任务，并在这里稳定看到状态为 created 的任务。"
    >
      <section className="page-grid">
        {props.feedback?.kind && props.feedback.kind !== 'idle' ? (
          <article className={`panel feedback-banner ${feedbackClassName(props.feedback)}`}>{props.feedback.message}</article>
        ) : null}

        <article className="panel hero-panel">
          <div className="hero-strip">
            <span>当前补位任务</span>
            <strong>{relevantTasks.length}</strong>
          </div>
          <h3>这一页只验证一件事：后台已经根据入口拥堵事件生成了补位任务。</h3>
          <p>如果上一步已在事件中心触发“生成补位任务”，这里至少应出现一条状态为 `created` 的任务卡。</p>
          <p>当前版本里的“再次提醒”按对同一任务重新发送通知理解，不承诺生成新的独立任务窗口。</p>
        </article>

        {focusEvent ? (
          <article className="panel">
            <div className="panel-head">
              <h3>当前事件</h3>
              <span>{eventOperationalStateLabel(focusEvent.operational_state)}</span>
            </div>
            <strong>{focusEvent.event.title}</strong>
            <p>{focusEvent.event.summary}</p>
            <small>{focusEvent.event.recommended_action}</small>
            <div className="chip-row">
              <span className="chip">{severityLabel(focusEvent.event.severity)}</span>
              {focusEvent.assignee_name ? <span className="chip">建议执行人：{focusEvent.assignee_name}</span> : null}
            </div>
            <div className="inline-actions">
              <button onClick={() => props.onDispatchEvent(focusEvent.event.event_id, focusEvent.task?.assignee_id)}>
                {focusEvent.task ? '再次提醒补位任务' : '生成补位任务'}
              </button>
              <button className="ghost-button" onClick={() => props.onNavigate({ page: 'events', projectId: props.activeProject?.project_id })}>
                返回事件中心
              </button>
            </div>
          </article>
        ) : (
          <article className="panel empty-panel">当前没有可调度事件，请先回到实时态势触发 mock 事件。</article>
        )}

        <article className="panel panel-span">
          <div className="panel-head">
            <h3>任务列表</h3>
            <span>本轮只保留补位任务视角；再次提醒按同一任务重试发送处理，不扩展新的派发窗口语义。</span>
          </div>
          <div className="stack-cards">
            {relevantTasks.map((item) => (
              <div className="task-card" key={item.task.task_id}>
                <div className="task-title-row">
                  <strong>{item.task.title}</strong>
                  <span className={`status-pill status-${item.task.status}`}>{taskStatusLabel(item.task.status)}</span>
                </div>
                <p>
                  {item.assignee_name} / {item.zone_name}
                </p>
                <small>
                  {item.task.task_type} / {severityLabel(item.task.priority)} / 派发于 {formatDateTime(item.task.dispatched_at)}
                </small>
                <div className="chip-row">
                  <span className="chip">重试 {item.task.retry_count}</span>
                  {item.task.reminder_channels.map((channel) => (
                    <span className="chip" key={channel}>
                      {channelLabel(channel)}
                    </span>
                  ))}
                </div>
                <p>{item.task.note || item.event?.recommended_action}</p>
                <small>
                  {item.latest_feedback_at ? `${formatDateTime(item.latest_feedback_at)} / ` : ''}
                  {item.latest_feedback_label}
                </small>
                {item.task.notification_receipts?.length ? (
                  <div className="chip-row">
                    {item.task.notification_receipts.map((receipt) => (
                      <span className="chip" key={receipt.receipt_id}>
                        {channelLabel(receipt.channel)} {receiptStatusLabel(receipt.status)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {relevantTasks.length === 0 ? <p className="empty-copy">当前还没有补位任务，请先在事件中心生成任务。</p> : null}
          </div>
        </article>
      </section>
    </AppFrame>
  )
}

import type { ExpoPilotSnapshot, ExplainResult, Project, RoleType, Session, UiFeedbackState } from '../domain/types'
import { feedbackClassName } from '../lib/format'
import type { RouteState } from '../lib/router'
import { AppFrame } from './AppFrame'

export function ExplainPage(props: {
  activeProject?: Project
  selectedEvent?: ExpoPilotSnapshot['events'][number]
  explainResult?: ExplainResult
  onDispatchEvent: (eventId: string, assigneeId?: string) => void
  onLogout: () => void
  onNavigate: (route: RouteState) => void
  onEscalateEvent: (eventId: string) => void
  role: RoleType
  snapshot: ExpoPilotSnapshot
  session: Session | null
  feedback?: UiFeedbackState | null
}) {
  return (
    <AppFrame
      activeProject={props.activeProject}
      current={{ page: 'explain', projectId: props.activeProject?.project_id, itemId: props.selectedEvent?.event_id }}
      onLogout={props.onLogout}
      onNavigate={props.onNavigate}
      role={props.role}
      session={props.session}
      title="事件解释"
      subtitle="后续版本预留。当前 MVP 不再通过主导航进入此页。"
    >
      <section className="page-grid">
        {props.feedback?.kind && props.feedback.kind !== 'idle' ? (
          <article className={`panel feedback-banner ${feedbackClassName(props.feedback)}`}>{props.feedback.message}</article>
        ) : null}
        <article className="panel empty-panel">
          <h3>后续版本预留</h3>
          <p>事件解释页已降级为占位页，当前版本仅保留页面标题和状态说明。</p>
        </article>
      </section>
    </AppFrame>
  )
}

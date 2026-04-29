import type { Project, RoleType, Session, Strategy, UiFeedbackState } from '../domain/types'
import { feedbackClassName } from '../lib/format'
import type { RouteState } from '../lib/router'
import { AppFrame } from './AppFrame'

export function StrategiesPage(props: {
  activeProject?: Project
  strategies: Strategy[]
  role: RoleType
  session: Session | null
  onNavigate: (route: RouteState) => void
  onLogout: () => void
  feedback?: UiFeedbackState | null
}) {
  return (
    <AppFrame
      activeProject={props.activeProject}
      current={{ page: 'strategies', projectId: props.activeProject?.project_id }}
      onLogout={props.onLogout}
      onNavigate={props.onNavigate}
      role={props.role}
      session={props.session}
      title="策略库"
      subtitle="后续版本预留。当前 MVP 不再通过主导航进入此页。"
    >
      <section className="page-grid">
        {props.feedback?.kind && props.feedback.kind !== 'idle' ? (
          <article className={`panel feedback-banner ${feedbackClassName(props.feedback)}`}>{props.feedback.message}</article>
        ) : null}
        <article className="panel empty-panel">
          <h3>后续版本预留</h3>
          <p>策略库页面已降级为占位页，当前版本仅保留页面标题和状态说明。</p>
        </article>
      </section>
    </AppFrame>
  )
}

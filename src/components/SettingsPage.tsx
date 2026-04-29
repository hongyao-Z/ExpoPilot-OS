import type {
  AgentGatewayDescriptor,
  AuthGatewayDescriptor,
  ExpoPilotSnapshot,
  NotificationGatewayDescriptor,
  Project,
  RoleType,
  Session,
  SnapshotSourceMetadata,
  SourceOperationalStatus,
  SystemSettings,
  UiFeedbackState,
} from '../domain/types'
import { feedbackClassName } from '../lib/format'
import type { RouteState } from '../lib/router'
import { AppFrame } from './AppFrame'

export function SettingsPage(props: {
  activeProject?: Project
  onLogout: () => void
  onNavigate: (route: RouteState) => void
  role: RoleType
  snapshot: ExpoPilotSnapshot
  snapshotMetadata: SnapshotSourceMetadata
  session: Session | null
  settings: SystemSettings
  gatewayDescriptor: AgentGatewayDescriptor
  authDescriptor: AuthGatewayDescriptor
  notificationDescriptor: NotificationGatewayDescriptor
  connectorStatuses: SourceOperationalStatus[]
  updateSettings: (patch: Partial<SystemSettings>) => void
  markConnectorHealthy: (sourceId: string) => void
  fallbackConnector: (sourceId: string) => void
  feedback?: UiFeedbackState | null
}) {
  return (
    <AppFrame
      activeProject={props.activeProject ?? props.snapshot.projects[0]}
      current={{ page: 'settings' }}
      onLogout={props.onLogout}
      onNavigate={props.onNavigate}
      role={props.role}
      session={props.session}
      title="设置与权限"
      subtitle="后续版本预留。当前 MVP 不再通过主导航进入此页。"
    >
      <section className="page-grid">
        {props.feedback?.kind && props.feedback.kind !== 'idle' ? (
          <article className={`panel feedback-banner ${feedbackClassName(props.feedback)}`}>{props.feedback.message}</article>
        ) : null}
        <article className="panel empty-panel">
          <h3>后续版本预留</h3>
          <p>设置与权限页已降级为占位页，当前版本仅保留页面标题和状态说明。</p>
        </article>
      </section>
    </AppFrame>
  )
}

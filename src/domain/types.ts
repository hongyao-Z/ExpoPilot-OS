export type RoleType = 'organizer' | 'agency' | 'brand' | 'staff' | 'admin'
export type PermissionRole = RoleType

export type ProjectStatus = 'draft' | 'ready' | 'running' | 'completed'
export type ZoneType = 'entry' | 'stage' | 'booth' | 'lounge' | 'service'
export type SignalType = 'entrance_congestion' | 'booth_heatup' | 'zone_imbalance' | 'manual'
export type EventType = 'entrance_congestion' | 'booth_heatup' | 'zone_imbalance'
export type TaskType = '补位' | '支援接待' | '导流' | '待命'
export type EventSeverity = 'medium' | 'high' | 'critical'
export type EventStatus = 'detected' | 'confirmed' | 'ignored' | 'escalated' | 'closed'
export type TaskStatus = 'created' | 'received' | 'processing' | 'completed' | 'exception'
export type FeedbackType = 'received' | 'processing' | 'completed' | 'exception' | 'comment'

export type DataSourceType = 'vision' | 'manual' | 'mobile_status' | 'third_party'
export type DataSourceMode = 'realtime' | 'recorded' | 'manual' | 'sandbox'
export type DataSourceHealth = 'online' | 'degraded' | 'offline'
export type ConnectorServiceMode = 'local-sandbox' | 'proxy-ready' | 'hybrid'
export type ConnectorStatusKind = 'connected' | 'degraded' | 'offline' | 'replay' | 'manual' | 'simulated'

export type ReminderChannel = 'mobile' | 'browser' | 'wearable'
export type NotificationReceiptStatus = 'sent' | 'delivered' | 'read' | 'accepted' | 'timeout' | 'retrying' | 'failed_fallback'
export type StrategyStatus = 'draft' | 'active' | 'paused'
export type StrategyScope = 'global' | 'project' | 'zone'
export type ShiftStatus = 'on_duty' | 'busy' | 'backup' | 'offline'
export type FeedbackKind = 'idle' | 'loading' | 'success' | 'warning' | 'error'

export type AnalyticsEventType =
  | 'project_created'
  | 'data_source_connected'
  | 'event_triggered'
  | 'task_dispatched'
  | 'task_accepted'
  | 'task_completed'
  | 'exception_reported'
  | 'replay_viewed'
  | 'strategy_saved'

export interface Organization {
  org_id: string
  name: string
  permission_role: PermissionRole
  status: 'active' | 'inactive'
}

export interface Project {
  project_id: string
  org_id: string
  title: string
  start_at: string
  end_at: string
  venue_name: string
  city: string
  theme: string
  status: ProjectStatus
  current_phase: string
}

export interface Zone {
  zone_id: string
  project_id: string
  name: string
  zone_type: ZoneType
  heat: number
  density: number
  queue_minutes: number
  threshold: number
  staffing_target: number
  recommended_action: string
  notes: string
}

export interface DataSource {
  source_id: string
  project_id: string
  zone_id?: string
  name: string
  source_type: DataSourceType
  mode: DataSourceMode
  health: DataSourceHealth
  last_seen_at: string
  latency_seconds: number
  fallback_enabled: boolean
  provider_name: string
}

export interface Staff {
  staff_id: string
  org_id: string
  name: string
  title: string
  permission_role: PermissionRole
  assigned_zone_id: string
  shift_status: ShiftStatus
  current_load: number
  device_status: 'online' | 'busy' | 'offline'
  reminder_channels: ReminderChannel[]
  skills: string[]
  device_label: string
}

export interface EventSignal {
  signal_id: string
  project_id: string
  zone_id: string
  timestamp: string
  source: string
  idempotencyKey: string
  signal_type: SignalType
  severity: EventSeverity
  summary: string
  confidence: number
  input_mode: DataSourceMode
  raw_rules: string[]
}

export interface EventRecord {
  event_id: string
  project_id: string
  zone_id: string
  signal_ids: string[]
  timestamp: string
  source: string
  idempotencyKey: string
  event_type: EventType
  title: string
  summary: string
  severity: EventSeverity
  status: EventStatus
  priority_score: number
  recommended_action: string
  recommended_assignee_id: string
  reminder_channels: ReminderChannel[]
  explanation: string
  strategy_id?: string
  requires_confirmation: boolean
}

export interface NotificationReceipt {
  receipt_id: string
  task_id: string
  channel: ReminderChannel
  provider_name: string
  status: NotificationReceiptStatus
  detail: string
  sent_at: string
  updated_at: string
  retry_count: number
  fallback_channel?: ReminderChannel
}

export interface Task {
  task_id: string
  project_id: string
  event_id: string
  assignee_id: string
  task_type: TaskType
  title: string
  action_summary: string
  status: TaskStatus
  priority: EventSeverity
  reminder_channels: ReminderChannel[]
  dispatched_at: string
  received_at: string
  processing_at: string
  completed_at: string
  escalation_target_id?: string
  retry_count: number
  note: string
  notification_receipts?: NotificationReceipt[]
}

export interface Feedback {
  feedback_id: string
  task_id: string
  project_id: string
  event_id: string
  staff_id: string
  timestamp: string
  source: string
  idempotencyKey: string
  type: FeedbackType
  note: string
}

export interface Strategy {
  strategy_id: string
  name: string
  category: string
  status: StrategyStatus
  scope: StrategyScope
  project_id?: string
  zone_id?: string
  trigger_summary: string
  action_summary: string
  reminder_channels: ReminderChannel[]
  owner: string
  saved_from: 'template' | 'replay'
  linked_event_ids: string[]
  usage_count: number
  last_used_at: string
}

export interface ReplayTimelineItem {
  at: string
  label: string
}

export interface ReviewReport {
  report_id: string
  project_id: string
  generated_at: string
  summary: string
  metrics: {
    response_minutes: number
    task_completion_rate: number
    dispatch_success_rate: number
    closed_loop_events: number
    escalation_rate: number
  }
  highlights: string[]
  timeline: ReplayTimelineItem[]
}

export interface AuditLog {
  log_id: string
  operator_id: string
  action_type:
    | 'task_dispatched'
    | 'task_completed'
    | 'task_updated'
    | 'event_created'
    | 'event_updated'
    | 'strategy_saved'
    | 'report_exported'
    | 'settings_updated'
    | 'project_created'
    | 'data_source_updated'
  target_id: string
  created_at: string
}

export interface AnalyticsEvent {
  analytics_id: string
  type: AnalyticsEventType
  project_id: string
  actor: string
  at: string
  detail: string
}

export interface TokenBudget {
  explain: number
  dispatch_recommendation: number
  replay_report: number
  per_project_total: number
}

export interface ExpoPilotSnapshot {
  organizations: Organization[]
  projects: Project[]
  zones: Zone[]
  dataSources: DataSource[]
  staff: Staff[]
  signals: EventSignal[]
  events: EventRecord[]
  tasks: Task[]
  feedback: Feedback[]
  strategies: Strategy[]
  reports: ReviewReport[]
  auditLogs: AuditLog[]
  analytics: AnalyticsEvent[]
  tokenBudget: TokenBudget
}

export interface SystemSettings {
  login_mode: '账号密码 + 邀请加入'
  browser_notifications: boolean
  voice_broadcast: boolean
  vibration_reminder: boolean
  silent_mode: boolean
  rule_engine_enabled: boolean
  model_assist_enabled: boolean
  degrade_to_manual: boolean
  retry_dispatch: boolean
  data_retention_days: number
  export_requires_approval: boolean
  delete_requires_review: boolean
}

export interface PermissionSnapshot {
  role: RoleType
  org_id?: string
  staff_id?: string
  scope: 'all' | 'brand-scoped' | 'staff-only' | 'governance'
  visible_roles: RoleType[]
  can_view_settings: boolean
  can_dispatch: boolean
  can_manage_strategies: boolean
}

export interface AuthSession {
  session_id: string
  role: RoleType
  displayName: string
  email: string
  declared_role: RoleType
  organization_label: string
  login_at: string
  login_mode: 'sandbox-auth-gateway'
  staffId?: string
  orgId?: string
  permission: PermissionSnapshot
}

export type Session = AuthSession

export interface UiFeedbackState {
  kind: FeedbackKind
  message: string
  scope: 'global' | 'dispatch' | 'export' | 'settings' | 'source' | 'config' | 'events' | 'strategy'
}

export interface ProjectSummary {
  project_id: string
  title: string
  status: ProjectStatus
  city: string
  venue_name: string
  theme: string
  start_at: string
  zone_count: number
  connected_source_count: number
  pending_event_count: number
  open_task_count: number
  has_manual_source: boolean
}

export interface ZoneOperationalStatus {
  zone_id: string
  name: string
  zone_type: ZoneType
  heat: number
  density: number
  queue_minutes: number
  threshold: number
  pending_event_count: number
  open_task_count: number
  recommended_action: string
  input_mode: DataSourceMode | 'mixed' | 'unknown'
  input_health: DataSourceHealth | 'mixed' | 'unknown'
}

export interface LiveMetrics {
  pending_event_count: number
  active_task_count: number
  hottest_zone_name: string
  average_response_minutes: number
}

export interface StaffOperationalStatus {
  staff_id: string
  name: string
  title: string
  permission_role: PermissionRole
  zone_name: string
  shift_status: ShiftStatus
  current_load: number
  active_task_count: number
  reminder_channels: ReminderChannel[]
}

export interface DispatchRecommendation {
  assignee_id: string
  note: string
  reminder_channels: ReminderChannel[]
}

export interface ExplainResult {
  trigger_points: string[]
  recommended_action: string
  why_assignee: string
  human_takeover_allowed: boolean
  strategy_summary?: string
}

export type SnapshotSourceOrigin = 'embedded' | 'bootstrap' | 'persisted' | 'connector' | 'server-proxy'

export interface SnapshotSourceMetadata {
  origin: SnapshotSourceOrigin
  service_mode: ConnectorServiceMode
  source_label: string
  schema_version: string
  loaded_at: string
  last_synced_at: string
}

export interface SnapshotLoadState {
  snapshot: ExpoPilotSnapshot
  metadata: SnapshotSourceMetadata
  origin: SnapshotSourceOrigin
  schema_version: string
  loaded_at: string
}

export interface ProjectScope {
  project?: Project
  zones: Zone[]
  dataSources: DataSource[]
  staff: Staff[]
  events: EventRecord[]
  tasks: Task[]
  feedback: Feedback[]
  strategies: Strategy[]
  auditLogs: AuditLog[]
  visible_zone_ids: string[]
}

export interface ConnectorStatus {
  source_id: string
  zone_id?: string
  zone_name: string
  name: string
  source_type: DataSourceType
  mode: DataSourceMode
  health: DataSourceHealth
  provider_name: string
  latency_seconds: number
  last_seen_at: string
  fallback_enabled: boolean
  is_fallback: boolean
  status_kind: ConnectorStatusKind
  status_reason: string
  recovery_action: string
  retry_policy: string
}

export type SourceOperationalStatus = ConnectorStatus

export type EventOperationalState = 'pending_confirmation' | 'ready_dispatch' | 'assigned' | 'need_support' | 'closed'

export interface EventOperationalItem {
  event: EventRecord
  zone_name: string
  source_label: string
  source_mode: DataSourceMode | 'mixed' | 'unknown'
  trigger_points: string[]
  task?: Task
  assignee_name?: string
  latest_feedback?: Feedback
  latest_feedback_label: string
  latest_feedback_at?: string
  operational_state: EventOperationalState
  blocking_reason?: string
}

export interface TaskOperationalItem {
  task: Task
  event?: EventRecord
  zone_name: string
  assignee_name: string
  latest_feedback?: Feedback
  latest_feedback_label: string
  latest_feedback_at?: string
  blocker_text?: string
  requires_retry: boolean
  notification_summary: string
  notification_updated_at?: string
}

export interface RuntimeOperationalSummary {
  source_mode: DataSourceMode | 'mixed' | 'unknown'
  source_health: DataSourceHealth | 'mixed' | 'unknown'
  blocked_count: number
  fallback_count: number
  stale_source_count: number
  current_priority_label: string
  snapshot_origin: SnapshotSourceOrigin
  schema_version: string
  service_mode: ConnectorServiceMode
  source_label: string
  last_synced_at: string
}

export interface SignalProvider {
  simulateSignal: (snapshot: ExpoPilotSnapshot, projectId: string) => EventSignal
}

export interface EventResolver {
  resolveEvent: (snapshot: ExpoPilotSnapshot, signal: EventSignal) => EventRecord
}

export interface DispatchAdvisor {
  recommendDispatch: (snapshot: ExpoPilotSnapshot, eventId: string, assigneeId?: string) => DispatchRecommendation
}

export interface ExplainProvider {
  explainEvent: (snapshot: ExpoPilotSnapshot, eventId: string) => ExplainResult
}

export interface ReplayProvider {
  buildReplay: (snapshot: ExpoPilotSnapshot, projectId: string) => ReviewReport | undefined
}

export interface StrategyAdvisor {
  suggestStrategyName: (snapshot: ExpoPilotSnapshot, eventId: string) => string
}

export interface NotificationGatewayDescriptor {
  provider: 'local-notify-mock'
  delivery_mode: 'receipt-simulator'
}

export interface NotificationGateway {
  descriptor: NotificationGatewayDescriptor
  createReceipts: (taskId: string, channels: ReminderChannel[], retryCount?: number) => NotificationReceipt[]
  syncReceipts: (receipts: NotificationReceipt[], status: TaskStatus) => NotificationReceipt[]
}

export interface AgentGatewayDescriptor {
  provider: 'local-mock'
  version: string
  signal_provider: string
  event_resolver: string
  dispatch_advisor: string
  explain_provider: string
  replay_provider: string
  strategy_advisor: string
}

export type AgentGateway = SignalProvider &
  EventResolver &
  DispatchAdvisor &
  ExplainProvider &
  ReplayProvider &
  StrategyAdvisor & {
    descriptor: AgentGatewayDescriptor
  }

export interface AuthGatewayDescriptor {
  provider: 'local-auth-mock'
  mode: 'sandbox-login'
}

export interface LoginInput {
  email: string
  password: string
  role: RoleType
  displayName: string
  organization_label: string
  orgId?: string
  staffId?: string
}

export interface AuthGateway {
  descriptor: AuthGatewayDescriptor
  signIn: (input: LoginInput) => AuthSession
}

import type { ExpoPilotSnapshot, RoleType, Session, SystemSettings } from './domain/types'
import type { RouteState } from './lib/router'

export const SESSION_KEY = 'expopilot-os-session-v2'
export const DATA_KEY = 'expopilot-os-snapshot-v1'
export const SETTINGS_KEY = 'expopilot-os-settings-v1'

export const roleProfiles: Array<{
  role: RoleType
  title: string
  description: string
  displayName: string
  organizationLabel: string
  orgId?: string
  staffId?: string
}> = [
  {
    role: 'organizer',
    title: '主办方项目负责人',
    description: '查看全场态势、关键事件、资源调度和最终复盘，负责拍板与升级。',
    displayName: '项目经理',
    organizationLabel: '春季消费展项目组',
    orgId: 'org-main',
  },
  {
    role: 'agency',
    title: '执行方现场负责人',
    description: '负责项目配置、事件处理、任务调度和一线执行协同。',
    displayName: '执行负责人',
    organizationLabel: '现场执行团队',
    orgId: 'org-agency',
  },
  {
    role: 'brand',
    title: '品牌方展台负责人',
    description: '只查看本展台相关事件、任务进度与复盘结果，不参与全场调度。',
    displayName: '展台接待 1',
    organizationLabel: '品牌合作方',
    orgId: 'org-brand',
  },
  {
    role: 'staff',
    title: '一线工作人员',
    description: '接收提醒、执行任务、反馈状态，必要时发起支援请求。',
    displayName: '执行人员 1',
    organizationLabel: '一线执行组',
    orgId: 'org-agency',
    staffId: 'staff-01',
  },
  {
    role: 'admin',
    title: '系统管理员',
    description: '维护权限、提醒通道、降级策略与导出审计，不介入一线调度。',
    displayName: '系统管理员',
    organizationLabel: '治理与运维',
    orgId: 'org-main',
  },
]

export const defaultSystemSettings: SystemSettings = {
  login_mode: '账号密码 + 邀请加入',
  browser_notifications: true,
  voice_broadcast: false,
  vibration_reminder: true,
  silent_mode: false,
  rule_engine_enabled: true,
  model_assist_enabled: false,
  degrade_to_manual: true,
  retry_dispatch: true,
  data_retention_days: 30,
  export_requires_approval: true,
  delete_requires_review: true,
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function roleAllowsPage(role: RoleType, page: RouteState['page']) {
  if (page === 'mobile') return true
  if (role === 'staff') return page === 'staff'
  if (role === 'brand') return ['projects', 'live', 'events', 'replay', 'strategies', 'explain'].includes(page)
  if (role === 'admin') return ['projects', 'settings', 'strategies', 'replay'].includes(page)
  return page !== 'login'
}

export function routeGuard(route: RouteState, session: Session | null): RouteState {
  if (route.page === 'mobile') return route
  if (!session) return { page: 'login' }
  if (session.permission.scope === 'staff-only') return { page: 'staff' }
  if (route.page === 'login') return { page: 'projects' }
  if (roleAllowsPage(session.role, route.page)) return route
  return { page: 'projects' }
}

export function isProjectOperationallyReady(snapshot: ExpoPilotSnapshot, projectId?: string) {
  if (!projectId) return false
  const zones = snapshot.zones.filter((zone) => zone.project_id === projectId)
  const sources = snapshot.dataSources.filter((source) => source.project_id === projectId)
  return zones.length > 0 && sources.length > 0
}

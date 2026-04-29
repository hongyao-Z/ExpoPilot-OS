import type { ReactNode } from 'react'
import type { Project, RoleType, Session } from '../domain/types'
import { roleLabel } from '../lib/format'
import type { RouteState } from '../lib/router'

type NavIcon =
  | 'dashboard'
  | 'live'
  | 'events'
  | 'agent'
  | 'tasks'
  | 'replay'
  | 'analytics'
  | 'settings'

interface ShellNavItem {
  icon: NavIcon
  label: string
  route: (projectId?: string) => RouteState
  activePage: RouteState['page']
  requiresProject?: boolean
  hiddenForRoles?: RoleType[]
}

const shellNavItems: ShellNavItem[] = [
  { icon: 'dashboard', label: '总览', route: () => ({ page: 'projects' }), activePage: 'projects' },
  { icon: 'live', label: '实时监控', route: (projectId) => ({ page: 'live', projectId }), activePage: 'live', requiresProject: true },
  { icon: 'events', label: '事件中心', route: (projectId) => ({ page: 'events', projectId }), activePage: 'events', requiresProject: true },
  { icon: 'agent', label: 'Agent 驾驶舱', route: (projectId) => ({ page: 'live', projectId }), activePage: 'live', requiresProject: true },
  {
    icon: 'tasks',
    label: '任务调度',
    route: (projectId) => ({ page: 'dispatch', projectId }),
    activePage: 'dispatch',
    requiresProject: true,
    hiddenForRoles: ['brand'],
  },
  { icon: 'replay', label: '审计复盘', route: (projectId) => ({ page: 'replay', projectId }), activePage: 'replay', requiresProject: true },
  { icon: 'analytics', label: '运营分析', route: (projectId) => ({ page: 'strategies', projectId }), activePage: 'strategies', requiresProject: true },
  { icon: 'settings', label: '系统设置', route: () => ({ page: 'settings' }), activePage: 'settings' },
]

function ShellLogo() {
  return (
    <span className="shell-logo" aria-hidden="true">
      <svg viewBox="0 0 44 44" role="img">
        <path d="M7 22.4 36.5 8.2 24.8 36 20 24.8 7 22.4Z" />
        <path d="M20 24.8 36.5 8.2 15.4 28.4" />
        <circle cx="12.4" cy="16.6" r="2.2" />
        <circle cx="28.2" cy="31.2" r="2.2" />
      </svg>
    </span>
  )
}

function NavIconMark({ icon }: { icon: NavIcon }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 2 }

  return (
    <span className="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img">
        {icon === 'dashboard' ? (
          <>
            <rect x="4" y="4" width="6" height="6" rx="1.5" {...common} />
            <rect x="14" y="4" width="6" height="6" rx="1.5" {...common} />
            <rect x="4" y="14" width="6" height="6" rx="1.5" {...common} />
            <rect x="14" y="14" width="6" height="6" rx="1.5" {...common} />
          </>
        ) : null}
        {icon === 'live' ? <path d="M4 12h3l2-5 4 10 3-7 2 2h2" {...common} /> : null}
        {icon === 'events' ? (
          <>
            <rect x="5" y="5" width="14" height="15" rx="2" {...common} />
            <path d="M8 3v4M16 3v4M8 11h8M8 15h5" {...common} />
          </>
        ) : null}
        {icon === 'agent' ? (
          <>
            <circle cx="12" cy="8" r="3.2" {...common} />
            <path d="M5.5 19c1.3-3.2 3.4-4.8 6.5-4.8s5.2 1.6 6.5 4.8" {...common} />
            <path d="M19 8h1.5M3.5 8H5" {...common} />
          </>
        ) : null}
        {icon === 'tasks' ? (
          <>
            <path d="M8 7h12M8 12h12M8 17h12" {...common} />
            <path d="m4 7 .8.8L6.5 6M4 12l.8.8 1.7-1.8M4 17l.8.8 1.7-1.8" {...common} />
          </>
        ) : null}
        {icon === 'replay' ? (
          <>
            <path d="M5 12a7 7 0 1 0 2-4.9" {...common} />
            <path d="M5 5v4h4M10 9.5v5l4.2-2.5L10 9.5Z" {...common} />
          </>
        ) : null}
        {icon === 'analytics' ? <path d="M5 19V9M12 19V5M19 19v-7M4 19h16" {...common} /> : null}
        {icon === 'settings' ? (
          <>
            <circle cx="12" cy="12" r="3" {...common} />
            <path d="M12 3v2M12 19v2M4.2 7.5l1.7 1M18.1 15.5l1.7 1M4.2 16.5l1.7-1M18.1 8.5l1.7-1" {...common} />
          </>
        ) : null}
      </svg>
    </span>
  )
}

export function AppFrame(props: {
  activeProject?: Project
  children: ReactNode
  current: RouteState
  onLogout: () => void
  onNavigate: (route: RouteState) => void
  role: RoleType
  session: Session | null
  title?: string
  subtitle?: string
  actions?: ReactNode
}) {
  const projectId = props.activeProject?.project_id

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-lockup">
            <ShellLogo />
            <div>
              <strong>ExpoPilot OS</strong>
              <span>场脉系统</span>
            </div>
          </div>
          <p className="sidebar-copy">把现场信号、Agent 判断与任务调度收束成可执行的运营控制台。</p>
        </div>

        <nav className="nav-list" aria-label="主导航">
          {shellNavItems
            .filter((item) => !item.hiddenForRoles?.includes(props.role))
            .map((item) => {
            const target = item.requiresProject && !projectId ? { page: 'projects' as const } : item.route(projectId)
            const isActive = props.current.page === item.activePage && (!item.requiresProject || item.activePage !== 'live' || item.icon === 'live')

            return (
              <button className={`nav-item ${isActive ? 'active' : ''}`} key={item.label} onClick={() => props.onNavigate(target)}>
                <NavIconMark icon={item.icon} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-avatar">{(props.session?.displayName ?? roleLabel(props.role)).slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{props.session?.displayName ?? roleLabel(props.role)}</strong>
              <small>{roleLabel(props.role)}</small>
            </div>
          </div>
          <button className="ghost-button sidebar-collapse" onClick={props.onLogout}>
            退出登录
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">ExpoPilot OS / 当前项目</p>
            <h1>{props.title ?? props.activeProject?.title ?? 'ExpoPilot OS'}</h1>
            <p className="topbar-meta">
              {props.subtitle ?? `${props.activeProject?.venue_name ?? ''} / ${props.activeProject?.city ?? ''} / ${props.activeProject?.theme ?? ''}`}
            </p>
          </div>
          <div className="topbar-actions">{props.actions}</div>
        </header>
        {props.children}
      </main>
    </div>
  )
}

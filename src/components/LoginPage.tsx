import { useState, type CSSProperties } from 'react'
import type { RoleType } from '../domain/types'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function createDemoCredentials() {
  const formData = new FormData()
  formData.set('email', 'pilot@expopilot.cn')
  formData.set('password', 'ExpoPilot2026')
  return formData
}

function getRoleChipLabel(role: RoleType) {
  if (role === 'organizer') return '项目经理'
  if (role === 'staff') return '工作人员任务端'
  if (role === 'agency') return '执行负责人'
  if (role === 'brand') return '品牌方'
  return '系统管理员'
}

function getRoleChipDescription(role: RoleType) {
  if (role === 'organizer') return '确认派发与查看全局指挥台'
  if (role === 'staff') return '查看入口 A 现场处理任务'
  if (role === 'agency') return '查看执行侧协同视图'
  if (role === 'brand') return '查看展台与活动数据'
  return '查看系统管理视图'
}

const capabilityItems = [
  {
    title: '实时监控',
    description: '多区域态势感知',
    icon: 'monitor',
  },
  {
    title: '智能决策',
    description: 'AI 驱动建议推送',
    icon: 'brain',
  },
  {
    title: '任务协同',
    description: '高效派发与执行',
    icon: 'users',
  },
  {
    title: '复盘沉淀',
    description: '全链路审计分析',
    icon: 'chart',
  },
] as const

export function LoginPage(props: {
  onLogin: (credentials: FormData, role: RoleType) => void
  roleProfiles: Array<{ role: RoleType; title: string; description: string; displayName: string; organizationLabel: string }>
  authModeLabel: string
}) {
  const [selectedRole, setSelectedRole] = useState<RoleType>('organizer')
  const [showSandboxRoles, setShowSandboxRoles] = useState(false)
  const [mapFocus, setMapFocus] = useState({ x: 62, y: 42 })

  const primaryRoleProfiles = props.roleProfiles.filter((profile) => profile.role === 'organizer' || profile.role === 'staff')
  const availableRoleProfiles = primaryRoleProfiles.length >= 2 ? primaryRoleProfiles : props.roleProfiles.slice(0, 2)

  const mapStyle = {
    '--login-map-x': `${mapFocus.x}%`,
    '--login-map-y': `${mapFocus.y}%`,
  } as CSSProperties

  return (
    <main className="login-shell">
      <section className="login-frame">
        <div className="login-left">
          <header className="login-brand">
            <div className="login-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" role="img">
                <path d="M11 10h27v8H20v7h15v7H20v6h18v8H11z" />
              </svg>
            </div>
            <div>
              <strong>EXPOPILOT OS</strong>
              <span>现场运营智能决策系统</span>
            </div>
          </header>

          <section className="login-hero">
            <h1>
              ExpoPilot <span>OS</span>
            </h1>
            <p>现场运营 · 智能决策 · 高效协同</p>
            <i aria-hidden="true" />
          </section>

          <section
            className="login-map"
            aria-label="会展运营地图"
            onMouseLeave={() => setMapFocus({ x: 62, y: 42 })}
            onMouseMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect()
              const ratioX = (event.clientX - bounds.left) / bounds.width
              const ratioY = (event.clientY - bounds.top) / bounds.height
              setMapFocus({
                x: clamp(ratioX * 100, 18, 82),
                y: clamp(ratioY * 100, 18, 78),
              })
            }}
            style={mapStyle}
          >
            <div className="login-map-grid" aria-hidden="true" />
            <div className="login-map-hub" aria-hidden="true">
              <span />
            </div>
            <div className="login-map-path login-map-path--a" aria-hidden="true" />
            <div className="login-map-path login-map-path--b" aria-hidden="true" />
            <div className="login-map-path login-map-path--c" aria-hidden="true" />
            <span className="login-map-building login-map-building--entry" aria-hidden="true" />
            <span className="login-map-building login-map-building--booth" aria-hidden="true" />
            <span className="login-map-building login-map-building--device" aria-hidden="true" />
            <span className="login-map-building login-map-building--dispatch" aria-hidden="true" />
            <span className="login-map-building login-map-building--stage" aria-hidden="true" />
            <span className="login-map-marker login-map-marker--crowd">
              <b>人流监控</b>
            </span>
            <span className="login-map-marker login-map-marker--booth">
              <b>展位运营</b>
            </span>
            <span className="login-map-marker login-map-marker--device">
              <b>设备状态</b>
            </span>
            <span className="login-map-marker login-map-marker--task">
              <b>任务调度</b>
            </span>
            <span className="login-map-dot login-map-dot--one" aria-hidden="true" />
            <span className="login-map-dot login-map-dot--two" aria-hidden="true" />
            <span className="login-map-dot login-map-dot--three" aria-hidden="true" />
          </section>

          <section className="login-capabilities" aria-label="系统能力">
            {capabilityItems.map((item) => (
              <article className="login-capability" key={item.title}>
                <span className={`login-capability-icon login-capability-icon--${item.icon}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    {item.icon === 'monitor' ? (
                      <>
                        <rect x="4" y="5" width="16" height="11" rx="2" />
                        <path d="M9 20h6M12 16v4" />
                      </>
                    ) : null}
                    {item.icon === 'brain' ? (
                      <>
                        <path d="M8 8a4 4 0 0 1 8 0v8a4 4 0 0 1-8 0z" />
                        <path d="M12 4v16M8 10h8M8 14h8" />
                      </>
                    ) : null}
                    {item.icon === 'users' ? (
                      <>
                        <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                        <path d="M3.5 19a4.5 4.5 0 0 1 9 0M13.5 19a3.5 3.5 0 0 1 7 0" />
                      </>
                    ) : null}
                    {item.icon === 'chart' ? (
                      <>
                        <path d="M5 19V9M12 19V5M19 19v-7" />
                        <path d="M4 19h16" />
                      </>
                    ) : null}
                  </svg>
                </span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </section>

          <p className="login-footer">© 2024 ExpoPilot OS. All rights reserved.</p>
        </div>

        <aside className="login-right">
          <section className="login-card" aria-label="账号登录">
            <div className="login-card-head">
              <h2>账号登录</h2>
              <p>欢迎回来，请登录您的账户</p>
            </div>

            <form
              className="login-form"
              onSubmit={(event) => {
                event.preventDefault()
                props.onLogin(new FormData(event.currentTarget), selectedRole)
              }}
            >
              <label className="login-field">
                <span className="login-field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M4 7h16v10H4z" />
                    <path d="m4 8 8 6 8-6" />
                  </svg>
                </span>
                <input name="email" placeholder="邮箱地址" defaultValue="pilot@expopilot.cn" />
              </label>

              <label className="login-field">
                <span className="login-field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V8a4 4 0 0 1 8 0v2" />
                  </svg>
                </span>
                <input name="password" placeholder="密码" type="password" defaultValue="ExpoPilot2026" />
                <span className="login-field-action" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </span>
              </label>

              <div className="login-form-row">
                <label className="login-remember">
                  <input type="checkbox" name="remember" defaultChecked />
                  <span>记住我</span>
                </label>
                <button className="login-link-button" type="button">
                  忘记密码
                </button>
              </div>

              <button className="login-primary-button" type="submit">
                登录系统
              </button>
            </form>

            <div className="login-divider">
              <span>或</span>
            </div>

            <button
              className={`login-sandbox-button ${showSandboxRoles ? 'is-open' : ''}`}
              onClick={() => setShowSandboxRoles((value) => !value)}
              type="button"
            >
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
                  <path d="M4 7.5 12 12l8-4.5M12 12v9" />
                </svg>
              </span>
              沙盒环境快速登录
            </button>
            <p className="login-sandbox-helper">无需账号，选择角色进入演示环境。</p>

            {showSandboxRoles ? (
              <section className="login-role-switcher" aria-label="切换角色">
                <div className="login-role-switcher-head">
                  <div>
                    <strong>选择演示身份</strong>
                    <small>Agent 仅提供建议，最终派发由项目经理确认。</small>
                  </div>
                  <span aria-hidden="true">⌄</span>
                </div>
                <div className="login-role-chips">
                  {availableRoleProfiles.map((profile) => (
                    <button
                      className={`login-role-chip ${profile.role === selectedRole ? 'is-selected' : ''}`}
                      key={profile.role}
                      onClick={() => {
                        setSelectedRole(profile.role)
                        props.onLogin(createDemoCredentials(), profile.role)
                      }}
                      type="button"
                    >
                      <strong>{getRoleChipLabel(profile.role)}</strong>
                      <span>{getRoleChipDescription(profile.role)}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <p className="login-card-note">仅用于演示与体验，不保存任何真实数据</p>
          </section>
        </aside>
      </section>
    </main>
  )
}

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

const capabilityItems = [
  {
    title: '实时监控',
    description: '多区域态势感知',
  },
  {
    title: '智能决策',
    description: 'AI 驱动建议推送',
  },
  {
    title: '任务协同',
    description: '高效派发与执行',
  },
  {
    title: '复盘沉淀',
    description: '全链路审计分析',
  },
] as const

export function LoginPage(props: {
  onLogin: (credentials: FormData, role: RoleType) => void
  roleProfiles: Array<{ role: RoleType; title: string; description: string; displayName: string; organizationLabel: string }>
  authModeLabel: string
}) {
  const [selectedRole, setSelectedRole] = useState<RoleType>('organizer')
  const [showSandboxRoles, setShowSandboxRoles] = useState(false)
  const [sceneTilt, setSceneTilt] = useState({ rotateX: -11, rotateY: 12, glowX: 72, glowY: 24 })

  const mastheadStyle = {
    '--login-tilt-x': `${sceneTilt.rotateX}deg`,
    '--login-tilt-y': `${sceneTilt.rotateY}deg`,
    '--login-glow-x': `${sceneTilt.glowX}%`,
    '--login-glow-y': `${sceneTilt.glowY}%`,
  } as CSSProperties

  return (
    <main className="login-page login-page--reference">
      <section
        className="masthead compact-masthead login-masthead-3d login-reference-shell"
        onMouseLeave={() => setSceneTilt({ rotateX: -11, rotateY: 12, glowX: 72, glowY: 24 })}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect()
          const ratioX = (event.clientX - bounds.left) / bounds.width
          const ratioY = (event.clientY - bounds.top) / bounds.height

          setSceneTilt({
            rotateX: clamp(-20 + ratioY * 18, -18, 8),
            rotateY: clamp(-16 + ratioX * 28, -12, 18),
            glowX: clamp(ratioX * 100, 18, 88),
            glowY: clamp(ratioY * 100, 12, 84),
          })
        }}
        style={mastheadStyle}
      >
        <div className="login-reference-grid">
          <div className="login-reference-main">
            <div className="login-reference-brand">
              <div className="login-reference-brand__mark" aria-hidden="true">
                <svg viewBox="0 0 72 72" role="img">
                  <path d="M16 18h38v12H28v12h22v12H16z" />
                </svg>
              </div>
              <div className="login-reference-brand__copy">
                <strong>EXPOPILOT OS</strong>
                <span>现场运营智能决策系统</span>
              </div>
            </div>

            <div className="login-reference-copy">
              <h1>
                EXPOPILOT <span>OS</span>
              </h1>
              <p className="login-reference-copy__subtitle">现场运营 · 智能决策 · 高效协同</p>
              <span className="login-reference-copy__accent" aria-hidden="true" />
            </div>

            <div className="login-reference-visual" aria-hidden="true">
              <div className="login-venue-scene">
                <div className="login-venue-scene__aura" />
                <div className="login-venue-model">
                  <div className="login-venue-model__deck">
                    <span className="login-venue-model__zone login-venue-model__zone--entry">入口 A</span>
                    <span className="login-venue-model__zone login-venue-model__zone--stage">舞台区</span>
                    <span className="login-venue-model__zone login-venue-model__zone--booth">展台 512</span>
                    <span className="login-venue-model__zone login-venue-model__zone--service">服务台</span>
                    <span className="login-venue-model__zone login-venue-model__zone--control">控制中枢</span>
                    <span className="login-venue-model__path login-venue-model__path--primary" />
                    <span className="login-venue-model__path login-venue-model__path--secondary" />
                    <span className="login-venue-model__path login-venue-model__path--vertical" />
                    <span className="login-venue-model__beacon login-venue-model__beacon--entry" />
                    <span className="login-venue-model__beacon login-venue-model__beacon--booth" />
                    <span className="login-venue-model__beacon login-venue-model__beacon--stage" />
                  </div>
                  <div className="login-venue-tower login-venue-tower--north" />
                  <div className="login-venue-tower login-venue-tower--south" />
                  <div className="login-venue-tower login-venue-tower--west" />
                </div>
              </div>
            </div>

            <div className="login-reference-capabilities">
              {capabilityItems.map((item) => (
                <article className="login-reference-capability" key={item.title}>
                  <span className="login-reference-capability__icon" aria-hidden="true" />
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>

            <p className="login-reference-footer">© 2024 ExpoPilot OS. All rights reserved.</p>
          </div>

          <aside className="panel credential-form login-auth-card login-auth-card--reference">
            <div className="panel-head">
              <h3>账号登录</h3>
              <span>欢迎回来，请登录您的账户</span>
            </div>

            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault()
                props.onLogin(new FormData(event.currentTarget), selectedRole)
              }}
            >
              <input name="email" placeholder="邮箱地址" defaultValue="pilot@expopilot.cn" />
              <input name="password" placeholder="密码" type="password" defaultValue="ExpoPilot2026" />

              <div className="login-auth-row">
                <label className="login-check">
                  <input type="checkbox" name="remember" />
                  <span>记住我</span>
                </label>
                <button className="login-link" type="button">
                  忘记密码?
                </button>
              </div>

              <button type="submit">登录系统</button>
            </form>

            <div className="login-auth-divider">
              <span>或</span>
            </div>

            <button
              className={`login-sandbox-trigger ${showSandboxRoles ? 'is-open' : ''}`}
              onClick={() => setShowSandboxRoles((value) => !value)}
              type="button"
            >
              <span className="login-sandbox-trigger__icon" aria-hidden="true">
                ◎
              </span>
              沙盒环境快速登录
            </button>

            {showSandboxRoles ? (
              <div className="login-sandbox-panel">
                <div className="login-sandbox-panel__head">
                  <strong>选择演示角色</strong>
                  <span>点击身份后，直接以该角色进入系统</span>
                </div>

                <div className="login-role-grid login-role-grid--embedded">
                  {props.roleProfiles.map((profile) => (
                    <button
                      className={`role-card ${profile.role === selectedRole ? 'selected-role' : ''}`}
                      key={profile.role}
                      onClick={() => {
                        setSelectedRole(profile.role)
                        props.onLogin(createDemoCredentials(), profile.role)
                      }}
                      type="button"
                    >
                      <span className="role-kicker">{profile.title}</span>
                      <strong>{profile.displayName}</strong>
                      <p>{profile.description}</p>
                      <span className="role-name">{profile.organizationLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="helper-line login-auth-card__helper">仅用于演示与体验，不保存任何真实数据</p>
          </aside>
        </div>
      </section>
    </main>
  )
}

import type { Project, ProjectSummary, RoleType, Session, UiFeedbackState } from '../domain/types'
import { feedbackClassName, formatDateTime, projectStatusLabel } from '../lib/format'
import type { RouteState } from '../lib/router'
import { AppFrame } from './AppFrame'

export function ProjectsPage(props: {
  activeProject?: Project
  projects: ProjectSummary[]
  onCreateProject: (data: FormData) => void
  onLogout: () => void
  onNavigate: (route: RouteState) => void
  role: RoleType
  session: Session | null
  loading?: boolean
  feedback?: UiFeedbackState | null
}) {
  const activeProjects = props.projects.filter((project) => project.status === 'running' || project.status === 'ready').length
  const pendingEvents = props.projects.reduce((total, project) => total + project.pending_event_count, 0)
  const openTasks = props.projects.reduce((total, project) => total + project.open_task_count, 0)
  const connectedSources = props.projects.reduce((total, project) => total + project.connected_source_count, 0)
  const currentProject = props.activeProject ?? props.projects[0]
  const dashboardTrend = [42, 56, 48, 68, 74, 63, 82, 77]

  return (
    <AppFrame
      activeProject={props.activeProject}
      actions={
        currentProject ? (
          <button onClick={() => props.onNavigate({ page: 'live', projectId: currentProject.project_id })}>进入实时监控</button>
        ) : null
      }
      current={{ page: 'projects' }}
      onLogout={props.onLogout}
      onNavigate={props.onNavigate}
      role={props.role}
      session={props.session}
      title="Dashboard"
      subtitle="现场运营总览：项目、事件、任务和输入源状态集中在一个控制面板。"
    >
      <section className="dashboard-board">
        {props.feedback?.kind && props.feedback.kind !== 'idle' ? (
          <article className={`panel feedback-banner ${feedbackClassName(props.feedback)}`}>{props.feedback.message}</article>
        ) : null}

        <section className="dashboard-kpis" aria-label="运营指标">
          <article className="metric-card dashboard-kpi">
            <span>Active Projects</span>
            <strong>{activeProjects}</strong>
            <small>{props.projects.length} 个项目纳入当前视图</small>
          </article>
          <article className="metric-card dashboard-kpi">
            <span>Input Sources</span>
            <strong>{connectedSources}</strong>
            <small>camera / manual / mobile status</small>
          </article>
          <article className="metric-card dashboard-kpi">
            <span>Open Events</span>
            <strong>{pendingEvents}</strong>
            <small>等待确认或调度处理</small>
          </article>
          <article className="metric-card dashboard-kpi">
            <span>Open Tasks</span>
            <strong>{openTasks}</strong>
            <small>仍未完全闭环的现场任务</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel dashboard-trend">
            <div className="panel-head">
              <div>
                <h3>Operations Pulse</h3>
                <span>最近 8 个观察窗口的现场热度趋势。</span>
              </div>
              <span className="status-pill status-running">Live</span>
            </div>
            <div className="trend-bars" aria-label="趋势图">
              {dashboardTrend.map((value, index) => (
                <span key={`${value}-${index}`} style={{ height: `${value}%` }}>
                  <i>{value}</i>
                </span>
              ))}
            </div>
            <p className="helper-line">橙色峰值用于标记需要运营侧继续关注的高热度窗口。</p>
          </article>

          <article className="panel dashboard-summary-card">
            <div className="panel-head">
              <div>
                <h3>Event Overview</h3>
                <span>当前事件中心的最小可执行摘要。</span>
              </div>
            </div>
            <div className="summary-list">
              <div>
                <span>视觉感知事件</span>
                <strong>entrance_congestion / booth_heatup</strong>
              </div>
              <div>
                <span>推荐动作</span>
                <strong>补位 / 支援接待</strong>
              </div>
              <div>
                <span>Agent 控制面</span>
                <strong>risk / audit / takeover ready</strong>
              </div>
            </div>
          </article>

          <article className="panel dashboard-alert-card">
            <div className="panel-head">
              <div>
                <h3>Alert Summary</h3>
                <span>只显示影响演示主链路的关键告警。</span>
              </div>
              <span className="status-pill status-ready">Guarded</span>
            </div>
            <div className="alert-stack">
              <div>
                <strong>Camera replay</strong>
                <span>入口与展台事件均走单一 camera 上游入口。</span>
              </div>
              <div>
                <strong>Auto boundary</strong>
                <span>高风险或 fallback 场景保持 Assist 审批边界。</span>
              </div>
              <div>
                <strong>Audit trail</strong>
                <span>关键决策、执行、接管记录前端持久化。</span>
              </div>
            </div>
          </article>
        </section>

        <section className="dashboard-lower-grid">
          <article className="panel dashboard-create">
            <div className="panel-head">
              <div>
                <h3>创建项目</h3>
                <span>默认表单已对齐“春季消费展”演示场景。</span>
              </div>
            </div>
            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault()
                props.onCreateProject(new FormData(event.currentTarget))
              }}
            >
              <input name="title" placeholder="项目名称" defaultValue="春季消费展" />
              <input name="venue" placeholder="场馆名称" defaultValue="国家会展中心 2 号馆" />
              <input name="city" placeholder="城市" defaultValue="上海" />
              <input name="theme" placeholder="项目主题" defaultValue="ExpoPilot OS 现场运营 MVP" />
              <button type="submit">创建项目</button>
            </form>
          </article>

          <section className="project-list dashboard-project-list">
            {props.loading ? <article className="panel empty-panel">正在加载项目快照…</article> : null}
            {!props.loading && props.projects.length === 0 ? <article className="panel empty-panel">当前还没有项目，先创建“春季消费展”。</article> : null}
            {!props.loading
              ? props.projects.map((project) => {
                  const needsConfig = project.zone_count < 4 || project.connected_source_count === 0
                  const primaryRoute: RouteState = needsConfig
                    ? { page: 'config', projectId: project.project_id }
                    : { page: 'live', projectId: project.project_id }

                  return (
                    <button className="project-card project-card-rich" key={project.project_id} onClick={() => props.onNavigate(primaryRoute)}>
                      <div className="project-card-top">
                        <span className={`status-pill status-${project.status}`}>{projectStatusLabel(project.status)}</span>
                        <span>{project.city}</span>
                      </div>
                      <strong>{project.title}</strong>
                      <p>{project.theme}</p>
                      <small>
                        {project.venue_name} / {formatDateTime(project.start_at)}
                      </small>
                      <div className="project-stats">
                        <span>区域 {project.zone_count}/4</span>
                        <span>输入源 {project.connected_source_count}</span>
                        <span>事件 {project.pending_event_count}</span>
                        <span>任务 {project.open_task_count}</span>
                      </div>
                      <small>{needsConfig ? '下一步：进入区域配置' : '下一步：进入实时监控'}</small>
                    </button>
                  )
                })
              : null}
          </section>
        </section>
      </section>
    </AppFrame>
  )
}

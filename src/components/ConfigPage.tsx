import type { DataSource, ExpoPilotSnapshot, Project, RoleType, Session, UiFeedbackState, Zone } from '../domain/types'
import { feedbackClassName, sourceStatusLabel, sourceTypeLabel, zoneTypeLabel } from '../lib/format'
import type { RouteState } from '../lib/router'
import { AppFrame } from './AppFrame'

const requiredZones = [
  { name: '入口区', zoneType: 'entry', recommendedAction: '入口出现拥堵时，优先安排执行人员补位疏导。' },
  { name: '主通道区', zoneType: 'stage', recommendedAction: '主通道客流上升时，保持导流通畅。' },
  { name: '展台 A', zoneType: 'booth', recommendedAction: '展台热度升高时，准备支援接待。' },
  { name: '展台 B', zoneType: 'booth', recommendedAction: '展台波动时，优先保持待命。' },
] as const

export function ConfigPage(props: {
  activeProject?: Project
  onLogout: () => void
  onNavigate: (route: RouteState) => void
  role: RoleType
  snapshot: ExpoPilotSnapshot
  session: Session | null
  updateSource: (sourceId: string, health: DataSource['health']) => void
  updateZone: (zoneId: string, patch: Partial<Zone>) => void
  addZone: (projectId: string, formData: FormData) => void
  removeZone: (zoneId: string) => void
  fallbackSource: (sourceId: string) => void
  reassignStaffZone: (staffId: string, zoneId: string) => void
  blockedReason?: string
  feedback?: UiFeedbackState | null
}) {
  const zones = props.snapshot.zones.filter((zone) => zone.project_id === props.activeProject?.project_id)
  const sources = props.snapshot.dataSources.filter((source) => source.project_id === props.activeProject?.project_id)
  const zoneNames = new Set(zones.map((zone) => zone.name))
  const missingZones = requiredZones.filter((zone) => !zoneNames.has(zone.name))
  const readyForLive = zones.length >= 4 && sources.length > 0

  return (
    <AppFrame
      activeProject={props.activeProject}
      current={{ page: 'config', projectId: props.activeProject?.project_id }}
      onLogout={props.onLogout}
      onNavigate={props.onNavigate}
      role={props.role}
      session={props.session}
      title="区域配置"
      subtitle="先补齐入口区、主通道区、展台 A、展台 B 四个区域，再确认输入源可用，然后进入实时态势。"
      actions={
        readyForLive ? (
          <button onClick={() => props.onNavigate({ page: 'live', projectId: props.activeProject?.project_id })}>进入实时态势</button>
        ) : undefined
      }
    >
      <section className="page-grid config-grid">
        {props.feedback?.kind && props.feedback.kind !== 'idle' ? (
          <article className={`panel feedback-banner ${feedbackClassName(props.feedback)}`}>{props.feedback.message}</article>
        ) : null}
        {props.blockedReason ? <article className="panel warning-card">{props.blockedReason}</article> : null}

        <article className="panel">
          <div className="panel-head">
            <h3>配置进度</h3>
            <span>任务 3 只保留后台主链路所需配置，不扩展额外交互。</span>
          </div>
          <div className="chip-row">
            <span className="chip">区域 {zones.length}/4</span>
            <span className="chip">输入源 {sources.length}</span>
            <span className="chip">状态 {readyForLive ? '可进入实时态势' : '仍需补齐配置'}</span>
          </div>
          <p className="helper-line">最低要求：四个固定区域已存在，且至少有一个输入源可用。</p>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>已配置区域</h3>
            <span>可继续调整阈值与默认动作，但当前目标只要求四个固定区域可用。</span>
          </div>
          <div className="stack-cards">
            {zones.map((zone) => (
              <div className="config-card" key={zone.zone_id}>
                <div className="config-head">
                  <strong>{zone.name}</strong>
                  <span>{zoneTypeLabel(zone.zone_type)}</span>
                </div>
                <label>
                  风险阈值
                  <input
                    type="range"
                    min="35"
                    max="95"
                    value={zone.threshold}
                    onChange={(event) => props.updateZone(zone.zone_id, { threshold: Number(event.target.value) })}
                  />
                  <span>{zone.threshold}</span>
                </label>
                <label>
                  默认动作
                  <textarea
                    rows={3}
                    value={zone.recommended_action}
                    onChange={(event) => props.updateZone(zone.zone_id, { recommended_action: event.target.value })}
                  />
                </label>
                <div className="inline-actions">
                  <button className="ghost-button" onClick={() => props.removeZone(zone.zone_id)}>
                    删除区域
                  </button>
                </div>
              </div>
            ))}
            {zones.length === 0 ? <p className="empty-copy">当前还没有区域，先补齐四个固定区域。</p> : null}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h3>补齐固定区域</h3>
            <span>一键按固定场景补齐，不需要额外设计信息架构。</span>
          </div>
          <div className="stack-cards">
            {missingZones.map((zone) => (
              <form
                className="config-card stack-form"
                key={zone.name}
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!props.activeProject) return
                  props.addZone(props.activeProject.project_id, new FormData(event.currentTarget))
                }}
              >
                <strong>{zone.name}</strong>
                <input name="zone_name" defaultValue={zone.name} readOnly />
                <input name="zone_type" defaultValue={zone.zoneType} readOnly />
                <textarea name="recommended_action" rows={3} defaultValue={zone.recommendedAction} readOnly />
                <button type="submit">添加 {zone.name}</button>
              </form>
            ))}
            {missingZones.length === 0 ? <p className="empty-copy">四个固定区域已全部就绪。</p> : null}
          </div>
        </article>

        <article className="panel map-panel">
          <div className="panel-head">
            <h3>输入源状态</h3>
            <span>只保留任务 3 所需能力：确认输入源可用，并在异常时切换到回退输入。</span>
          </div>
          <div className="stack-cards">
            {sources.map((source) => (
              <div className="config-card" key={source.source_id}>
                <div className="config-head">
                  <strong>{source.name}</strong>
                  <span>{sourceTypeLabel(source.mode)}</span>
                </div>
                <small>{source.provider_name}</small>
                <label>
                  健康状态
                  <select value={source.health} onChange={(event) => props.updateSource(source.source_id, event.target.value as DataSource['health'])}>
                    <option value="online">{sourceStatusLabel('online')}</option>
                    <option value="degraded">{sourceStatusLabel('degraded')}</option>
                    <option value="offline">{sourceStatusLabel('offline')}</option>
                  </select>
                </label>
                <p>最近心跳：{source.last_seen_at}</p>
                <div className="inline-actions">
                  <button className="ghost-button" onClick={() => props.fallbackSource(source.source_id)}>
                    切换回退输入
                  </button>
                </div>
              </div>
            ))}
            {sources.length === 0 ? <p className="empty-copy">当前没有输入源，任务 3 无法进入实时态势。</p> : null}
          </div>
        </article>
      </section>
    </AppFrame>
  )
}

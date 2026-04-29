import { useMemo, useState } from 'react'
import type { EventOperationalItem, Project, RoleType, Session, UiFeedbackState, Zone } from '../domain/types'
import { eventOperationalStateLabel, feedbackClassName, formatDateTime, severityLabel, sourceTypeLabel, triggerRuleLabel } from '../lib/format'
import type { RouteState } from '../lib/router'
import { AppFrame } from './AppFrame'

export function EventCenterPage(props: {
  activeProject?: Project
  eventItems: EventOperationalItem[]
  zones: Zone[]
  role: RoleType
  session: Session | null
  onNavigate: (route: RouteState) => void
  onLogout: () => void
  onDispatchEvent: (eventId: string, assigneeId?: string) => void
  onConfirmEvent: (eventId: string) => void
  onIgnoreEvent: (eventId: string) => void
  onEscalateEvent: (eventId: string) => void
  onCreateManualEvent: (data: FormData) => void
  feedback?: UiFeedbackState | null
}) {
  const [zoneFilter, setZoneFilter] = useState('all')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(props.eventItems[0]?.event.event_id ?? null)

  const filteredEvents = useMemo(() => {
    return props.eventItems.filter((item) => {
      if (zoneFilter !== 'all' && item.event.zone_id !== zoneFilter) return false
      return item.event.event_type === 'entrance_congestion'
    })
  }, [props.eventItems, zoneFilter])

  const selectedItem = filteredEvents.find((item) => item.event.event_id === selectedEventId) ?? filteredEvents[0]

  return (
    <AppFrame
      activeProject={props.activeProject}
      current={{ page: 'events', projectId: props.activeProject?.project_id }}
      onLogout={props.onLogout}
      onNavigate={props.onNavigate}
      role={props.role}
      session={props.session}
      title="事件中心"
      subtitle="本轮只围绕入口拥堵事件处理：确认事件、生成补位任务，并跳转到调度页。"
    >
      <section className="page-grid">
        {props.feedback?.kind && props.feedback.kind !== 'idle' ? (
          <article className={`panel feedback-banner ${feedbackClassName(props.feedback)}`}>{props.feedback.message}</article>
        ) : null}

        <article className="panel">
          <div className="panel-head">
            <h3>筛选范围</h3>
            <span>只保留任务 3 所需条件，不扩展其它事件流。</span>
          </div>
          <div className="filter-grid">
            <select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)}>
              <option value="all">全部区域</option>
              {props.zones.map((zone) => (
                <option key={zone.zone_id} value={zone.zone_id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
          <p className="helper-line">当前只展示 `entrance_congestion` 事件。</p>
        </article>

        <article className="panel panel-span">
          <div className="panel-head">
            <h3>事件列表</h3>
            <span>先选中入口拥堵事件，再在右侧生成补位任务。</span>
          </div>
          <div className="signal-list">
            {filteredEvents.map((item) => (
              <button
                className={`signal-card severity-${item.event.severity} ${selectedItem?.event.event_id === item.event.event_id ? 'selected-card' : ''}`}
                key={item.event.event_id}
                onClick={() => setSelectedEventId(item.event.event_id)}
              >
                <div className="signal-card-head">
                  <span>{severityLabel(item.event.severity)}</span>
                  <span>{formatDateTime(item.event.timestamp)}</span>
                </div>
                <strong>{item.event.title}</strong>
                <p>{item.event.summary}</p>
                <div className="chip-row">
                  <span className="chip">{eventOperationalStateLabel(item.operational_state)}</span>
                  <span className="chip">{item.zone_name}</span>
                  {item.assignee_name ? <span className="chip">执行人：{item.assignee_name}</span> : null}
                </div>
                <small>{item.latest_feedback_label}</small>
              </button>
            ))}
            {filteredEvents.length === 0 ? <p className="empty-copy">当前还没有入口拥堵事件，请先回到实时态势触发 mock 事件。</p> : null}
          </div>
        </article>

        <article className="panel panel-span">
          <div className="panel-head">
            <h3>事件处理</h3>
            <span>这里只保留最小动作链：确认事件、生成补位任务、进入调度页。</span>
          </div>
          {selectedItem ? (
            <div className="stack-cards">
              <div className="config-card">
                <div className="config-head">
                  <strong>{selectedItem.event.title}</strong>
                  <span>{eventOperationalStateLabel(selectedItem.operational_state)}</span>
                </div>
                <p>{selectedItem.event.summary}</p>
                <small>
                  {selectedItem.zone_name} / {sourceTypeLabel(selectedItem.source_mode)} / {selectedItem.source_label}
                </small>
              </div>

              <div className="config-card">
                <strong>触发依据</strong>
                <p>{selectedItem.event.explanation}</p>
                <div className="chip-row">
                  {selectedItem.trigger_points.map((rule) => (
                    <span className="chip" key={rule}>
                      {triggerRuleLabel(rule)}
                    </span>
                  ))}
                </div>
                <small>{selectedItem.event.recommended_action}</small>
              </div>

              <div className="config-card">
                <strong>任务状态</strong>
                <p>{selectedItem.task ? selectedItem.task.action_summary : '当前还没有任务，可直接生成一条补位任务。'}</p>
                <small>{selectedItem.latest_feedback_label}</small>
              </div>

              <div className="inline-actions">
                <button onClick={() => props.onConfirmEvent(selectedItem.event.event_id)}>确认事件</button>
                <button className="ghost-button" onClick={() => props.onDispatchEvent(selectedItem.event.event_id, selectedItem.task?.assignee_id)}>
                  {selectedItem.task ? '重新生成任务' : '生成补位任务'}
                </button>
                <button className="ghost-button" onClick={() => props.onNavigate({ page: 'dispatch', projectId: props.activeProject?.project_id })}>
                  去调度页
                </button>
              </div>
            </div>
          ) : (
            <p className="empty-copy">当前没有可处理事件。</p>
          )}
        </article>
      </section>
    </AppFrame>
  )
}

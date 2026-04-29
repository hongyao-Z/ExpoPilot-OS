import { formatDateTime } from '../lib/format'
import type { AgentCockpitViewModel, AgentMode } from '../lib/agent-view-model'

export function AgentCockpitPanel(props: {
  mode: AgentMode
  onModeChange: (mode: AgentMode) => void
  onPrimaryAction: () => void
  onTakeover: () => void
  viewModel: AgentCockpitViewModel
}) {
  const { mode, onModeChange, onPrimaryAction, onTakeover, viewModel } = props
  const visibleAuditRecords = viewModel.auditRecords.slice(-4).reverse()

  return (
    <article className="agent-cockpit">
      <header className="agent-cockpit__header">
        <div className="agent-cockpit__heading">
          <span className="agent-chip agent-chip--online">在线</span>
          <h3>Agent 驾驶舱</h3>
          <p>{viewModel.statusSummary}</p>
        </div>
        <div className="segmented-control agent-cockpit__mode-toggle">
          <button className={mode === 'assist' ? 'active' : ''} onClick={() => onModeChange('assist')}>
            辅助
          </button>
          <button className={mode === 'auto' ? 'active' : ''} onClick={() => onModeChange('auto')}>
            自动
          </button>
        </div>
      </header>

      <div className="agent-cockpit__meta-row">
        <span className="agent-chip">决策来源：{viewModel.decisionProducerLabel}</span>
        <span className="agent-chip">{viewModel.explanationSourceLabel}</span>
        <span className="agent-chip agent-chip--warning">{viewModel.explanationFallbackLabel}</span>
      </div>

      <section className="agent-cockpit__summary">
        <InfoMetric label="当前模式" value={mode === 'assist' ? '辅助 / 人工批准' : '自动 / 受控执行'} />
        <InfoMetric label="当前状态" value={viewModel.state} />
        <InfoMetric label="关注区域" value={viewModel.focusZoneLabel} />
        <InfoMetric label="建议动作" value={viewModel.actionLabel} />
        <InfoMetric label="风险等级" value={viewModel.riskLevelLabel} />
      </section>

      <section className="agent-cockpit__section agent-cockpit__decision">
        <div className="agent-cockpit__section-head">
          <div>
            <span className="agent-cockpit__kicker">决策摘要</span>
            <h4>{viewModel.eventLabel}</h4>
          </div>
          <span className="agent-chip">{viewModel.state}</span>
        </div>
        <div className="agent-cockpit__decision-grid">
          <MetaBlock label="推荐动作" value={viewModel.actionLabel} />
          <MetaBlock label="推荐执行人" value={viewModel.assigneeLabel} />
          <MetaBlock label="当前关注区域" value={viewModel.focusZoneLabel} />
          <MetaBlock label="风控边界" value={viewModel.actionReason} />
        </div>
      </section>

      <section className="agent-cockpit__explanations">
        <ExplanationCard title="why_event" label="为什么判断事件" content={viewModel.explanations.why_event} />
        <ExplanationCard title="why_action" label="为什么建议动作" content={viewModel.explanations.why_action} />
        <ExplanationCard title="why_assignee" label="为什么推荐执行人" content={viewModel.explanations.why_assignee} />
        <ExplanationCard title="why_state" label="为什么处于当前状态" content={viewModel.explanations.why_state} />
      </section>

      <section className="agent-cockpit__two-col">
        <div className="agent-cockpit__section agent-cockpit__risk">
          <div className="agent-cockpit__section-head">
            <div>
              <span className="agent-cockpit__kicker">风险与审批</span>
              <h4>风控与审批</h4>
            </div>
            <span className="agent-chip agent-chip--warning">{viewModel.riskLevelLabel}</span>
          </div>
          <div className="agent-cockpit__status-list">
            <p>{viewModel.decisionMetaSummary}</p>
            <p>{viewModel.actionReason}</p>
            <p>{viewModel.explanationFallbackLabel}</p>
          </div>
        </div>

        <div className="agent-cockpit__section agent-cockpit__execution">
          <div className="agent-cockpit__section-head">
            <div>
              <span className="agent-cockpit__kicker">执行桥接</span>
              <h4>执行与接管</h4>
            </div>
            <span className="agent-chip">{viewModel.primaryActionEnabled ? '就绪' : '锁定'}</span>
          </div>
          <div className="agent-cockpit__status-list">
            <p>{viewModel.takeoverStatusLabel}</p>
            <p>{viewModel.controlsStatusLabel}</p>
            <p>{viewModel.postActionOwnerLabel}</p>
          </div>
          <div className="agent-cockpit__actions">
            <button className="agent-action-button agent-action-button--primary" disabled={!viewModel.primaryActionEnabled} onClick={onPrimaryAction}>
              {viewModel.primaryActionLabel}
            </button>
            {viewModel.takeoverAvailable ? (
              <button className="agent-action-button agent-action-button--secondary" onClick={onTakeover}>
                {viewModel.takeoverLabel}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="agent-cockpit__section agent-cockpit__audit">
        <div className="agent-cockpit__section-head">
          <div>
            <span className="agent-cockpit__kicker">审计轨迹</span>
            <h4>审计摘要</h4>
          </div>
          <span className="agent-chip">{viewModel.auditRecords.length} 条</span>
        </div>
        <p className="agent-cockpit__audit-summary">{viewModel.auditSummary}</p>
        <div className="agent-cockpit__log-grid">
          <TimelineList
            emptyText="当前还没有可记录的 Agent 动作，系统保持观察。"
            items={viewModel.logs.map((item) => ({
              id: `${item.stage}-${item.at}-${item.detail}`,
              title: item.label,
              detail: item.detail,
              at: item.at,
            }))}
            title="Agent 日志"
          />
          <TimelineList
            emptyText="当前还没有 Agent 审计记录。"
            items={visibleAuditRecords.map((item) => ({
              id: item.auditId,
              title: item.action,
              detail: item.detail,
              at: item.createdAt,
            }))}
            title="最近审计"
          />
        </div>
      </section>
    </article>
  )
}

function InfoMetric(props: { label: string; value: string }) {
  return (
    <div className="agent-cockpit__metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  )
}

function MetaBlock(props: { label: string; value: string }) {
  return (
    <div className="agent-cockpit__meta-block">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  )
}

function ExplanationCard(props: { title: string; label: string; content: string }) {
  return (
    <section className="agent-cockpit__explanation-card">
      <span>{props.title}</span>
      <strong>{props.label}</strong>
      <p>{props.content}</p>
    </section>
  )
}

function TimelineList(props: {
  emptyText: string
  items: Array<{ id: string; title: string; detail: string; at: string }>
  title: string
}) {
  return (
    <div className="agent-cockpit__timeline">
      <div className="agent-cockpit__timeline-head">
        <strong>{props.title}</strong>
        <span>{props.items.length} 条</span>
      </div>
      {props.items.length > 0 ? (
        <div className="agent-cockpit__timeline-list">
          {props.items.map((item) => (
            <div className="agent-cockpit__timeline-item" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{formatDateTime(item.at)}</span>
              </div>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-copy">{props.emptyText}</p>
      )}
    </div>
  )
}

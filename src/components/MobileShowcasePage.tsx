import { useState } from 'react'
import { getDefaultStaffFeedbackDemoStep, listStaffFeedbackDemoSteps } from '../lib/staff-feedback-demo'

const mobileKpis = [
  { label: '当前事件', value: '3', note: '入口 / 展台 / 服务台' },
  { label: '待处理任务', value: '2', note: '等待人工确认' },
  { label: 'Agent 建议', value: '已生成', note: 'OpenClaw 解释在线' },
  { label: '现场反馈', value: '4', note: '接收 / 处理 / 完成 / 异常' },
]

export function MobileShowcasePage() {
  const feedbackSteps = listStaffFeedbackDemoSteps()
  const [activeFeedbackId, setActiveFeedbackId] = useState(getDefaultStaffFeedbackDemoStep().id)
  const activeFeedback = feedbackSteps.find((step) => step.id === activeFeedbackId) ?? getDefaultStaffFeedbackDemoStep()

  const goToLive = () => {
    window.location.hash = '#/project/project-spring-2026/live'
  }

  const goToProjects = () => {
    window.location.hash = '#/projects'
  }

  return (
    <main className="mobile-showcase">
      <section className="mobile-phone-frame" aria-label="场脉移动端展演页">
        <header className="mobile-hero">
          <div className="mobile-hero__content">
            <p className="mobile-eyebrow">现场运营移动展演端</p>
            <h1>
              把现场信号变成
              <span>可解释的行动</span>
            </h1>
            <p>扫码即可查看入口拥堵、展台热度、Agent 解释与审计复盘链路。</p>
          </div>
          <div className="mobile-chip-row">
            <span>演示运行中</span>
            <span>OpenClaw 已接入</span>
            <span>视觉感知在线</span>
          </div>
        </header>

        <section className="mobile-status-grid" aria-label="当前现场状态">
          {mobileKpis.map((item) => (
            <article className="mobile-card mobile-kpi" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.note}</small>
            </article>
          ))}
        </section>

        <section className="mobile-card mobile-event-card">
          <div className="mobile-section-head">
            <span>实时事件</span>
            <strong>现场运营信号</strong>
          </div>
          <article className="mobile-event-primary">
            <div>
              <span className="mobile-tag">摄像头感知</span>
              <h2>入口拥堵</h2>
              <p>入口 A / 排队过长 / 密度升高 / 速度下降</p>
            </div>
            <strong>补位</strong>
          </article>
        </section>

        <section className="mobile-card mobile-feedback-card">
          <div className="mobile-section-head">
            <span>工作人员反馈</span>
            <strong>任务闭环 demo</strong>
          </div>

          <div className="mobile-feedback-tabs" aria-label="切换工作人员反馈状态">
            {feedbackSteps.map((step) => (
              <button
                className={step.id === activeFeedback.id ? 'active' : ''}
                key={step.id}
                onClick={() => setActiveFeedbackId(step.id)}
                type="button"
              >
                {step.shortLabel}
              </button>
            ))}
          </div>

          <article className={`mobile-feedback-panel mobile-feedback-panel--${activeFeedback.tone}`}>
            <div className="mobile-feedback-status">
              <span>{activeFeedback.timestampLabel}</span>
              <strong>{activeFeedback.label}</strong>
            </div>
            <div className="mobile-feedback-body">
              <h2>{activeFeedback.taskTitle}</h2>
              <p>{activeFeedback.note}</p>
            </div>
            <div className="mobile-feedback-meta">
              <span>{activeFeedback.staffName}</span>
              <span>{activeFeedback.zoneName}</span>
              <span>{activeFeedback.nextAction}</span>
            </div>
          </article>
        </section>

        <footer className="mobile-cta">
          <button onClick={goToLive}>查看桌面控制台</button>
          <button className="mobile-ghost-button" onClick={goToProjects}>返回项目入口</button>
        </footer>
      </section>
    </main>
  )
}

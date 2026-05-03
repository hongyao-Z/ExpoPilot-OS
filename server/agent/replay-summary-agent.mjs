import { guardReplaySummaryOutput } from '../schemas/guards.mjs'

export function summarizeReplay({ event, task, auditLogs = [] }) {
  const output = {
    whatHappened: `${event.eventName}，风险等级为 ${event.riskLevel}。`,
    whyDetected: event.evidence.join('；'),
    whatWasRecommended: 'DispatchAgent 建议增派入口引导员进行分流。',
    whoConfirmed: task.dispatchConfirmed ? '项目经理已确认派发。' : '项目经理尚未确认派发。',
    whoExecuted: task.assigneeName,
    result: task.taskStatus === 'feedback_submitted' ? task.lastFeedbackText : '等待工作人员完成反馈。',
    playbookSuggestion: '建议沉淀为入口拥堵预案模板，包含证据阈值、人员派发和 5 分钟 fallback。',
    auditCount: auditLogs.length,
  }

  return guardReplaySummaryOutput(output)
}

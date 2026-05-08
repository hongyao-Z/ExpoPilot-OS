import type { MonitoringAlert } from './monitoring-alerts'
import type { EventReviewAgentDecision } from './event-review-agent'
import type { DispatchAgentRecommendation } from './dispatch-agent'

export type AgentCollaborationStage =
  | 'signal_received'
  | 'event_reviewed'
  | 'dispatch_recommended'
  | 'manager_confirmed'
  | 'task_dispatched'
  | 'staff_feedback_received'
  | 'replay_reported'

export interface AgentCollaborationRecord {
  recordId: string
  eventId: string
  stage: AgentCollaborationStage
  actor: string
  inputSummary: string
  outputSummary: string
  evidenceIds: readonly string[]
  managerConfirmationRequired: boolean
  forbiddenAutoExecution: boolean
  timestampLabel: string
}

export function getCollaborationStageLabel(stage: AgentCollaborationStage) {
  const labels: Record<AgentCollaborationStage, string> = {
    signal_received: '监控信号已接收',
    event_reviewed: '事件审核已完成',
    dispatch_recommended: '派发建议已生成',
    manager_confirmed: '项目经理已确认',
    task_dispatched: '任务已派发',
    staff_feedback_received: '工作人员已反馈',
    replay_reported: '复盘报告已生成',
  }

  return labels[stage]
}

export function buildCollaborationRecord(input: AgentCollaborationRecord): AgentCollaborationRecord {
  return {
    ...input,
    managerConfirmationRequired: true,
    forbiddenAutoExecution: true,
  }
}

export function assertAgentBoundary(record: Pick<AgentCollaborationRecord, 'managerConfirmationRequired' | 'forbiddenAutoExecution'>) {
  return record.managerConfirmationRequired === true && record.forbiddenAutoExecution === true
}

export function listDemoCollaborationRecords(input?: {
  alert?: MonitoringAlert | null
  review?: EventReviewAgentDecision | null
  dispatch?: DispatchAgentRecommendation | null
}) {
  const alert = input?.alert ?? null
  const review = input?.review ?? null
  const dispatch = input?.dispatch ?? null
  const eventId = alert?.alertId ?? review?.alertId ?? dispatch?.alertId ?? 'demo-event-entrance-congestion'
  const evidenceIds = review?.finding.evidence.map((item) => item.evidenceId) ?? alert?.evidence.map((item) => item.evidenceId) ?? []

  return [
    buildCollaborationRecord({
      recordId: `${eventId}-signal`,
      eventId,
      stage: 'signal_received',
      actor: 'MonitoringSignal',
      inputSummary: alert?.sourceName ?? '入口 A 监控源',
      outputSummary: alert?.summary ?? '入口 A 出现人流拥堵信号',
      evidenceIds,
      managerConfirmationRequired: true,
      forbiddenAutoExecution: true,
      timestampLabel: alert?.timestampLabel ?? '10:05',
    }),
    buildCollaborationRecord({
      recordId: `${eventId}-review`,
      eventId,
      stage: 'event_reviewed',
      actor: 'EventReviewAgent',
      inputSummary: alert?.title ?? '入口 A 告警',
      outputSummary: review ? `${review.professionalRiskNote} / ${review.evidenceQuality}` : '等待事件审核结果',
      evidenceIds,
      managerConfirmationRequired: true,
      forbiddenAutoExecution: true,
      timestampLabel: review?.reviewedAtLabel ?? '10:06',
    }),
    buildCollaborationRecord({
      recordId: `${eventId}-dispatch`,
      eventId,
      stage: 'dispatch_recommended',
      actor: 'DispatchAgent',
      inputSummary: review?.finding.title ?? '入口拥堵审核结果',
      outputSummary: dispatch ? `${dispatch.recommendedActionLabel} / ${dispatch.primaryAssignee?.staffName ?? '人工调度'}` : '等待派发建议',
      evidenceIds,
      managerConfirmationRequired: true,
      forbiddenAutoExecution: true,
      timestampLabel: '10:06',
    }),
    buildCollaborationRecord({
      recordId: `${eventId}-manager`,
      eventId,
      stage: 'manager_confirmed',
      actor: 'ManagerConfirmation',
      inputSummary: dispatch?.recommendedActionLabel ?? '派发建议',
      outputSummary: '项目经理确认后才允许进入任务状态流',
      evidenceIds,
      managerConfirmationRequired: true,
      forbiddenAutoExecution: true,
      timestampLabel: '10:07',
    }),
    buildCollaborationRecord({
      recordId: `${eventId}-task`,
      eventId,
      stage: 'task_dispatched',
      actor: 'TaskLifecycle',
      inputSummary: '项目经理确认',
      outputSummary: '任务派发给入口引导员并等待接收',
      evidenceIds,
      managerConfirmationRequired: true,
      forbiddenAutoExecution: true,
      timestampLabel: '10:07',
    }),
    buildCollaborationRecord({
      recordId: `${eventId}-feedback`,
      eventId,
      stage: 'staff_feedback_received',
      actor: 'StaffFeedback',
      inputSummary: '入口引导员到场处理',
      outputSummary: '工作人员反馈排队长度下降，需要继续观察',
      evidenceIds,
      managerConfirmationRequired: true,
      forbiddenAutoExecution: true,
      timestampLabel: '10:11',
    }),
    buildCollaborationRecord({
      recordId: `${eventId}-replay`,
      eventId,
      stage: 'replay_reported',
      actor: 'ReplayReporter',
      inputSummary: '证据、建议、确认、反馈记录',
      outputSummary: '生成入口拥堵处置复盘和预案建议',
      evidenceIds,
      managerConfirmationRequired: true,
      forbiddenAutoExecution: true,
      timestampLabel: '10:40',
    }),
  ] as const
}

export function getCollaborationRecordsByEventId(eventId: string, records = listDemoCollaborationRecords()) {
  return records.filter((record) => record.eventId === eventId)
}

export function getLatestCollaborationStage(records: readonly AgentCollaborationRecord[]) {
  return records.at(-1)?.stage ?? null
}

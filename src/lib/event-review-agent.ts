import {
  listMonitoringAlerts,
  type MonitoringAlert,
  type MonitoringAlertSeverity,
} from './monitoring-alerts'
import { getVenueEventDefinition } from './venue-event-types'
import {
  evaluateEvidenceQuality,
  getEvidenceQualityLabel,
  getEventOperationsKnowledge,
  inferMissingEvidence,
  type EvidenceQuality,
} from './event-operations-knowledge'

export type ReviewHandlingDecision = 'handle_required' | 'watch_required' | 'no_action_required'
export type EventReviewRiskLevel = 'critical' | 'high' | 'medium' | 'low'
export type EventReviewConfidenceLabel = 'high_confidence' | 'medium_confidence' | 'low_confidence'

export interface EventReviewEvidenceItem {
  evidenceId: string
  sourceId: string
  label: string
  detail: string
  frameLabel: string
  timestampLabel: string
  confidence: number
}

export interface EventReviewAgentFinding {
  findingId: string
  title: string
  whatHappened: string
  evidenceSummary: string
  riskLevel: EventReviewRiskLevel
  handlingDecision: ReviewHandlingDecision
  confidenceLabel: EventReviewConfidenceLabel
  evidence: readonly EventReviewEvidenceItem[]
}

export interface EventReviewAgentDecision {
  reviewId: string
  alertId: string
  sourceId: string
  sourceName: string
  zoneId: string
  zoneName: string
  eventType: MonitoringAlert['eventType']
  eventLabel: string
  reviewedAtLabel: string
  agentLabel: string
  riskLevel: EventReviewRiskLevel
  handlingDecision: ReviewHandlingDecision
  confidenceLabel: EventReviewConfidenceLabel
  evidenceQuality: EvidenceQuality
  missingEvidence: readonly string[]
  professionalRiskNote: string
  managerReviewChecklist: readonly string[]
  managerAttentionRequired: boolean
  finding: EventReviewAgentFinding
}

const severityToRisk: Record<MonitoringAlertSeverity, EventReviewRiskLevel> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

function getHandlingDecision(alert: MonitoringAlert, evidenceQuality: EvidenceQuality): ReviewHandlingDecision {
  if (evidenceQuality === 'weak') {
    return 'watch_required'
  }

  if (alert.managerAttentionRequired || alert.severity === 'critical' || alert.severity === 'high') {
    return 'handle_required'
  }

  if (alert.severity === 'medium') {
    return 'watch_required'
  }

  return 'no_action_required'
}

function getAverageConfidence(alert: MonitoringAlert) {
  if (alert.evidence.length === 0) {
    return 0
  }

  return alert.evidence.reduce((total, evidence) => total + evidence.confidence, 0) / alert.evidence.length
}

function getConfidenceLabel(alert: MonitoringAlert): EventReviewConfidenceLabel {
  const averageConfidence = getAverageConfidence(alert)

  if (averageConfidence >= 0.85) {
    return 'high_confidence'
  }

  if (averageConfidence >= 0.7) {
    return 'medium_confidence'
  }

  return 'low_confidence'
}

function getProfessionalRiskNote(alert: MonitoringAlert, evidenceQuality: EvidenceQuality) {
  const knowledge = getEventOperationsKnowledge(alert.eventType)

  if (evidenceQuality === 'weak') {
    return `${knowledge.professionalLabel}证据不足，建议项目经理先人工复核，不创建任务。`
  }

  if (alert.severity === 'critical' || alert.severity === 'high') {
    return `${knowledge.professionalLabel}已触发高优先级处置条件：${
      knowledge.riskEscalationRules[0] ?? '现场风险上升'
    }。`
  }

  return `${knowledge.professionalLabel}需要结合现场证据持续判断：${knowledge.riskSignals
    .slice(0, 2)
    .join('、')}。`
}

function buildWhatHappened(alert: MonitoringAlert) {
  const definition = getVenueEventDefinition(alert.eventType)

  return `${alert.zoneName}触发 ${alert.eventLabel}，${definition.description}`
}

function buildEvidenceSummary(alert: MonitoringAlert, evidenceQuality: EvidenceQuality) {
  const labels = alert.evidence.map((evidence) => evidence.label).join('、')

  return `${alert.sourceName} 提供 ${alert.evidence.length} 条证据：${labels}。证据质量：${getEvidenceQualityLabel(
    evidenceQuality,
  )}。`
}

export function reviewMonitoringAlert(alert: MonitoringAlert): EventReviewAgentDecision {
  const knowledge = getEventOperationsKnowledge(alert.eventType)
  const averageConfidence = getAverageConfidence(alert)
  const evidenceQuality = evaluateEvidenceQuality({
    evidenceCount: alert.evidence.length,
    averageConfidence,
    requiredEvidenceCount: Math.min(knowledge.evidenceRequirements.length, 3),
  })
  const missingEvidence = inferMissingEvidence(knowledge, alert.evidence.length)
  const riskLevel = severityToRisk[alert.severity]
  const confidenceLabel = getConfidenceLabel(alert)
  const handlingDecision = getHandlingDecision(alert, evidenceQuality)
  const professionalRiskNote = getProfessionalRiskNote(alert, evidenceQuality)

  const finding: EventReviewAgentFinding = {
    findingId: `finding-${alert.alertId}`,
    title: alert.title,
    whatHappened: buildWhatHappened(alert),
    evidenceSummary: buildEvidenceSummary(alert, evidenceQuality),
    riskLevel,
    handlingDecision,
    confidenceLabel,
    evidence: alert.evidence.map((evidence) => ({ ...evidence })),
  }

  return {
    reviewId: `review-${alert.alertId}`,
    alertId: alert.alertId,
    sourceId: alert.sourceId,
    sourceName: alert.sourceName,
    zoneId: alert.zoneId,
    zoneName: alert.zoneName,
    eventType: alert.eventType,
    eventLabel: alert.eventLabel,
    reviewedAtLabel: alert.timestampLabel,
    agentLabel: 'EventReviewAgent 演示',
    riskLevel,
    handlingDecision,
    confidenceLabel,
    evidenceQuality,
    missingEvidence,
    professionalRiskNote,
    managerReviewChecklist: knowledge.managerChecklist,
    managerAttentionRequired: alert.managerAttentionRequired,
    finding,
  }
}

export function listDemoEventReviews() {
  return listMonitoringAlerts().map(reviewMonitoringAlert)
}

export function getEventReviewByAlertId(alertId: string) {
  return listDemoEventReviews().find((review) => review.alertId === alertId) ?? null
}

export function getReviewRiskLabel(risk: EventReviewRiskLevel) {
  const labels: Record<EventReviewRiskLevel, string> = {
    critical: '告红风险',
    high: '高风险',
    medium: '中风险',
    low: '低风险',
  }

  return labels[risk]
}

export function getReviewDecisionSummary(review: EventReviewAgentDecision) {
  const handlingLabels: Record<ReviewHandlingDecision, string> = {
    handle_required: '需要处理',
    watch_required: '持续观察',
    no_action_required: '无需处理',
  }

  return `${getReviewRiskLabel(review.riskLevel)} / ${handlingLabels[review.handlingDecision]} / ${
    review.finding.evidence.length
  } 条证据`
}

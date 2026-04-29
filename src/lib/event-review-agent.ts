import {
  listMonitoringAlerts,
  type MonitoringAlert,
  type MonitoringAlertSeverity,
} from './monitoring-alerts'
import { getVenueEventDefinition } from './venue-event-types'

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
  managerAttentionRequired: boolean
  finding: EventReviewAgentFinding
}

const severityToRisk: Record<MonitoringAlertSeverity, EventReviewRiskLevel> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

function getHandlingDecision(alert: MonitoringAlert): ReviewHandlingDecision {
  if (alert.managerAttentionRequired || alert.severity === 'critical' || alert.severity === 'high') {
    return 'handle_required'
  }

  if (alert.severity === 'medium') {
    return 'watch_required'
  }

  return 'no_action_required'
}

function getConfidenceLabel(alert: MonitoringAlert): EventReviewConfidenceLabel {
  const averageConfidence =
    alert.evidence.reduce((total, evidence) => total + evidence.confidence, 0) / alert.evidence.length

  if (averageConfidence >= 0.85) {
    return 'high_confidence'
  }

  if (averageConfidence >= 0.7) {
    return 'medium_confidence'
  }

  return 'low_confidence'
}

function buildWhatHappened(alert: MonitoringAlert) {
  const definition = getVenueEventDefinition(alert.eventType)

  return `${alert.zoneName}触发了${alert.eventLabel}：${definition.description}`
}

function buildEvidenceSummary(alert: MonitoringAlert) {
  const labels = alert.evidence.map((evidence) => evidence.label).join(', ')

  return `${alert.sourceName}提供了 ${alert.evidence.length} 条证据：${labels}。`
}

export function reviewMonitoringAlert(alert: MonitoringAlert): EventReviewAgentDecision {
  const riskLevel = severityToRisk[alert.severity]
  const handlingDecision = getHandlingDecision(alert)
  const confidenceLabel = getConfidenceLabel(alert)

  const finding: EventReviewAgentFinding = {
    findingId: `finding-${alert.alertId}`,
    title: alert.title,
    whatHappened: buildWhatHappened(alert),
    evidenceSummary: buildEvidenceSummary(alert),
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

  return `${getReviewRiskLabel(review.riskLevel)} / ${handlingLabels[review.handlingDecision]} / ${review.finding.evidence.length} 条证据`
}

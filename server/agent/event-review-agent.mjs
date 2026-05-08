import {
  evaluateEvidenceQuality,
  getOperationsKnowledge,
  missingEvidenceFor,
} from './operations-knowledge.mjs'
import { guardEventReviewOutput } from '../schemas/guards.mjs'

const highRiskEvents = new Set(['high_risk_congestion', 'fire_lane_blocked', 'medical_incident', 'lost_child'])

function resolveRiskLevel(input, evidenceQuality) {
  if (input?.riskLevel) return input.riskLevel
  if (input?.eventType === 'false_positive') return 'low'
  if (highRiskEvents.has(input?.eventType)) return 'high'
  if (evidenceQuality === 'weak') return 'manual_review'
  return 'medium_high'
}

function resolveEvidence(input, knowledge) {
  if (Array.isArray(input.evidence)) return input.evidence
  return knowledge.evidenceRequirements.slice(0, 3)
}

function buildDecision(input, knowledge) {
  if (input.eventType === 'false_positive') {
    return 'Current signal is more likely a temporary fluctuation or false positive; observe only and do not create a task.'
  }

  if (input.title) {
    return `${input.title} requires field handling review.`
  }

  return `${knowledge.professionalLabel} requires manager review.`
}

export function reviewEvent(input = {}) {
  const knowledge = getOperationsKnowledge(input.eventType)
  const evidence = resolveEvidence(input, knowledge)
  const evidenceQuality = evaluateEvidenceQuality(evidence, Math.min(knowledge.evidenceRequirements.length, 3))
  const missingEvidence = missingEvidenceFor(input.eventType, evidence)
  const riskLevel = resolveRiskLevel(input, evidenceQuality)

  const output = {
    agent: 'EventReviewAgent',
    decision: buildDecision(input, knowledge),
    riskLevel,
    evidence,
    evidenceQuality,
    missingEvidence,
    professionalRiskNote:
      evidenceQuality === 'weak'
        ? `${knowledge.professionalLabel}: evidence is weak; manager should review before any task is created.`
        : `${knowledge.professionalLabel}: key signals include ${knowledge.riskSignals.slice(0, 2).join('; ')}.`,
    managerReviewChecklist: knowledge.managerChecklist,
    uncertainty:
      missingEvidence.length > 0
        ? `missing evidence: ${missingEvidence.join('; ')}`
        : 'demo data only; production multi-camera and backend verification are not connected',
    requiresManagerConfirmation: true,
    autoDispatch: false,
    executeDirectly: false,
    skipManagerConfirmation: false,
  }

  return guardEventReviewOutput(output)
}

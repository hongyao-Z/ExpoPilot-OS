import {
  evaluateEvidenceQuality,
  getOperationsKnowledge,
  missingEvidenceFor,
} from './operations-knowledge.mjs'
import { guardEventReviewOutput } from '../schemas/guards.mjs'

function resolveRiskLevel(input, evidenceQuality) {
  if (input?.riskLevel) return input.riskLevel
  if (input?.eventType === 'false_positive') return 'low'
  if (input?.eventType === 'high_risk_congestion') return 'high'
  if (input?.eventType === 'fire_lane_blocked') return 'high'
  if (evidenceQuality === 'weak') return 'manual_review'
  return 'medium_high'
}

function resolveEvidence(input, knowledge) {
  if (input.evidence?.length) return input.evidence
  return knowledge.evidenceRequirements.slice(0, 3)
}

export function reviewEvent(input = {}) {
  const knowledge = getOperationsKnowledge(input.eventType)
  const evidence = resolveEvidence(input, knowledge)
  const evidenceQuality = evaluateEvidenceQuality(evidence, Math.min(knowledge.evidenceRequirements.length, 3))
  const missingEvidence = missingEvidenceFor(input.eventType, evidence)
  const riskLevel = resolveRiskLevel(input, evidenceQuality)

  const output = {
    agent: 'EventReviewAgent',
    decision:
      input.eventType === 'false_positive'
        ? '当前更像短时聚集或误报，建议观察，不创建任务'
        : input.title
          ? `${input.title} 存在现场处置风险`
          : `${knowledge.professionalLabel} 需要项目经理复核`,
    riskLevel,
    evidence,
    evidenceQuality,
    missingEvidence,
    professionalRiskNote:
      evidenceQuality === 'weak'
        ? `${knowledge.professionalLabel} 证据不足，应先人工复核。`
        : `${knowledge.professionalLabel} 判断依据：${knowledge.riskSignals.slice(0, 2).join('、')}。`,
    managerReviewChecklist: knowledge.managerChecklist,
    uncertainty:
      missingEvidence.length > 0
        ? `仍缺少：${missingEvidence.join('、')}。`
        : '当前为 demo 数据，未接入生产级多路摄像头与真实后端。',
    requiresManagerConfirmation: true,
  }

  return guardEventReviewOutput(output)
}

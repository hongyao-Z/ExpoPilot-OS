import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { recommendDispatch } from '../agent/dispatch-agent.mjs'
import { reviewEvent } from '../agent/event-review-agent.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'eval-cases.json'), 'utf8'))

function hasAutoDispatch(output) {
  return output.autoDispatch === true || output.executeDirectly === true || output.skipManagerConfirmation === true
}

function evaluateCase(testCase) {
  const review = reviewEvent({ ...testCase.input, title: testCase.title })
  const dispatch = recommendDispatch({
    ...testCase.input,
    evidenceQuality: review.value.evidenceQuality,
  })
  const failures = []

  if (review.value.requiresManagerConfirmation !== true) {
    failures.push('EventReviewAgent did not require manager confirmation')
  }

  if (dispatch.value.requiresManagerConfirmation !== testCase.expectedRequiresManagerConfirmation) {
    failures.push('DispatchAgent manager confirmation requirement mismatch')
  }

  if (dispatch.value.createsTask !== false || dispatch.value.executionMode !== 'recommendation_only') {
    failures.push('DispatchAgent should stay recommendation_only and should not create tasks')
  }

  if (review.value.riskLevel !== testCase.expectedRiskLevel) {
    failures.push(`riskLevel expected ${testCase.expectedRiskLevel}, got ${review.value.riskLevel}`)
  }

  if (testCase.expectedEvidenceQuality && review.value.evidenceQuality !== testCase.expectedEvidenceQuality) {
    failures.push(`evidenceQuality expected ${testCase.expectedEvidenceQuality}, got ${review.value.evidenceQuality}`)
  }

  if (!Array.isArray(review.value.managerReviewChecklist) || review.value.managerReviewChecklist.length === 0) {
    failures.push('EventReviewAgent did not output managerReviewChecklist')
  }

  if (dispatch.value.recommendedAction !== testCase.expectedAction) {
    failures.push(`recommendedAction expected ${testCase.expectedAction}, got ${dispatch.value.recommendedAction}`)
  }

  if (testCase.expectedAssignee && dispatch.value.recommendedAssignee !== testCase.expectedAssignee) {
    failures.push(`recommendedAssignee expected ${testCase.expectedAssignee}, got ${dispatch.value.recommendedAssignee}`)
  }

  if (!dispatch.value.candidateScore || typeof dispatch.value.candidateScore.total !== 'number') {
    failures.push('DispatchAgent did not output candidateScore')
  }

  if (!Array.isArray(dispatch.value.dispatchChecklist) || dispatch.value.dispatchChecklist.length === 0) {
    failures.push('DispatchAgent did not output dispatchChecklist')
  }

  if (testCase.expectedFallback && dispatch.value.fallback !== testCase.expectedFallback) {
    failures.push(`fallback expected ${testCase.expectedFallback}, got ${dispatch.value.fallback}`)
  }

  if (!dispatch.value.fallbackAction) {
    failures.push('DispatchAgent did not output fallbackAction')
  }

  if (testCase.expectedDoNotDispatch && !dispatch.value.doNotDispatchReason) {
    failures.push('case expected doNotDispatchReason')
  }

  if (testCase.expectedMissingEvidence && review.value.missingEvidence.length === 0) {
    failures.push('case expected missing evidence')
  }

  if (review.value.riskLevel === 'high' && !dispatch.value.fallback) {
    failures.push('high risk case has no fallback')
  }

  if (hasAutoDispatch(review.value) || hasAutoDispatch(dispatch.value)) {
    failures.push('Agent output contains auto-dispatch behavior')
  }

  return {
    caseId: testCase.caseId,
    category: testCase.category ?? 'uncategorized',
    title: testCase.title,
    passed: failures.length === 0,
    failures,
  }
}

const results = cases.map(evaluateCase)
const failed = results.filter((result) => !result.passed)
const categorySummary = results.reduce((summary, result) => {
  const current = summary[result.category] ?? { passed: 0, total: 0 }
  return {
    ...summary,
    [result.category]: {
      passed: current.passed + (result.passed ? 1 : 0),
      total: current.total + 1,
    },
  }
}, {})

if (failed.length > 0) {
  console.error('eval-failed')
  console.error(JSON.stringify({ passed: results.length - failed.length, total: results.length, categories: categorySummary, failed }, null, 2))
  process.exit(1)
}

console.log('eval-ok')
console.log(JSON.stringify({ passed: results.length, total: results.length, categories: categorySummary }, null, 2))

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
  const dispatch = recommendDispatch(testCase.input)
  const failures = []

  if (review.value.requiresManagerConfirmation !== true) {
    failures.push('EventReviewAgent did not require manager confirmation')
  }

  if (dispatch.value.requiresManagerConfirmation !== testCase.expectedRequiresManagerConfirmation) {
    failures.push('DispatchAgent manager confirmation requirement mismatch')
  }

  if (review.value.riskLevel !== testCase.expectedRiskLevel) {
    failures.push(`riskLevel expected ${testCase.expectedRiskLevel}, got ${review.value.riskLevel}`)
  }

  if (dispatch.value.recommendedAction !== testCase.expectedAction) {
    failures.push(`recommendedAction expected ${testCase.expectedAction}, got ${dispatch.value.recommendedAction}`)
  }

  if (!dispatch.value.recommendedAction) {
    failures.push('DispatchAgent did not output recommendedAction')
  }

  if (testCase.expectedFallback && dispatch.value.fallback !== testCase.expectedFallback) {
    failures.push(`fallback expected ${testCase.expectedFallback}, got ${dispatch.value.fallback}`)
  }

  if (review.value.riskLevel === 'high' && !dispatch.value.fallback) {
    failures.push('high risk case has no fallback')
  }

  if (testCase.input.eventType === 'false_positive' && dispatch.value.recommendedAction !== '保持观察，不创建任务') {
    failures.push('false positive case should not create a direct dispatch recommendation')
  }

  if (hasAutoDispatch(review.value) || hasAutoDispatch(dispatch.value)) {
    failures.push('Agent output contains auto-dispatch behavior')
  }

  return {
    caseId: testCase.caseId,
    title: testCase.title,
    passed: failures.length === 0,
    failures,
  }
}

const results = cases.map(evaluateCase)
const failed = results.filter((result) => !result.passed)

if (failed.length > 0) {
  console.error('eval-failed')
  console.error(JSON.stringify({ passed: results.length - failed.length, total: results.length, failed }, null, 2))
  process.exit(1)
}

console.log('eval-ok')
console.log(JSON.stringify({ passed: results.length, total: results.length }, null, 2))

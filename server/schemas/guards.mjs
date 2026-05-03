import {
  dispatchRequiredFields,
  eventReviewRequiredFields,
  forbiddenAgentActionKeys,
  replaySummaryRequiredFields,
} from './agent-contracts.mjs'

function hasForbiddenAction(output) {
  return forbiddenAgentActionKeys.some((key) => output?.[key] === true)
}

function missingFields(output, requiredFields) {
  return requiredFields.filter((field) => output?.[field] === undefined || output?.[field] === null)
}

function sanitizeForbiddenActions(output) {
  const next = { ...output }
  for (const key of forbiddenAgentActionKeys) {
    if (key in next) next[key] = false
  }
  return next
}

export function guardEventReviewOutput(output) {
  const missing = missingFields(output, eventReviewRequiredFields)
  const forbidden = hasForbiddenAction(output)
  if (missing.length > 0 || forbidden) {
    return {
      ok: false,
      warnings: [...missing.map((field) => `missing:${field}`), ...(forbidden ? ['forbidden:auto_execute'] : [])],
      value: {
        agent: 'EventReviewAgent',
        decision: '需要人工复核入口 A 风险',
        riskLevel: 'medium_high',
        evidence: ['Agent 输出不完整，已降级为人工复核'],
        uncertainty: '当前为 demo 数据，未接入真实摄像头',
        requiresManagerConfirmation: true,
      },
    }
  }

  return {
    ok: true,
    warnings: [],
    value: sanitizeForbiddenActions({
      ...output,
      requiresManagerConfirmation: true,
    }),
  }
}

export function guardDispatchOutput(output) {
  const missing = missingFields(output, dispatchRequiredFields)
  const forbidden = hasForbiddenAction(output)
  if (missing.length > 0 || forbidden) {
    return {
      ok: false,
      warnings: [...missing.map((field) => `missing:${field}`), ...(forbidden ? ['forbidden:auto_execute'] : [])],
      value: {
        agent: 'DispatchAgent',
        recommendedAction: '进入人工调度复核',
        recommendedAssignee: '入口引导员',
        backupAssignee: '安保协同',
        reason: ['Agent 输出不完整，已降级为人工确认'],
        riskNote: '禁止绕过项目经理确认。',
        fallback: '由项目经理人工选择执行人员。',
        requiresManagerConfirmation: true,
      },
    }
  }

  return {
    ok: true,
    warnings: [],
    value: sanitizeForbiddenActions({
      ...output,
      requiresManagerConfirmation: true,
    }),
  }
}

export function guardReplaySummaryOutput(output) {
  const missing = missingFields(output, replaySummaryRequiredFields)
  if (missing.length > 0) {
    return {
      ok: false,
      warnings: missing.map((field) => `missing:${field}`),
      value: {
        whatHappened: '入口 A 出现人流拥堵异常。',
        whyDetected: '系统根据 demo 证据识别风险。',
        whatWasRecommended: '建议增派入口引导员。',
        whoConfirmed: '等待项目经理确认。',
        whoExecuted: '入口引导员。',
        result: '等待工作人员反馈。',
        playbookSuggestion: '归档为入口拥堵预案模板。',
      },
    }
  }

  return { ok: true, warnings: [], value: output }
}

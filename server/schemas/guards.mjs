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
        riskLevel: 'manual_review',
        evidence: ['Agent 输出不完整，已降级为人工复核'],
        evidenceQuality: 'weak',
        missingEvidence: ['完整证据列表', '现场复核结果'],
        professionalRiskNote: '证据不足时不得创建任务。',
        managerReviewChecklist: ['确认现场是否真实异常', '确认是否需要创建任务'],
        uncertainty: '当前为 demo 数据，未接入生产级多路摄像头。',
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
        recommendedAssignee: '项目经理人工复核',
        backupAssignee: '安保协同',
        reason: ['Agent 输出不完整，已降级为人工确认'],
        candidateScore: {
          roleMatch: 0,
          skillMatch: 0,
          zoneMatch: 0,
          loadFit: 0,
          backupReadiness: 0,
          supervisorEscalationFit: 0,
          total: 0,
        },
        dispatchChecklist: ['项目经理确认后才允许创建任务'],
        riskNote: '禁止绕过项目经理确认。',
        fallback: '由项目经理人工选择执行人员。',
        fallbackAction: '由项目经理人工选择执行人员。',
        doNotDispatchReason: 'Agent 输出不完整，不允许自动派发。',
        requiresManagerConfirmation: true,
        createsTask: false,
        executionMode: 'recommendation_only',
      },
    }
  }

  return {
    ok: true,
    warnings: [],
    value: sanitizeForbiddenActions({
      ...output,
      requiresManagerConfirmation: true,
      createsTask: false,
      executionMode: 'recommendation_only',
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

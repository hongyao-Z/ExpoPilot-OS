export function buildRiskGuardSummary({ review, dispatch }) {
  return {
    requiresManagerConfirmation: true,
    blocksAutoDispatch: true,
    riskLevel: review?.riskLevel ?? 'medium_high',
    fallback: dispatch?.fallback ?? '进入项目经理人工确认。',
    note: 'Agent 只生成结构化建议；任务派发必须经过项目经理确认。',
  }
}

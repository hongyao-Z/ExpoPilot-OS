import type { LlmDecisionOutput, LlmExplanationOutput, LlmFailure } from './agent-llm-types'

const VALID_STATES = ['observing', 'recommending', 'dispatched', 'waiting_feedback', 'reviewing']

function clampConfidence(value: unknown): number {
  const num = Number(value)
  if (Number.isNaN(num)) return 0.7
  return Math.max(0, Math.min(1, num))
}

function pickState(value: unknown): string {
  if (typeof value === 'string' && VALID_STATES.includes(value)) return value
  return 'recommending'
}

function str(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return fallback
}

function extractJsonCandidates(rawText: string): string[] {
  const candidates: string[] = []

  const fenced = rawText.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)
  for (const match of fenced) {
    if (match[1]?.trim()) candidates.push(match[1].trim())
  }

  const bareObjects = rawText.match(/\{[\s\S]*?\}/g)
  if (bareObjects) {
    for (const candidate of bareObjects) {
      if (!candidates.includes(candidate)) candidates.push(candidate)
    }
  }

  return candidates
}

function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseDecisionResponse(rawText: string): LlmDecisionOutput | LlmFailure {
  if (!rawText?.trim()) {
    return { ok: false, reason: 'invalid_payload', detail: '空响应文本' }
  }

  const candidates = extractJsonCandidates(rawText)

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (!isValidObject(parsed)) continue

      const state = pickState(parsed.state ?? parsed.lifecycleState)
      const actionLabel = str(parsed.actionLabel ?? parsed.action_label, '等待生成建议')
      const assigneeLabel = str(parsed.assigneeLabel ?? parsed.assignee_label, '等待推荐执行人')
      const whyEvent = str(parsed.whyEvent ?? parsed.why_event, '正在分析事件触发条件。')
      const whyAction = str(parsed.whyAction ?? parsed.why_action, '根据事件类型和现场状况推荐此动作。')
      const whyAssignee = str(parsed.whyAssignee ?? parsed.why_assignee, '基于执行人技能、负载和所在区域匹配。')
      const whyState = str(parsed.whyState ?? parsed.why_state, '根据事件和任务的当前进展判断。')
      const confidence = clampConfidence(parsed.confidence ?? 0.7)
      const requiresApproval = Boolean(parsed.requiresApproval ?? parsed.requires_approval ?? true)

      return { state, actionLabel, assigneeLabel, whyEvent, whyAction, whyAssignee, whyState, confidence, requiresApproval }
    } catch {
      // try next candidate
    }
  }

  return extractDecisionViaRegex(rawText)
}

export function parseExplanationResponse(rawText: string): LlmExplanationOutput | LlmFailure {
  if (!rawText?.trim()) {
    return { ok: false, reason: 'invalid_payload', detail: '空响应文本' }
  }

  const candidates = extractJsonCandidates(rawText)

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (!isValidObject(parsed)) continue

      return {
        why_event: str(parsed.why_event, '事件分析中。'),
        why_action: str(parsed.why_action, '动作推荐分析中。'),
        why_assignee: str(parsed.why_assignee, '执行人匹配分析中。'),
        why_state: str(parsed.why_state, '状态判断分析中。'),
      }
    } catch {
      // try next candidate
    }
  }

  return extractExplanationViaRegex(rawText)
}

function extractDecisionViaRegex(rawText: string): LlmDecisionOutput | LlmFailure {
  const state = pickState(matchRegex(rawText, /state["\s:]+(\w+)/i) ?? 'recommending')
  const actionLabel = matchRegex(rawText, /action_?label["\s:]+([^"]+)/i) ?? '等待生成建议'
  const assigneeLabel = matchRegex(rawText, /assignee_?label["\s:]+([^"]+)/i) ?? '等待推荐执行人'
  const whyEvent = matchRegex(rawText, /why_?event["\s:]+([^"]+)/i) ?? '正在分析事件触发条件。'
  const whyAction = matchRegex(rawText, /why_?action["\s:]+([^"]+)/i) ?? '根据事件类型和现场状况推荐此动作。'
  const whyAssignee = matchRegex(rawText, /why_?assignee["\s:]+([^"]+)/i) ?? '基于执行人技能、负载和所在区域匹配。'
  const whyState = matchRegex(rawText, /why_?state["\s:]+([^"]+)/i) ?? '根据事件和任务的当前进展判断。'
  const confidence = clampConfidence(matchRegex(rawText, /confidence["\s:]+([\d.]+)/i) ?? 0.7)
  const requiresApproval = /requires_?approval["\s:]+true/i.test(rawText)

  return { state, actionLabel, assigneeLabel, whyEvent, whyAction, whyAssignee, whyState, confidence, requiresApproval }
}

function extractExplanationViaRegex(rawText: string): LlmExplanationOutput | LlmFailure {
  return {
    why_event: matchRegex(rawText, /why_?event["\s:]+([^"]+)/i) ?? '事件分析中。',
    why_action: matchRegex(rawText, /why_?action["\s:]+([^"]+)/i) ?? '动作分析中。',
    why_assignee: matchRegex(rawText, /why_?assignee["\s:]+([^"]+)/i) ?? '执行人分析中。',
    why_state: matchRegex(rawText, /why_?state["\s:]+([^"]+)/i) ?? '状态分析中。',
  }
}

function matchRegex(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern)
  return match?.[1]?.trim() ?? null
}

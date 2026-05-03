import type { LlmChatMessage } from './agent-llm-types'

export interface LlmDecisionPromptContext {
  projectTitle: string
  projectStatus: string
  mode: string
  priorityLabel: string
  focusZoneLabel: string
  event?: {
    eventType: string
    title: string
    summary: string
    severity: string
    status: string
    sourceLabel: string
    recommendedAction: string
    recommendedAssignee: string
    triggerPoints: string[]
    zoneName: string
  }
  zones: { name: string; zoneType: string; heat: number; density: number }[]
  staff: { name: string; title: string; zoneName: string; shiftStatus: string; skills: string[] }[]
  tasks: { taskType: string; status: string; assigneeName: string; actionSummary: string }[]
  decisionSought: string
}

export interface LlmExplanationPromptContext {
  projectTitle: string
  eventType: string
  eventTitle: string
  eventSummary: string
  severity: string
  sourceLabel: string
  triggerPoints: string[]
  zoneName: string
  recommendedAction: string
  assigneeLabel: string
  taskType: string
  taskStatus: string
  lifecycleState: string
  mode: string
}

const DECISION_SYSTEM = `你是 ExpoPilot OS 的现场运营决策 Agent（场脉系统）。

你的职责：根据实时会展现场事件数据，输出结构化的处置决策。

你必须：
1. 分析事件的严重程度、触发条件、区域状况
2. 推荐一个具体的处置动作（actionLabel），如"补位"、"支援接待"、"导流"、"待命"
3. 推荐最合适的执行人员（assigneeLabel），基于其技能、当前负载、所在区域
4. 评估当前的生命周期状态（state）：observing | recommending | dispatched | waiting_feedback | reviewing
5. 给出决策置信度（confidence：0.0-1.0）
6. 判断是否需要人工批准（requiresApproval：true/false）
7. 用中文解释每个维度（whyEvent、whyAction、whyAssignee、whyState）

输出必须是严格的 JSON 对象，字段齐全。不要输出任何 JSON 之外的文字。`

const EXPLANATION_SYSTEM = `你是 ExpoPilot OS 的解释 Agent（场脉系统）。

你的职责：对已经做出的运营决策，用简洁专业的中文解释"为什么"。

你必须解释以下四个维度：
- why_event：为什么这个事件需要处理
- why_action：为什么选择了这个处置动作
- why_assignee：为什么派给了这个执行人
- why_state：为什么当前处于这个生命周期状态

每个解释 1-3 句，直接、专业、不含糊。不要输出 JSON 之外的文字。`

export function buildDecisionPrompt(ctx: LlmDecisionPromptContext): LlmChatMessage[] {
  const contextJson = JSON.stringify(
    {
      context: {
        project: { title: ctx.projectTitle, status: ctx.projectStatus },
        mode: ctx.mode,
        priority: ctx.priorityLabel,
        focusZone: ctx.focusZoneLabel,
      },
      event: ctx.event ?? null,
      zones: ctx.zones,
      staff: ctx.staff,
      tasks: ctx.tasks,
      decisionSought: ctx.decisionSought,
    },
    null,
    0,
  )

  return [
    { role: 'system', content: DECISION_SYSTEM },
    {
      role: 'user',
      content: `请根据以下现场数据输出 Agent 决策 JSON。\n\n字段说明：\n- state: 生命周期状态，枚举值 observing | recommending | dispatched | waiting_feedback | reviewing\n- actionLabel: 推荐处置动作，如"补位"、"支援接待"、"导流"、"待命"\n- assigneeLabel: 推荐执行人姓名\n- confidence: 置信度 0.0-1.0\n- requiresApproval: 是否需要人工批准\n- whyEvent: 事件原因解释\n- whyAction: 动作推荐原因\n- whyAssignee: 执行人推荐原因\n- whyState: 状态判断原因\n\n现场数据：\n${contextJson}`,
    },
  ]
}

export function buildExplanationPrompt(ctx: LlmExplanationPromptContext): LlmChatMessage[] {
  const contextJson = JSON.stringify(
    {
      project: ctx.projectTitle,
      event: {
        type: ctx.eventType,
        title: ctx.eventTitle,
        summary: ctx.eventSummary,
        severity: ctx.severity,
        source: ctx.sourceLabel,
        triggers: ctx.triggerPoints,
        zone: ctx.zoneName,
      },
      decision: {
        action: ctx.recommendedAction,
        assignee: ctx.assigneeLabel,
        taskType: ctx.taskType,
        taskStatus: ctx.taskStatus,
        state: ctx.lifecycleState,
        mode: ctx.mode,
      },
    },
    null,
    0,
  )

  return [
    { role: 'system', content: EXPLANATION_SYSTEM },
    {
      role: 'user',
      content: `请根据以下事件和决策数据输出解释 JSON。\n\n字段：why_event、why_action、why_assignee、why_state，均为中文字符串。\n\n数据：\n${contextJson}`,
    },
  ]
}

export function estimateTokenCount(messages: LlmChatMessage[]): number {
  let total = 0
  for (const msg of messages) {
    total += msg.content.length
  }
  return Math.ceil(total / 3.5)
}

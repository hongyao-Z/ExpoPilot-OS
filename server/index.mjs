import http from 'node:http'
import { pathToFileURL, URL } from 'node:url'
import { recommendDispatch } from './agent/dispatch-agent.mjs'
import { reviewEvent } from './agent/event-review-agent.mjs'
import { buildRiskGuardSummary } from './agent/risk-guard.mjs'
import { summarizeReplay } from './agent/replay-summary-agent.mjs'
import { appendAuditLog, loadState, resetState, transitionTask } from './state/demo-db.mjs'

const port = Number(process.env.EXPOPILOT_API_PORT ?? 8787)

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload, null, 2))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = ''
    request.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large'))
        request.destroy()
      }
    })
    request.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    request.on('error', reject)
  })
}

function writeAgentAudit(agentName, action, source, summary, output, warnings = []) {
  const state = loadState()
  appendAuditLog({
    actor: agentName,
    action,
    source,
    summary,
    relatedEventId: state.event.eventId,
    relatedTaskId: state.task.taskId,
    metadata: {
      output,
      warnings,
      requiresManagerConfirmation: output.requiresManagerConfirmation === true,
    },
  })

  if (warnings.length > 0) {
    appendAuditLog({
      actor: 'risk_guard',
      action: 'guard_rejected_agent_output',
      source: 'runtime_guard',
      summary: `Guard 发现 ${agentName} 输出异常并启用 fallback。`,
      relatedEventId: state.event.eventId,
      relatedTaskId: state.task.taskId,
      metadata: { warnings },
    })
  }
}

function buildReplayPayload() {
  const state = loadState()
  const replay = summarizeReplay(state).value

  return {
    event: state.event,
    task: state.task,
    auditLogs: state.auditLogs,
    replaySummary: replay,
    evidenceChain: state.event.evidence,
    decisionChain: [
      'EventReviewAgent 给出异常审核与证据解释',
      'DispatchAgent 给出处置建议和人员推荐',
      state.task.dispatchConfirmed ? '项目经理已确认派发' : '等待项目经理确认派发',
    ],
    executionChain: state.task.history,
    responsibilityChain: [
      '系统识别异常',
      'Agent 生成建议',
      '项目经理确认派发',
      '工作人员执行并反馈',
    ],
    playbookSuggestion: replay.playbookSuggestion,
  }
}

function confirmDispatch() {
  return transitionTask(
    'dispatched',
    '项目经理已确认派发入口引导员',
    '项目经理',
    {
      actor: 'project_manager',
      action: 'confirm_dispatch',
      source: 'human_confirmation',
      summary: '项目经理确认派发入口引导员。',
    },
    { dispatchConfirmed: true },
  )
}

function acceptTask() {
  return transitionTask('accepted', '工作人员已接收任务', '入口引导员', {
    actor: 'worker',
    action: 'accept_task',
    source: 'mobile_task_terminal',
    summary: '工作人员确认接收入口 A 分流任务。',
  })
}

function markEnRoute() {
  return transitionTask('en_route', '工作人员已到达入口 A 分流点', '入口引导员', {
    actor: 'worker',
    action: 'mark_en_route',
    source: 'mobile_task_terminal',
    summary: '工作人员前往入口 A 分流点。',
  })
}

function startTask() {
  return transitionTask('in_progress', '工作人员开始现场分流', '入口引导员', {
    actor: 'worker',
    action: 'start_task',
    source: 'mobile_task_terminal',
    summary: '工作人员开始入口 A 现场分流。',
  })
}

function submitFeedback(body) {
  const feedbackText =
    typeof body.feedbackText === 'string' && body.feedbackText.trim()
      ? body.feedbackText.trim().slice(0, 500)
      : '现场已完成分流，排队长度下降，需要继续观察 5 分钟。'

  return transitionTask(
    'feedback_submitted',
    '工作人员已提交完成反馈',
    '入口引导员',
    {
      actor: 'worker',
      action: 'submit_feedback',
      source: 'mobile_task_terminal',
      summary: '工作人员提交入口 A 现场处理反馈。',
      metadata: { feedbackText },
    },
    { lastFeedbackText: feedbackText },
  )
}

async function handleRequest(request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, service: 'expopilot-agent-service', mode: 'local-demo' })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/events/current') {
    sendJson(response, 200, loadState().event)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/tasks/current') {
    sendJson(response, 200, loadState().task)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/replay/current') {
    sendJson(response, 200, buildReplayPayload())
    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 404, { ok: false, error: 'Not found' })
    return
  }

  const body = await readBody(request)

  if (url.pathname === '/api/tasks/confirm-dispatch') {
    sendJson(response, 200, confirmDispatch())
    return
  }

  if (url.pathname === '/api/tasks/accept') {
    sendJson(response, 200, acceptTask())
    return
  }

  if (url.pathname === '/api/tasks/en-route') {
    sendJson(response, 200, markEnRoute())
    return
  }

  if (url.pathname === '/api/tasks/start') {
    sendJson(response, 200, startTask())
    return
  }

  if (url.pathname === '/api/tasks/feedback') {
    sendJson(response, 200, submitFeedback(body))
    return
  }

  if (url.pathname === '/api/demo/reset') {
    sendJson(response, 200, resetState())
    return
  }

  if (url.pathname === '/api/agent/review-event') {
    const result = reviewEvent({ ...loadState().event, ...body })
    writeAgentAudit('EventReviewAgent', 'review_event', 'agent_recommendation', result.value.decision, result.value, result.warnings)
    sendJson(response, result.ok ? 200 : 206, result.value)
    return
  }

  if (url.pathname === '/api/agent/recommend-dispatch') {
    const state = loadState()
    const result = recommendDispatch({ ...body, riskLevel: state.event.riskLevel, taskStatus: state.task.taskStatus })
    writeAgentAudit('DispatchAgent', 'recommend_dispatch', 'agent_recommendation', result.value.recommendedAction, result.value, result.warnings)
    sendJson(response, result.ok ? 200 : 206, result.value)
    return
  }

  if (url.pathname === '/api/agent/summarize-replay') {
    const state = loadState()
    const result = summarizeReplay(state)
    sendJson(response, result.ok ? 200 : 206, result.value)
    return
  }

  if (url.pathname === '/api/agent/risk-guard') {
    sendJson(response, 200, buildRiskGuardSummary(body))
    return
  }

  sendJson(response, 404, { ok: false, error: 'Not found' })
}

export const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    sendJson(response, 500, { ok: false, error: error.message })
  })
})

export function startServer() {
  return server.listen(port, () => {
    process.stdout.write(`expopilot-agent-service listening on http://localhost:${port}\n`)
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer()
}

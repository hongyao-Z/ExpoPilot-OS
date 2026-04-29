#!/usr/bin/env node
import {
  buildSimulatedSignal,
  buildTaskFromEvent,
  createManualEvent,
  explainEvent,
  getProjectBootstrap,
  getReplayReport,
  loadSnapshot,
  saveStrategyFromEvent,
} from './runtime-engine.mjs'

function readArg(flag, fallback = '') {
  const index = process.argv.indexOf(flag)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

function printDeprecatedAlias() {
  console.error('[deprecated] `seed-demo` 即将移除，请改用 `seed-project`。')
}

async function main() {
  const command = process.argv[2]
  const snapshot = await loadSnapshot()

  switch (command) {
    case 'seed-project':
    case 'bootstrap': {
      const projectId = readArg('--project')
      console.log(JSON.stringify(getProjectBootstrap(snapshot, projectId), null, 2))
      break
    }
    case 'seed-demo': {
      printDeprecatedAlias()
      const projectId = readArg('--project')
      console.log(JSON.stringify(getProjectBootstrap(snapshot, projectId), null, 2))
      break
    }
    case 'simulate-signals': {
      const projectId = readArg('--project', 'project-spring-2026')
      console.log(JSON.stringify(buildSimulatedSignal(snapshot, projectId), null, 2))
      break
    }
    case 'create-event': {
      const projectId = readArg('--project', 'project-spring-2026')
      const zoneId = readArg('--zone', 'zone-booth-a')
      const summary = readArg('--summary', '人工补录事件')
      console.log(JSON.stringify(createManualEvent(snapshot, projectId, zoneId, summary), null, 2))
      break
    }
    case 'dispatch-task': {
      const eventId = readArg('--event')
      const assigneeId = readArg('--assignee')
      console.log(JSON.stringify(buildTaskFromEvent(snapshot, eventId, assigneeId), null, 2))
      break
    }
    case 'explain': {
      const eventId = readArg('--event')
      console.log(JSON.stringify(explainEvent(snapshot, eventId), null, 2))
      break
    }
    case 'replay-report': {
      const projectId = readArg('--project', 'project-spring-2026')
      console.log(JSON.stringify(getReplayReport(snapshot, projectId), null, 2))
      break
    }
    case 'save-strategy': {
      const eventId = readArg('--event')
      console.log(JSON.stringify(saveStrategyFromEvent(snapshot, eventId), null, 2))
      break
    }
    default: {
      console.error(
        'Usage: expopilot.mjs <seed-project|bootstrap|simulate-signals|create-event|dispatch-task|explain|replay-report|save-strategy> [--project id] [--event id] [--zone id] [--summary text] [--assignee id]',
      )
      process.exitCode = 1
    }
  }
}

void main()

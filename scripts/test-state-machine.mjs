import assert from 'node:assert/strict'
import { buildTaskFromEvent, loadSnapshot } from './runtime-engine.mjs'

const snapshot = await loadSnapshot()
const task = buildTaskFromEvent(snapshot, 'evt-001', 'staff-01')

assert.equal(task.status, 'created')
assert.equal(task.event_id, 'evt-001')
assert.equal(task.assignee_id, 'staff-01')
assert.equal(task.task_type, '补位')
assert.ok(task.priority === 'high' || task.priority === 'critical' || task.priority === 'medium')

console.log('state-machine-ok')

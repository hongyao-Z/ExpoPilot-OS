import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

import { buildSimulatedSignal, createManualEvent, explainEvent, getReplayReport, loadSnapshot, saveStrategyFromEvent } from './runtime-engine.mjs'

const root = path.resolve(import.meta.dirname, '..')
const srcBootstrap = await fs.readFile(path.join(root, 'src', 'domain', 'bootstrap.json'), 'utf8')
const publicBootstrap = await fs.readFile(path.join(root, 'public', 'data', 'bootstrap.json'), 'utf8')
assert.equal(srcBootstrap, publicBootstrap)

const snapshot = await loadSnapshot()
const signal = buildSimulatedSignal(snapshot, 'project-spring-2026')
const manual = createManualEvent(snapshot, 'project-spring-2026', 'zone-booth-a', '人工补录验证')
const explain = explainEvent(snapshot, 'evt-001')
const report = getReplayReport(snapshot, 'project-spring-2026')
const strategy = saveStrategyFromEvent(snapshot, 'evt-001')

assert.ok(signal.signal_id)
assert.equal(signal.project_id, 'project-spring-2026')
assert.equal(manual.event.project_id, 'project-spring-2026')
assert.ok(Array.isArray(explain.trigger_points))
assert.ok(explain.human_takeover_allowed)
assert.ok(report.metrics.dispatch_success_rate >= 0)
assert.ok(strategy.name.includes('策略'))

console.log('contract-ok')

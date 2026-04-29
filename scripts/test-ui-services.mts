import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  confirmEventAction,
  createManualEventAction,
  createProjectAction,
  dispatchEventAction,
  saveStrategyAction,
  updateSettingsAction,
  updateTaskStatusAction,
} from '../src/services/action-service.ts'
import { localAgentGateway } from '../src/services/agent-gateway.ts'
import { localAuthGateway } from '../src/services/auth-gateway.ts'
import { localNotificationGateway } from '../src/services/notification-gateway.ts'
import {
  selectEventOperationalItems,
  selectLiveMetrics,
  selectProjectScope,
  selectProjectSummaries,
  selectRuntimeOperationalSummary,
  selectStaffStatuses,
  selectTaskOperationalItems,
  selectZoneOperationalStatuses,
} from '../src/selectors/dashboard-selectors.ts'

const raw = await readFile(new URL('../src/domain/bootstrap.json', import.meta.url), 'utf8')
const snapshot = JSON.parse(raw)
const organizerSession = localAuthGateway.signIn({
  email: 'pilot@expopilot.cn',
  password: 'ExpoPilot2026',
  role: 'organizer',
  displayName: '项目经理',
  organization_label: '春季消费展项目组',
  orgId: 'org-main',
})
const brandSession = localAuthGateway.signIn({
  email: 'brand@expopilot.cn',
  password: 'ExpoPilot2026',
  role: 'brand',
  displayName: '展台接待 1',
  organization_label: '品牌合作方',
  orgId: 'org-brand',
})

const projects = selectProjectSummaries(snapshot, organizerSession)
assert.ok(projects.length >= 1)
assert.equal(projects[0].project_id, 'project-spring-2026')

const zones = selectZoneOperationalStatuses(snapshot, 'project-spring-2026', null)
assert.ok(zones.some((zone) => zone.zone_id === 'zone-booth-a'))

const metrics = selectLiveMetrics(snapshot, 'project-spring-2026', null)
assert.equal(metrics.hottest_zone_name, '入口区')

const people = selectStaffStatuses(snapshot, 'project-spring-2026', null)
assert.ok(people.some((person) => person.staff_id === 'staff-01'))

const runtime = selectRuntimeOperationalSummary(snapshot, 'project-spring-2026', null, {
  origin: 'bootstrap',
  service_mode: 'local-sandbox',
  source_label: '基础启动快照',
  schema_version: 'expopilot-os-v15',
  loaded_at: new Date().toISOString(),
  last_synced_at: new Date().toISOString(),
})
assert.ok(runtime.source_mode === 'mixed' || runtime.source_mode === 'manual' || runtime.source_mode === 'realtime')

const brandScope = selectProjectScope(snapshot, 'project-spring-2026', brandSession)
assert.ok(brandScope.zones.every((zone) => zone.zone_type === 'booth'))
assert.ok(
  brandScope.auditLogs.every(
    (log) =>
      brandScope.events.some((event) => event.event_id === log.target_id) ||
      brandScope.tasks.some((task) => task.task_id === log.target_id) ||
      brandScope.strategies.some((strategy) => strategy.strategy_id === log.target_id),
  ),
)

const eventItems = selectEventOperationalItems(snapshot, 'project-spring-2026', brandSession)
assert.ok(eventItems.every((item) => item.event.zone_id.startsWith('zone-booth')))

const formData = new FormData()
formData.set('title', '试点加场')
formData.set('venue', '临港会展中心')
formData.set('city', '上海')
formData.set('theme', '现场运营压测')
const createdProject = createProjectAction(snapshot, 'organizer', '沈策', formData)
assert.ok(createdProject.snapshot.projects.some((project) => project.title === '试点加场'))

const manualEventForm = new FormData()
manualEventForm.set('zone_id', 'zone-booth-a')
manualEventForm.set('severity', 'high')
manualEventForm.set('source_label', '现场主管补录')
manualEventForm.set('intake_reason', '摄像头回退中')
manualEventForm.set('summary', '人工补录测试事件')
const manualEvent = createManualEventAction(snapshot, '执行负责人', 'project-spring-2026', localAgentGateway, manualEventForm)
assert.ok(manualEvent.snapshot.events.some((event) => event.summary === '人工补录测试事件'))
assert.ok(manualEvent.snapshot.signals[0].raw_rules.some((rule: string) => rule.includes('manual_reason')))

const confirmed = confirmEventAction(snapshot, '项目经理', 'evt-001')
assert.equal(confirmed.snapshot.events.find((event) => event.event_id === 'evt-001')?.status, 'confirmed')

const dispatched = dispatchEventAction(snapshot, '项目经理', 'evt-001', localAgentGateway, localNotificationGateway, 'staff-01')
const dispatchedTask = dispatched.snapshot.tasks.find((task) => task.event_id === 'evt-001' && task.assignee_id === 'staff-01')
assert.ok(dispatchedTask)
assert.ok(dispatchedTask?.notification_receipts?.length)
assert.equal(dispatchedTask?.status, 'created')
assert.equal(dispatchedTask?.task_type, '补位')

const processing = updateTaskStatusAction(dispatched.snapshot, '执行人员 1', dispatched.snapshot.tasks[0].task_id, 'processing', localNotificationGateway)
const completed = updateTaskStatusAction(processing.snapshot, '执行人员 1', processing.snapshot.tasks[0].task_id, 'completed', localNotificationGateway)
const scopedTasks = selectTaskOperationalItems(completed.snapshot, 'project-spring-2026', null)
const updatedTask = scopedTasks.find((item) => item.task.task_id === processing.snapshot.tasks[0].task_id)
assert.equal(updatedTask?.task.status, 'completed')
assert.ok((updatedTask?.notification_summary?.length ?? 0) > 0)

const strategySaved = saveStrategyAction(snapshot, '执行负责人', 'evt-001', localAgentGateway)
assert.ok(strategySaved.snapshot.strategies.some((strategy) => strategy.name.includes('策略')))

const settingsResult = updateSettingsAction(snapshot, '项目经理')
assert.equal(settingsResult.feedback?.scope, 'settings')
assert.equal(localAgentGateway.descriptor.provider, 'local-mock')
assert.equal(localAuthGateway.descriptor.provider, 'local-auth-mock')
assert.equal(localNotificationGateway.descriptor.provider, 'local-notify-mock')

console.log('ui-services-ok')

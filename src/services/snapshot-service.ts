import { DATA_KEY } from '../app-config.ts'
import { embeddedSnapshot } from '../domain/embedded-snapshot.ts'
import type { ExpoPilotSnapshot, SnapshotLoadState, SnapshotSourceMetadata, SnapshotSourceOrigin } from '../domain/types'
import { loadJson, saveJson } from '../lib/storage.ts'

const SCHEMA_VERSION = 'expopilot-os-v15'
const DEMO_PROJECT_ID = 'project-spring-2026'
const DEMO_ZONE_BLUEPRINTS = [
  {
    zone_id: 'zone-entry',
    name: '入口区',
    zone_type: 'entry',
    heat: 88,
    density: 79,
    queue_minutes: 11,
    threshold: 70,
    staffing_target: 2,
    recommended_action: '安排执行人员 1 前往入口区补位，并协助疏导入口排队。',
    notes: '当前固定演示主场景。',
  },
  {
    zone_id: 'zone-main-corridor',
    name: '主通道区',
    zone_type: 'stage',
    heat: 52,
    density: 43,
    queue_minutes: 0,
    threshold: 65,
    staffing_target: 1,
    recommended_action: '观察主通道区密度变化，必要时执行导流。',
    notes: '用于后续 zone_imbalance 场景预留。',
  },
  {
    zone_id: 'zone-booth-a',
    name: '展台 A',
    zone_type: 'booth',
    heat: 47,
    density: 39,
    queue_minutes: 0,
    threshold: 75,
    staffing_target: 1,
    recommended_action: '安排展台接待 1 稳定接待节奏。',
    notes: '用于后续 booth_heatup 场景预留。',
  },
  {
    zone_id: 'zone-booth-b',
    name: '展台 B',
    zone_type: 'booth',
    heat: 34,
    density: 28,
    queue_minutes: 0,
    threshold: 75,
    staffing_target: 1,
    recommended_action: '保持待命，等待现场调度。',
    notes: '用于后续 zone_imbalance 场景预留。',
  },
] as const

function serviceModeForOrigin(origin: SnapshotSourceOrigin) {
  if (origin === 'server-proxy') return 'proxy-ready' as const
  if (origin === 'connector') return 'hybrid' as const
  return 'local-sandbox' as const
}

function sourceLabelForOrigin(origin: SnapshotSourceOrigin) {
  switch (origin) {
    case 'bootstrap':
      return '鍩虹鍚姩蹇収'
    case 'persisted':
      return '鏈湴鎸佷箙鍖栧揩鐓?'
    case 'connector':
      return '杩炴帴鍣ㄥ悓姝ュ揩鐓?'
    case 'server-proxy':
      return '鏈嶅姟浠ｇ悊蹇収'
    default:
      return '鍐呭祵鍏滃簳蹇収'
  }
}

function inferDemoZoneId(label: string | undefined) {
  if (!label) return undefined
  if (label.includes('入口')) return 'zone-entry'
  if (label.includes('主通道')) return 'zone-main-corridor'
  if (label.includes('展台 A')) return 'zone-booth-a'
  if (label.includes('展台 B')) return 'zone-booth-b'
  return undefined
}

function normalizeDemoSnapshot(snapshot: ExpoPilotSnapshot): ExpoPilotSnapshot {
  if (!snapshot.projects.some((project) => project.project_id === DEMO_PROJECT_ID)) return snapshot

  const currentDemoZones = snapshot.zones.filter((zone) => zone.project_id === DEMO_PROJECT_ID)
  const zoneById = new Map(currentDemoZones.map((zone) => [zone.zone_id, zone]))
  const zoneByName = new Map(currentDemoZones.map((zone) => [zone.name, zone]))
  const zoneIdRemap = new Map<string, string>()

  const normalizedZones = DEMO_ZONE_BLUEPRINTS.map((blueprint) => {
    const existing = zoneById.get(blueprint.zone_id) ?? zoneByName.get(blueprint.name)
    if (existing && existing.zone_id !== blueprint.zone_id) {
      zoneIdRemap.set(existing.zone_id, blueprint.zone_id)
    }

    return {
      zone_id: blueprint.zone_id,
      project_id: DEMO_PROJECT_ID,
      name: blueprint.name,
      zone_type: blueprint.zone_type,
      heat: existing?.heat ?? blueprint.heat,
      density: existing?.density ?? blueprint.density,
      queue_minutes: existing?.queue_minutes ?? blueprint.queue_minutes,
      threshold: existing?.threshold ?? blueprint.threshold,
      staffing_target: existing?.staffing_target ?? blueprint.staffing_target,
      recommended_action: existing?.recommended_action ?? blueprint.recommended_action,
      notes: existing?.notes ?? blueprint.notes,
    }
  })

  const validZoneIds = new Set<string>(normalizedZones.map((zone) => zone.zone_id))
  const normalizedSignals = snapshot.signals
    .filter((signal) => signal.project_id !== DEMO_PROJECT_ID || validZoneIds.has(zoneIdRemap.get(signal.zone_id) ?? signal.zone_id))
    .map((signal) =>
      signal.project_id !== DEMO_PROJECT_ID ? signal : { ...signal, zone_id: zoneIdRemap.get(signal.zone_id) ?? signal.zone_id },
    )

  const normalizedEvents = snapshot.events
    .filter((event) => event.project_id !== DEMO_PROJECT_ID || validZoneIds.has(zoneIdRemap.get(event.zone_id) ?? event.zone_id))
    .map((event) =>
      event.project_id !== DEMO_PROJECT_ID ? event : { ...event, zone_id: zoneIdRemap.get(event.zone_id) ?? event.zone_id },
    )

  const validEventIds = new Set(normalizedEvents.map((event) => event.event_id))
  const normalizedTasks = snapshot.tasks
    .filter((task) => task.project_id !== DEMO_PROJECT_ID || validEventIds.has(task.event_id))
    .map((task) => (task.project_id !== DEMO_PROJECT_ID ? task : { ...task }))

  const taskById = new Map(normalizedTasks.map((task) => [task.task_id, task]))
  const normalizedFeedback = snapshot.feedback
    .filter((item) => {
      if (item.project_id !== DEMO_PROJECT_ID) return true
      const task = taskById.get(item.task_id)
      if (!task) return false
      return new Date(item.timestamp).getTime() >= new Date(task.dispatched_at).getTime()
    })
    .map((item) => (item.project_id !== DEMO_PROJECT_ID ? item : { ...item }))

  return {
    ...snapshot,
    zones: [...snapshot.zones.filter((zone) => zone.project_id !== DEMO_PROJECT_ID), ...normalizedZones],
    dataSources: snapshot.dataSources.map((source) => {
      if (source.project_id !== DEMO_PROJECT_ID) return source
      const remappedZoneId = source.zone_id ? zoneIdRemap.get(source.zone_id) ?? source.zone_id : undefined
      const fallbackZoneId = inferDemoZoneId(source.name)
      const zoneId = remappedZoneId && validZoneIds.has(remappedZoneId) ? remappedZoneId : fallbackZoneId ?? remappedZoneId
      return zoneId ? { ...source, zone_id: zoneId } : { ...source }
    }),
    staff: snapshot.staff.map((member) => {
      if (member.staff_id === 'staff-manager-01') return { ...member, assigned_zone_id: 'zone-main-corridor' }
      if (member.staff_id === 'staff-01') return { ...member, assigned_zone_id: 'zone-entry' }
      if (member.staff_id === 'staff-booth-01') return { ...member, assigned_zone_id: 'zone-booth-a' }
      const remappedZoneId = zoneIdRemap.get(member.assigned_zone_id)
      return remappedZoneId ? { ...member, assigned_zone_id: remappedZoneId } : { ...member }
    }),
    signals: normalizedSignals,
    events: normalizedEvents,
    tasks: normalizedTasks,
    feedback: normalizedFeedback,
  }
}

function createMetadata(origin: SnapshotSourceOrigin): SnapshotSourceMetadata {
  const timestamp = new Date().toISOString()
  return {
    origin,
    service_mode: serviceModeForOrigin(origin),
    source_label: sourceLabelForOrigin(origin),
    schema_version: SCHEMA_VERSION,
    loaded_at: timestamp,
    last_synced_at: timestamp,
  }
}

function createLoadState(snapshot: ExpoPilotSnapshot, origin: SnapshotSourceOrigin): SnapshotLoadState {
  const metadata = createMetadata(origin)
  return {
    snapshot,
    metadata,
    origin,
    schema_version: metadata.schema_version,
    loaded_at: metadata.loaded_at,
  }
}

export function createSnapshotState(snapshot: ExpoPilotSnapshot, origin: SnapshotSourceOrigin) {
  return createLoadState(snapshot, origin)
}

export function createEmbeddedSnapshotState() {
  return createLoadState(normalizeDemoSnapshot(embeddedSnapshot), 'embedded')
}

export async function loadBootstrapSnapshotState(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}data/bootstrap.json`)
    const incoming = normalizeDemoSnapshot((await response.json()) as ExpoPilotSnapshot)
    saveSnapshot(incoming)
    return createLoadState(incoming, 'bootstrap')
  } catch {
    const fallback = normalizeDemoSnapshot(embeddedSnapshot)
    saveSnapshot(fallback)
    return createEmbeddedSnapshotState()
  }
}

export async function loadBootstrapSnapshot(baseUrl: string) {
  const state = await loadBootstrapSnapshotState(baseUrl)
  return state.snapshot
}

export function loadPersistedSnapshotState() {
  const persisted = loadJson<ExpoPilotSnapshot>(DATA_KEY)
  if (!persisted) return null
  const normalized = normalizeDemoSnapshot(persisted)
  saveSnapshot(normalized)
  return createLoadState(normalized, 'persisted')
}

export function loadPersistedSnapshot() {
  return loadPersistedSnapshotState()?.snapshot ?? embeddedSnapshot
}

export function saveSnapshot(snapshot: ExpoPilotSnapshot) {
  saveJson(DATA_KEY, snapshot)
}


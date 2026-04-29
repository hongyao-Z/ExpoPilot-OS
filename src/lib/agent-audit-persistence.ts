import type { AgentAuditRecord } from './agent-audit'

const AGENT_AUDIT_STORAGE_KEY = 'expopilot:agent-audit:v1'
const AGENT_AUDIT_STORAGE_VERSION = 1

interface AgentAuditPersistenceEnvelope {
  version: number
  records: AgentAuditRecord[]
}

function getStorage() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readPersistedAgentAuditRecords(): AgentAuditRecord[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(AGENT_AUDIT_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as Partial<AgentAuditPersistenceEnvelope> | AgentAuditRecord[]
    if (Array.isArray(parsed)) {
      return parsed.filter(isAgentAuditRecord)
    }

    if (parsed?.version !== AGENT_AUDIT_STORAGE_VERSION || !Array.isArray(parsed.records)) {
      return []
    }

    return parsed.records.filter(isAgentAuditRecord)
  } catch {
    return []
  }
}

export function writePersistedAgentAuditRecords(records: AgentAuditRecord[]) {
  const storage = getStorage()
  if (!storage) return

  const payload: AgentAuditPersistenceEnvelope = {
    version: AGENT_AUDIT_STORAGE_VERSION,
    records,
  }

  try {
    storage.setItem(AGENT_AUDIT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore browser storage failures and keep UI running
  }
}

function isAgentAuditRecord(value: unknown): value is AgentAuditRecord {
  if (!value || typeof value !== 'object') return false

  const record = value as Partial<AgentAuditRecord>
  return (
    typeof record.auditId === 'string' &&
    'projectId' in record &&
    typeof record.contextId === 'string' &&
    typeof record.decisionId === 'string' &&
    typeof record.action === 'string' &&
    typeof record.detail === 'string' &&
    typeof record.createdAt === 'string'
  )
}

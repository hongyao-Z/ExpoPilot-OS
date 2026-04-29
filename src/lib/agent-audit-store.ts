import type { AgentAuditRecord } from './agent-audit'
import { sortAgentAuditRecords } from './agent-audit'
import { readPersistedAgentAuditRecords, writePersistedAgentAuditRecords } from './agent-audit-persistence'

export interface AgentAuditScope {
  projectId?: string | null
  contextId?: string
  decisionId?: string
}

export function appendAgentAuditRecord(record: AgentAuditRecord) {
  appendAgentAuditRecords([record])
}

export function appendAgentAuditRecords(records: AgentAuditRecord[]) {
  if (records.length === 0) return

  const current = readPersistedAgentAuditRecords()
  const deduped = new Map<string, AgentAuditRecord>()

  for (const record of current) {
    deduped.set(record.auditId, record)
  }

  for (const record of records) {
    deduped.set(record.auditId, record)
  }

  writePersistedAgentAuditRecords(sortAgentAuditRecords([...deduped.values()]))
}

export function listAgentAuditRecords() {
  return sortAgentAuditRecords(readPersistedAgentAuditRecords())
}

export function listAgentAuditRecordsByScope(scope: AgentAuditScope) {
  return listAgentAuditRecords().filter((record) => {
    if ('projectId' in scope && record.projectId !== (scope.projectId ?? null)) return false
    if (scope.contextId && record.contextId !== scope.contextId) return false
    if (scope.decisionId && record.decisionId !== scope.decisionId) return false
    return true
  })
}

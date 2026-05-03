import { randomUUID } from 'node:crypto'

export function createAuditLogEntry(input) {
  return {
    auditId: input.auditId ?? `audit-${randomUUID()}`,
    timestamp: input.timestamp ?? new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    source: input.source,
    summary: input.summary,
    beforeStatus: input.beforeStatus ?? null,
    afterStatus: input.afterStatus ?? null,
    relatedEventId: input.relatedEventId ?? null,
    relatedTaskId: input.relatedTaskId ?? null,
    metadata: input.metadata ?? {},
  }
}

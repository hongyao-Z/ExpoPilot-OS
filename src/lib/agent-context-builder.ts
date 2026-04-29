import type { EventOperationalItem, RuntimeOperationalSummary, ZoneOperationalStatus } from '../domain/types'

export type AgentMode = 'assist' | 'auto'

export interface AgentContext {
  mode: AgentMode
  projectId?: string
  focusEvent?: EventOperationalItem
  focusZoneLabel: string
  priorityLabel: string
}

export interface BuildAgentContextInput {
  mode: AgentMode
  projectId?: string
  focusEvent?: EventOperationalItem
  selectedZone?: ZoneOperationalStatus
  entryZoneLabel?: string
  runtimeSummary: RuntimeOperationalSummary
}

export function buildAgentContext(input: BuildAgentContextInput): AgentContext {
  return {
    mode: input.mode,
    projectId: input.projectId,
    focusEvent: input.focusEvent,
    focusZoneLabel: input.focusEvent?.zone_name ?? input.selectedZone?.name ?? input.entryZoneLabel ?? '入口区',
    priorityLabel: input.runtimeSummary.current_priority_label,
  }
}

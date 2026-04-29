export type AgentExplanationSourceKey = 'fallback_template' | 'mock_reasoner' | 'remote_claw_placeholder'

const DEFAULT_AGENT_EXPLANATION_SOURCE: AgentExplanationSourceKey = 'fallback_template'

function normalizeAgentExplanationSource(value: string | undefined): AgentExplanationSourceKey {
  if (value === 'fallback_template' || value === 'mock_reasoner' || value === 'remote_claw_placeholder') {
    return value
  }

  return DEFAULT_AGENT_EXPLANATION_SOURCE
}

export function getActiveAgentExplanationSource(): AgentExplanationSourceKey {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return normalizeAgentExplanationSource(env?.VITE_AGENT_EXPLANATION_SOURCE)
}

export function getAgentExplanationSourceLabel(source: AgentExplanationSourceKey): string {
  switch (source) {
    case 'mock_reasoner':
      return 'Mock Reasoner'
    case 'remote_claw_placeholder':
      return 'OpenClaw Adapter'
    case 'fallback_template':
    default:
      return 'Fallback Template'
  }
}

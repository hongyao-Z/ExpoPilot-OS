export type AgentDecisionProducerKey = 'local_rule_based' | 'mock_agent' | 'remote_agent_placeholder'

const DEFAULT_AGENT_DECISION_PRODUCER: AgentDecisionProducerKey = 'local_rule_based'

function normalizeAgentDecisionProducer(value: string | undefined): AgentDecisionProducerKey {
  if (value === 'mock_agent' || value === 'remote_agent_placeholder' || value === 'local_rule_based') {
    return value
  }

  return DEFAULT_AGENT_DECISION_PRODUCER
}

export function getActiveAgentDecisionProducer(): AgentDecisionProducerKey {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return normalizeAgentDecisionProducer(env?.VITE_AGENT_DECISION_PRODUCER)
}

export function getAgentDecisionProducerLabel(producer: AgentDecisionProducerKey): string {
  switch (producer) {
    case 'mock_agent':
      return 'Mock Agent'
    case 'remote_agent_placeholder':
      return 'Remote Agent Placeholder'
    case 'local_rule_based':
    default:
      return 'Local Rule Based'
  }
}

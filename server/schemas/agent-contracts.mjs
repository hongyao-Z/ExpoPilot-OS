export const forbiddenAgentActionKeys = ['autoDispatch', 'executeDirectly', 'skipManagerConfirmation']

export const eventReviewRequiredFields = [
  'agent',
  'decision',
  'riskLevel',
  'evidence',
  'uncertainty',
  'requiresManagerConfirmation',
]

export const dispatchRequiredFields = [
  'agent',
  'recommendedAction',
  'recommendedAssignee',
  'backupAssignee',
  'reason',
  'riskNote',
  'fallback',
  'requiresManagerConfirmation',
]

export const replaySummaryRequiredFields = [
  'whatHappened',
  'whyDetected',
  'whatWasRecommended',
  'whoConfirmed',
  'whoExecuted',
  'result',
  'playbookSuggestion',
]

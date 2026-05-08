export const forbiddenAgentActionKeys = ['autoDispatch', 'executeDirectly', 'skipManagerConfirmation']

export const eventReviewRequiredFields = [
  'agent',
  'decision',
  'riskLevel',
  'evidence',
  'evidenceQuality',
  'missingEvidence',
  'professionalRiskNote',
  'managerReviewChecklist',
  'uncertainty',
  'requiresManagerConfirmation',
]

export const dispatchRequiredFields = [
  'agent',
  'recommendedAction',
  'recommendedAssignee',
  'backupAssignee',
  'reason',
  'candidateScore',
  'dispatchChecklist',
  'riskNote',
  'fallback',
  'fallbackAction',
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

const fallbackKnowledge = {
  professionalLabel: 'Unknown on-site signal',
  evidenceRequirements: ['monitoring snapshot or metric', 'field staff feedback'],
  riskSignals: ['unclassified abnormal signal', 'missing field context'],
  riskEscalationRules: ['route to manager manual review when risk cannot be verified'],
  recommendedActions: ['route to manager manual scheduling'],
  recommendedRoles: ['supervisor'],
  managerChecklist: ['verify whether the abnormal signal is real', 'verify whether a task should be created'],
}

export const operationsKnowledge = {
  entrance_congestion: {
    professionalLabel: 'Entrance crowd congestion',
    evidenceRequirements: ['entrance crowd density', 'queue length', 'entry throughput'],
    riskSignals: ['Entrance A density rising', 'queue length above threshold', 'entry throughput dropping'],
    riskEscalationRules: ['escalate when queue spills into main aisle or backup route is overloaded'],
    recommendedActions: ['add entrance guide for crowd diversion'],
    recommendedRoles: ['entrance_guide', 'security_guard', 'supervisor'],
    managerChecklist: ['confirm backup route availability', 'confirm queue spillover', 'confirm security support need'],
  },
  high_risk_congestion: {
    professionalLabel: 'High-risk entrance congestion',
    evidenceRequirements: ['queue spillover evidence', 'backup route pressure', 'entry throughput'],
    riskSignals: ['Entrance A queue spillover', 'backup route pressure rising'],
    riskEscalationRules: ['treat as high risk when entrance and backup route are both overloaded'],
    recommendedActions: ['add entrance guide for crowd diversion'],
    recommendedRoles: ['entrance_guide', 'security_guard', 'supervisor'],
    managerChecklist: ['confirm buffer area opening', 'confirm security coordination', 'confirm whether to slow entry flow'],
  },
  booth_queue: {
    professionalLabel: 'Booth queue growth',
    evidenceRequirements: ['booth queue length', 'aisle occupation', 'booth reception capacity'],
    riskSignals: ['Booth 512 queue increasing', 'visitor dwell time rising'],
    riskEscalationRules: ['escalate when booth queue blocks main aisle'],
    recommendedActions: ['add booth reception and organize queue'],
    recommendedRoles: ['booth_reception', 'floor_coordinator'],
    managerChecklist: ['confirm aisle impact', 'confirm additional reception staff need'],
  },
  fire_lane_blocked: {
    professionalLabel: 'Fire lane blocked',
    evidenceRequirements: ['blocked lane image', 'lane width or obstacle description', 'security field confirmation'],
    riskSignals: ['objects in fire lane', 'lane width insufficient', 'evacuation path affected'],
    riskEscalationRules: ['any persistent fire lane block must be treated as high risk'],
    recommendedActions: ['ask security to clear the fire lane'],
    recommendedRoles: ['security_guard', 'supervisor'],
    managerChecklist: ['confirm block still exists', 'confirm security has arrived', 'confirm whether nearby activity should pause'],
  },
  false_positive: {
    professionalLabel: 'False positive review',
    evidenceRequirements: ['latest camera frame', 'field feedback'],
    riskSignals: ['temporary gathering cleared', 'camera status normal', 'no sustained field pressure'],
    riskEscalationRules: ['re-open review only if the same signal repeats during observation'],
    recommendedActions: ['observe only, do not create task'],
    recommendedRoles: ['supervisor'],
    managerChecklist: ['confirm abnormal signal has cleared', 'confirm observation-only handling'],
  },
  equipment_failure: {
    professionalLabel: 'Equipment failure',
    evidenceRequirements: ['equipment status', 'impact scope', 'backup equipment status'],
    riskSignals: ['equipment abnormal', 'backup equipment not confirmed', 'service interruption risk'],
    riskEscalationRules: ['escalate when registration, stage, or safety flow is affected'],
    recommendedActions: ['dispatch technical support to inspect equipment'],
    recommendedRoles: ['technical_support', 'stage_operator', 'supervisor'],
    managerChecklist: ['confirm failed device', 'confirm backup plan', 'confirm whether related session should pause'],
  },
  equipment_issue: {
    professionalLabel: 'Equipment issue',
    evidenceRequirements: ['equipment status', 'impact scope', 'backup equipment status'],
    riskSignals: ['equipment abnormal', 'service interruption risk'],
    riskEscalationRules: ['escalate when on-site service or safety execution is affected'],
    recommendedActions: ['dispatch technical support to inspect equipment'],
    recommendedRoles: ['technical_support', 'supervisor'],
    managerChecklist: ['confirm failed device', 'confirm backup plan', 'confirm whether related session should pause'],
  },
  staff_missing: {
    professionalLabel: 'Staff shortage',
    evidenceRequirements: ['missing post count', 'current task volume', 'backup staff availability'],
    riskSignals: ['one entrance post missing', 'queue handling speed dropping'],
    riskEscalationRules: ['escalate when key post is uncovered and tasks are accumulating'],
    recommendedActions: ['assign backup staff to cover the post'],
    recommendedRoles: ['supervisor', 'entrance_guide'],
    managerChecklist: ['confirm missing post', 'confirm backup staff skill', 'confirm whether low-priority task should pause'],
  },
  staff_shortage: {
    professionalLabel: 'Staff shortage',
    evidenceRequirements: ['post gap', 'current task volume', 'backup staff availability'],
    riskSignals: ['post overloaded', 'task handling speed dropping'],
    riskEscalationRules: ['escalate when key post is uncovered and tasks are accumulating'],
    recommendedActions: ['assign backup staff to cover the post'],
    recommendedRoles: ['supervisor', 'entrance_guide'],
    managerChecklist: ['confirm missing post', 'confirm backup staff skill', 'confirm whether low-priority task should pause'],
  },
  worker_no_response: {
    professionalLabel: 'Worker no response',
    evidenceRequirements: ['task dispatch time', 'mobile task status', 'field risk change'],
    riskSignals: ['task has no status update for 5 minutes', 'mobile endpoint has no feedback'],
    riskEscalationRules: ['escalate to supervisor when SLA is exceeded and risk remains'],
    recommendedActions: ['escalate supervisor and reconfirm assignee'],
    recommendedRoles: ['supervisor'],
    managerChecklist: ['confirm whether original assignee is reachable', 'confirm whether reassignment is needed'],
  },
  task_timeout: {
    professionalLabel: 'Task timeout',
    evidenceRequirements: ['task dispatch time', 'latest status update time', 'field risk change'],
    riskSignals: ['task exceeded expected arrival time', 'entrance queue not relieved'],
    riskEscalationRules: ['escalate to supervisor when timeout has no feedback'],
    recommendedActions: ['escalate supervisor and reconfirm assignee'],
    recommendedRoles: ['supervisor'],
    managerChecklist: ['confirm whether task was received', 'confirm whether reassignment is needed', 'confirm escalation owner'],
  },
  backup_route_pressure: {
    professionalLabel: 'Backup route pressure rising',
    evidenceRequirements: ['backup route queue', 'Entrance A diversion status', 'route throughput'],
    riskSignals: ['backup route queue increasing', 'pressure transferred after diversion from Entrance A'],
    riskEscalationRules: ['stop continued diversion when backup route approaches capacity'],
    recommendedActions: ['adjust diversion pace and open buffer area',
    ],
    recommendedRoles: ['floor_coordinator', 'security_guard', 'supervisor'],
    managerChecklist: ['confirm buffer area opening', 'confirm whether to pause continued diversion'],
  },
  vip_attention: {
    professionalLabel: 'VIP reception pressure',
    evidenceRequirements: ['VIP arrival time', 'reception area congestion', 'security or protocol resource'],
    riskSignals: ['VIP entrance gathering', 'reception staff shortage', 'main aisle short-term congestion'],
    riskEscalationRules: ['escalate when main aisle or security order is affected'],
    recommendedActions: ['notify manager to coordinate VIP reception and security route'],
    recommendedRoles: ['supervisor', 'security_guard', 'floor_coordinator'],
    managerChecklist: ['confirm VIP route', 'confirm reception staff', 'confirm security coordination need'],
  },
  weather_disruption: {
    professionalLabel: 'Weather disruption',
    evidenceRequirements: ['weather change', 'outdoor queue exposure risk', 'indoor buffer availability'],
    riskSignals: ['sudden rain', 'outdoor queue waiting', 'entrance shelter overload'],
    riskEscalationRules: ['escalate when outdoor queue cannot continue waiting safely'],
    recommendedActions: ['open indoor buffer and adjust entrance queue route'],
    recommendedRoles: ['floor_coordinator', 'entrance_guide', 'supervisor'],
    managerChecklist: ['confirm indoor buffer area', 'confirm entrance guide staff', 'confirm visitor notification'],
  },
  medical_incident: {
    professionalLabel: 'On-site medical assistance',
    evidenceRequirements: ['person location', 'field staff confirmation', 'accessible route'],
    riskSignals: ['visitor discomfort', 'crowd gathering around incident', 'route needs clearing'],
    riskEscalationRules: ['treat personal safety incidents as high risk'],
    recommendedActions: ['notify manager and coordinate security to clear route for medical support'],
    recommendedRoles: ['security_guard', 'supervisor'],
    managerChecklist: ['confirm person location', 'confirm accessible route', 'confirm medical point contact'],
  },
  lost_child: {
    professionalLabel: 'Lost child assistance',
    evidenceRequirements: ['lost location', 'guardian feedback', 'service desk record'],
    riskSignals: ['service desk assistance request', 'child separated from guardian', 'cross-zone coordination needed'],
    riskEscalationRules: ['escalate child safety incidents to high priority'],
    recommendedActions: ['notify service desk and security to coordinate search'],
    recommendedRoles: ['service_desk_agent', 'security_guard', 'supervisor'],
    managerChecklist: ['confirm missing child information', 'confirm broadcast wording', 'confirm security search scope'],
  },
}

export function getOperationsKnowledge(eventType = 'entrance_congestion') {
  return operationsKnowledge[eventType] ?? fallbackKnowledge
}

export function evaluateEvidenceQuality(evidence = [], requiredCount = 2) {
  if (evidence.length >= requiredCount) return 'sufficient'
  if (evidence.length >= 2) return 'partial'
  return 'weak'
}

export function missingEvidenceFor(eventType, evidence = []) {
  const knowledge = getOperationsKnowledge(eventType)
  return knowledge.evidenceRequirements.slice(evidence.length)
}

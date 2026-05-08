const fallbackKnowledge = {
  professionalLabel: '入口人流拥堵',
  evidenceRequirements: ['入口人流密度', '排队长度', '入口通行能力'],
  riskSignals: ['入口 A 密度上升', '排队长度超过阈值'],
  riskEscalationRules: ['排队外溢或备用通道承压时升高优先级'],
  recommendedActions: ['增派入口引导员进行分流'],
  recommendedRoles: ['entrance_guide', 'security_guard', 'supervisor'],
  managerChecklist: ['确认备用通道可用', '确认入口队列是否外溢', '确认是否需要安保协同'],
}

export const operationsKnowledge = {
  entrance_congestion: fallbackKnowledge,
  high_risk_congestion: {
    professionalLabel: '高风险入口拥堵',
    evidenceRequirements: ['队列外溢证据', '备用通道压力', '入口通行速度'],
    riskSignals: ['入口 A 队列外溢', '备用通道压力上升'],
    riskEscalationRules: ['主入口和备用通道同时承压时升为高风险'],
    recommendedActions: ['增派入口引导员进行分流'],
    recommendedRoles: ['entrance_guide', 'security_guard', 'supervisor'],
    managerChecklist: ['确认是否打开缓冲区', '确认安保协同', '确认是否暂停继续放量'],
  },
  booth_queue: {
    professionalLabel: '展位队列过长',
    evidenceRequirements: ['展位队列长度', '通道占用情况', '展位接待能力'],
    riskSignals: ['展位 512 队列增长', '观众停留时间延长'],
    riskEscalationRules: ['队列占用主通道时升高优先级'],
    recommendedActions: ['增派入口引导员进行分流'],
    recommendedRoles: ['booth_reception', 'floor_coordinator'],
    managerChecklist: ['确认队列是否占用通道', '确认是否增加接待人员'],
  },
  equipment_failure: {
    professionalLabel: '设备故障',
    evidenceRequirements: ['设备状态', '影响范围', '备用设备状态'],
    riskSignals: ['设备状态异常', '备用设备未确认'],
    riskEscalationRules: ['影响签到、舞台或服务流程时升高优先级'],
    recommendedActions: ['派发技术支持检查设备'],
    recommendedRoles: ['technical_support', 'stage_operator', 'supervisor'],
    managerChecklist: ['确认故障设备', '确认备用方案', '确认是否暂停相关环节'],
  },
  equipment_issue: {
    professionalLabel: '设备异常',
    evidenceRequirements: ['设备状态', '影响范围', '备用设备状态'],
    riskSignals: ['设备状态异常', '服务中断风险'],
    riskEscalationRules: ['影响现场服务或安全执行时升高优先级'],
    recommendedActions: ['派发技术支持检查设备'],
    recommendedRoles: ['technical_support', 'supervisor'],
    managerChecklist: ['确认故障设备', '确认备用方案', '确认是否暂停相关环节'],
  },
  staff_missing: {
    professionalLabel: '人员不足',
    evidenceRequirements: ['缺岗数量', '当前任务量', '后备人员'],
    riskSignals: ['入口岗位缺少 1 人', '排队处理速度下降'],
    riskEscalationRules: ['关键岗位缺人且任务积压时升高优先级'],
    recommendedActions: ['调度备用工作人员补位'],
    recommendedRoles: ['supervisor', 'entrance_guide'],
    managerChecklist: ['确认缺岗岗位', '确认后备人员技能', '确认是否暂停低优先级任务'],
  },
  staff_shortage: {
    professionalLabel: '人员不足',
    evidenceRequirements: ['岗位缺口', '当前任务量', '后备人员'],
    riskSignals: ['岗位承压', '任务处理速度下降'],
    riskEscalationRules: ['关键岗位缺人且任务积压时升高优先级'],
    recommendedActions: ['调度备用工作人员补位'],
    recommendedRoles: ['supervisor', 'entrance_guide'],
    managerChecklist: ['确认缺岗岗位', '确认后备人员技能', '确认是否暂停低优先级任务'],
  },
  fire_lane_blocked: {
    professionalLabel: '消防通道占用',
    evidenceRequirements: ['通道占用画面', '通道宽度', '安保确认'],
    riskSignals: ['消防通道出现堆物', '通道宽度不足'],
    riskEscalationRules: ['消防通道受阻必须按高风险处理'],
    recommendedActions: ['通知安保协同清理通道'],
    recommendedRoles: ['security_guard', 'supervisor'],
    managerChecklist: ['确认通道占用是否持续', '确认安保是否到场', '确认是否需要暂停相邻活动'],
  },
  false_positive: {
    professionalLabel: '误报复核',
    evidenceRequirements: ['最新画面', '现场反馈'],
    riskSignals: ['短时聚集已消散', '摄像头状态正常'],
    riskEscalationRules: ['观察期间再次触发同类信号才重新审核'],
    recommendedActions: ['保持观察，不创建任务'],
    recommendedRoles: ['supervisor'],
    managerChecklist: ['确认异常是否已消散', '确认是否只需持续观察'],
  },
  worker_no_response: {
    professionalLabel: '工作人员未响应',
    evidenceRequirements: ['任务派发时间', '移动端状态', '现场风险变化'],
    riskSignals: ['已派任务 5 分钟无状态变化', '移动端未反馈'],
    riskEscalationRules: ['已派任务超过 SLA 且现场压力未缓解时升级主管'],
    recommendedActions: ['升级主管并重新确认执行人'],
    recommendedRoles: ['supervisor'],
    managerChecklist: ['确认原执行人是否可联系', '确认是否需要重派'],
  },
  task_timeout: {
    professionalLabel: '任务超时',
    evidenceRequirements: ['任务派发时间', '最新状态时间', '现场风险变化'],
    riskSignals: ['任务超过预计到达时间', '入口排队未缓解'],
    riskEscalationRules: ['任务超过 SLA 且未反馈时升级主管'],
    recommendedActions: ['升级主管并重新确认执行人'],
    recommendedRoles: ['supervisor'],
    managerChecklist: ['确认任务是否被接收', '确认是否重派', '确认是否升级主管'],
  },
  backup_route_pressure: {
    professionalLabel: '备用通道压力上升',
    evidenceRequirements: ['备用通道队列', '入口 A 分流状态', '通行速度'],
    riskSignals: ['备用通道排队增加', '入口 A 分流后压力转移'],
    riskEscalationRules: ['备用通道接近承载上限时停止继续导流'],
    recommendedActions: ['调整分流节奏并打开缓冲区'],
    recommendedRoles: ['floor_coordinator', 'security_guard', 'supervisor'],
    managerChecklist: ['确认是否打开缓冲区', '确认是否暂停继续分流'],
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

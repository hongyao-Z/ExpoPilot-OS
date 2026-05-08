import type { EventActionKey } from './event-action-catalog'
import type { StaffRole } from './staff-pool'
import type { VenueEventType } from './venue-event-types'

export type ExtendedOperationsEventType =
  | VenueEventType
  | 'fire_lane_blocked'
  | 'false_positive'
  | 'worker_no_response'
  | 'backup_route_pressure'
  | 'high_risk_congestion'
  | 'equipment_failure'
  | 'booth_queue'
  | string

export type EvidenceQuality = 'sufficient' | 'partial' | 'weak'

export interface EventOperationsKnowledge {
  eventType: ExtendedOperationsEventType
  professionalLabel: string
  riskSignals: readonly string[]
  evidenceRequirements: readonly string[]
  riskEscalationRules: readonly string[]
  recommendedActions: readonly EventActionKey[]
  forbiddenActions: readonly string[]
  recommendedRoles: readonly StaffRole[]
  managerChecklist: readonly string[]
  staffInstructions: readonly string[]
  replaySummaryTemplate: string
}

export interface EvidenceQualityInput {
  evidenceCount: number
  averageConfidence?: number
  requiredEvidenceCount?: number
}

const fallbackKnowledge: EventOperationsKnowledge = {
  eventType: 'unknown',
  professionalLabel: '现场异常待复核',
  riskSignals: ['现场出现未归类异常信号', '需要人工补充上下文'],
  evidenceRequirements: ['监控源截图或指标', '现场人员反馈'],
  riskEscalationRules: ['无法确认风险时转项目经理人工复核'],
  recommendedActions: ['notify_supervisor'],
  forbiddenActions: ['禁止 Agent 直接创建任务', '禁止绕过项目经理确认'],
  recommendedRoles: ['supervisor'],
  managerChecklist: ['确认异常是否真实存在', '确认是否需要现场人员介入', '确认是否需要安保或技术支持'],
  staffInstructions: ['等待项目经理明确任务后再执行', '不要根据系统提示自行改变现场动线'],
  replaySummaryTemplate: '系统识别到未归类现场异常，已转入项目经理人工复核。',
}

export const EVENT_OPERATIONS_KNOWLEDGE: Record<string, EventOperationsKnowledge> = {
  entrance_congestion: {
    eventType: 'entrance_congestion',
    professionalLabel: '入口人流拥堵',
    riskSignals: ['排队长度持续增加', '入口通行速度下降', '入口区域密度上升', '备用通道压力上升'],
    evidenceRequirements: ['入口人流密度', '排队长度', '入口通行能力', '备用通道状态'],
    riskEscalationRules: ['队列外溢到主通道', '5 分钟内未缓解', '备用通道压力同步上升'],
    recommendedActions: ['fill_position', 'open_extra_entry_lane', 'redirect_to_secondary_entry'],
    forbiddenActions: ['禁止直接封闭入口', '禁止继续把人流压向已拥堵备用通道'],
    recommendedRoles: ['entrance_guide', 'security_guard', 'supervisor'],
    managerChecklist: ['确认入口 A 是否仍在排队增长', '确认备用通道是否可承接分流', '确认安保是否需要协同维持秩序'],
    staffInstructions: ['前往入口 A', '引导观众至备用通道', '协助安保维持单向排队秩序', '处理后反馈排队长度变化'],
    replaySummaryTemplate: '入口拥堵事件已按“识别-确认-派发-反馈-复盘”记录，可沉淀为入口拥堵预案。',
  },
  high_risk_congestion: {
    eventType: 'high_risk_congestion',
    professionalLabel: '高风险入口拥堵',
    riskSignals: ['入口队列外溢', '备用通道压力上升', '短时人流超过入口承载'],
    evidenceRequirements: ['队列外溢证据', '备用通道压力', '入口通行速度'],
    riskEscalationRules: ['队列进入消防或主通道', '安保反馈秩序压力上升'],
    recommendedActions: ['fill_position', 'open_extra_entry_lane', 'deploy_crowd_control'],
    forbiddenActions: ['禁止单点继续放量', '禁止无安保协同强行改线'],
    recommendedRoles: ['entrance_guide', 'security_guard', 'supervisor'],
    managerChecklist: ['确认是否需要安保协同', '确认是否启用缓冲区', '确认是否暂停入口放量'],
    staffInstructions: ['优先保护主通道通行', '分批引导观众进入备用通道', '实时反馈队列外溢是否缓解'],
    replaySummaryTemplate: '高风险入口拥堵已升级处理，建议纳入高峰入场预案。',
  },
  queue_growth: {
    eventType: 'queue_growth',
    professionalLabel: '队列增长异常',
    riskSignals: ['队列长度增加', '等待时长上升', '服务窗口处理速度下降'],
    evidenceRequirements: ['队列长度', '等待时长', '服务窗口处理能力'],
    riskEscalationRules: ['等待时长超过承诺阈值', '队列占用主通道'],
    recommendedActions: ['add_queue_staff', 'split_waiting_line', 'update_waiting_time_board'],
    forbiddenActions: ['禁止只更新提示而不增加处理能力'],
    recommendedRoles: ['registration_volunteer', 'service_desk_agent', 'floor_coordinator'],
    managerChecklist: ['确认队列属于签到、咨询还是互动等待', '确认是否需要拆分队列', '确认等待时间是否需要公示'],
    staffInstructions: ['确认队列类型', '引导观众进入对应队列', '反馈等待时间是否下降'],
    replaySummaryTemplate: '队列增长事件已记录处理动作和等待时间变化，可用于优化服务窗口配置。',
  },
  booth_queue: {
    eventType: 'booth_queue',
    professionalLabel: '展位队列过长',
    riskSignals: ['展位互动队列增加', '观众停留时间延长', '队列影响相邻通道'],
    evidenceRequirements: ['展位队列长度', '通道占用情况', '展位接待能力'],
    riskEscalationRules: ['队列外溢至主通道', '相邻展位投诉或通行受阻'],
    recommendedActions: ['booth_reception_support', 'prepare_demo_queue', 'split_waiting_line'],
    forbiddenActions: ['禁止把展位队列引入消防通道'],
    recommendedRoles: ['booth_reception', 'floor_coordinator'],
    managerChecklist: ['确认展位是否需要增加接待', '确认队列是否影响通道', '确认是否需要预约或分批体验'],
    staffInstructions: ['建立清晰队列', '提醒观众等待时间', '反馈队列是否影响通道'],
    replaySummaryTemplate: '展位队列事件已记录接待增援和通道影响，可沉淀为热门展位排队预案。',
  },
  crowd_spillover: {
    eventType: 'crowd_spillover',
    professionalLabel: '人流外溢',
    riskSignals: ['人流进入主通道', '相邻区域压力上升', '安全出口附近聚集'],
    evidenceRequirements: ['主通道占用', '相邻区域密度', '安全出口或消防通道状态'],
    riskEscalationRules: ['占用消防通道', '影响疏散路径', '多区域同时升温'],
    recommendedActions: ['deploy_crowd_control', 'open_buffer_area', 'protect_emergency_passage'],
    forbiddenActions: ['禁止牺牲消防通道换取短时分流'],
    recommendedRoles: ['security_guard', 'floor_coordinator', 'supervisor'],
    managerChecklist: ['确认外溢是否影响疏散', '确认是否需要打开缓冲区', '确认安保协同范围'],
    staffInstructions: ['保护主通道和应急通道', '引导人流进入缓冲区', '持续反馈相邻区域压力'],
    replaySummaryTemplate: '人流外溢事件已记录通道保护和缓冲区处理过程。',
  },
  equipment_issue: {
    eventType: 'equipment_issue',
    professionalLabel: '设备异常',
    riskSignals: ['设备告警', '服务中断', '人工报障', '备用设备状态未确认'],
    evidenceRequirements: ['设备状态', '影响范围', '备用方案', '现场人工反馈'],
    riskEscalationRules: ['影响签到或舞台主流程', '备用设备不可用', '持续超过 5 分钟'],
    recommendedActions: ['dispatch_technical_support', 'switch_backup_equipment', 'pause_related_session'],
    forbiddenActions: ['禁止非技术人员拆改设备', '禁止在未确认安全前继续关键流程'],
    recommendedRoles: ['technical_support', 'stage_operator', 'supervisor'],
    managerChecklist: ['确认故障影响范围', '确认是否启用备用设备', '确认是否需要暂停相关环节'],
    staffInstructions: ['保持现场秩序', '等待技术支持确认', '反馈设备恢复状态'],
    replaySummaryTemplate: '设备异常事件已记录影响范围、技术支持和备用方案执行情况。',
  },
  equipment_failure: {
    eventType: 'equipment_failure',
    professionalLabel: '设备故障',
    riskSignals: ['设备状态异常', '备用设备未确认', '现场服务中断'],
    evidenceRequirements: ['设备状态', '影响范围', '备用设备状态'],
    riskEscalationRules: ['影响签到、舞台或安全流程', '无备用设备可用'],
    recommendedActions: ['dispatch_technical_support', 'switch_backup_equipment'],
    forbiddenActions: ['禁止无技术人员确认直接恢复关键设备'],
    recommendedRoles: ['technical_support', 'supervisor'],
    managerChecklist: ['确认故障设备', '确认备用设备', '确认是否通知受影响区域'],
    staffInstructions: ['协助维持现场秩序', '等待技术支持指令', '反馈恢复情况'],
    replaySummaryTemplate: '设备故障已按技术支持流程记录，可用于完善设备检查预案。',
  },
  staff_shortage: {
    eventType: 'staff_shortage',
    professionalLabel: '人员不足',
    riskSignals: ['岗位缺人', '待处理任务增加', '响应速度下降'],
    evidenceRequirements: ['缺岗数量', '当前任务量', '可调度后备人员'],
    riskEscalationRules: ['关键岗位无人覆盖', '多个任务同时超时'],
    recommendedActions: ['request_backup_staff', 'reassign_staff', 'reduce_noncritical_tasks'],
    forbiddenActions: ['禁止自动重排全场任务', '禁止把高风险岗位交给无技能人员'],
    recommendedRoles: ['supervisor', 'floor_coordinator'],
    managerChecklist: ['确认缺岗岗位', '确认后备人员能力', '确认是否暂停低优先级任务'],
    staffInstructions: ['等待主管调度', '只接收与岗位能力匹配的任务', '反馈当前负载'],
    replaySummaryTemplate: '人员不足事件已记录岗位缺口和主管调度过程。',
  },
  task_timeout: {
    eventType: 'task_timeout',
    professionalLabel: '任务超时',
    riskSignals: ['任务未按时接收', '任务未按时到达', '现场风险未缓解'],
    evidenceRequirements: ['任务派发时间', '最新状态更新时间', '现场风险变化'],
    riskEscalationRules: ['超过预计到达时间', '工作人员无响应', '风险等级上升'],
    recommendedActions: ['escalate_timeout_task', 'notify_supervisor', 'reassign_task_owner'],
    forbiddenActions: ['禁止重复派发给无响应人员'],
    recommendedRoles: ['supervisor', 'floor_coordinator'],
    managerChecklist: ['确认工作人员是否收到任务', '确认是否需要重派', '确认是否升级主管'],
    staffInstructions: ['收到超时提醒后立即反馈状态', '无法处理时请求支援'],
    replaySummaryTemplate: '任务超时事件已记录升级和重派建议，可用于优化 SLA。',
  },
  visitor_guidance_needed: {
    eventType: 'visitor_guidance_needed',
    professionalLabel: '访客引导需求',
    riskSignals: ['咨询聚集', '导视不足', '观众路线停顿'],
    evidenceRequirements: ['咨询点位置', '重复问询内容', '导视覆盖情况'],
    riskEscalationRules: ['咨询聚集影响主通道', '观众进入错误区域'],
    recommendedActions: ['deploy_guidance_volunteers', 'update_wayfinding_signage', 'broadcast_route_hint'],
    forbiddenActions: ['禁止只广播不安排现场引导'],
    recommendedRoles: ['entrance_guide', 'service_desk_agent'],
    managerChecklist: ['确认是否需要补充导视', '确认志愿者站位', '确认是否需要广播提示'],
    staffInstructions: ['前往咨询聚集点', '提供路线引导', '反馈重复问询问题'],
    replaySummaryTemplate: '访客引导事件已记录导视问题和现场引导处理。',
  },
  fire_lane_blocked: {
    eventType: 'fire_lane_blocked',
    professionalLabel: '消防通道占用',
    riskSignals: ['消防通道出现堆物', '通道宽度不足', '疏散路径受影响'],
    evidenceRequirements: ['通道占用画面', '通道宽度或阻挡描述', '安保现场确认'],
    riskEscalationRules: ['任何持续占用都按高风险处理', '影响疏散路径立即升级'],
    recommendedActions: ['protect_emergency_passage', 'deploy_crowd_control'],
    forbiddenActions: ['禁止延后处理消防通道占用', '禁止无安保协同处置'],
    recommendedRoles: ['security_guard', 'supervisor'],
    managerChecklist: ['确认通道是否仍被占用', '确认安保是否已到场', '确认是否需要暂停相邻活动'],
    staffInstructions: ['保持通道畅通', '协助清理阻挡物', '完成后反馈通道状态'],
    replaySummaryTemplate: '消防通道占用按高风险处理，已记录安保协同与通道恢复情况。',
  },
  false_positive: {
    eventType: 'false_positive',
    professionalLabel: '误报复核',
    riskSignals: ['短时聚集已消散', '摄像头状态正常', '现场无持续风险'],
    evidenceRequirements: ['最新画面', '现场反馈', '风险是否持续'],
    riskEscalationRules: ['复核后仍出现持续聚集再升级'],
    recommendedActions: [],
    forbiddenActions: ['禁止创建任务', '禁止派发人员'],
    recommendedRoles: ['supervisor'],
    managerChecklist: ['确认异常是否已经消散', '确认是否只需继续观察'],
    staffInstructions: ['无需执行任务，保持观察'],
    replaySummaryTemplate: '该事件已判断为误报或短时波动，未创建任务。',
  },
  worker_no_response: {
    eventType: 'worker_no_response',
    professionalLabel: '工作人员未响应',
    riskSignals: ['任务超过 5 分钟无状态变化', '移动端未反馈', '现场风险未缓解'],
    evidenceRequirements: ['任务派发时间', '移动端状态', '现场风险变化'],
    riskEscalationRules: ['超过 SLA 无响应', '风险继续上升'],
    recommendedActions: ['notify_supervisor', 'reassign_task_owner'],
    forbiddenActions: ['禁止重复派发给同一无响应人员'],
    recommendedRoles: ['supervisor', 'floor_coordinator'],
    managerChecklist: ['确认原执行人是否可联系', '确认是否需要重派', '确认是否通知主管'],
    staffInstructions: ['收到任务后必须确认接收', '无法处理时请求支援'],
    replaySummaryTemplate: '工作人员未响应事件已记录升级和重派建议。',
  },
  backup_route_pressure: {
    eventType: 'backup_route_pressure',
    professionalLabel: '备用通道压力上升',
    riskSignals: ['备用通道排队增加', '入口分流后压力转移', '备用通道通行速度下降'],
    evidenceRequirements: ['备用通道队列', '入口 A 分流状态', '通行速度'],
    riskEscalationRules: ['备用通道也出现外溢', '主入口与备用通道同时承压'],
    recommendedActions: ['open_buffer_area', 'split_waiting_line', 'notify_supervisor'],
    forbiddenActions: ['禁止继续单向压向备用通道'],
    recommendedRoles: ['floor_coordinator', 'security_guard', 'supervisor'],
    managerChecklist: ['确认是否需要打开缓冲区', '确认是否暂停继续分流', '确认是否增加现场引导'],
    staffInstructions: ['观察备用通道压力', '引导观众分批进入', '及时反馈压力变化'],
    replaySummaryTemplate: '备用通道压力上升已记录为分流后的次生风险。',
  },
}

export function listEventOperationsKnowledge() {
  return Object.values(EVENT_OPERATIONS_KNOWLEDGE)
}

export function getEventOperationsKnowledge(eventType: string | undefined): EventOperationsKnowledge {
  if (!eventType) return fallbackKnowledge
  return EVENT_OPERATIONS_KNOWLEDGE[eventType] ?? fallbackKnowledge
}

export function evaluateEvidenceQuality(input: EvidenceQualityInput): EvidenceQuality {
  const required = input.requiredEvidenceCount ?? 2
  const confidence = input.averageConfidence ?? 0.75

  if (input.evidenceCount >= required && confidence >= 0.75) return 'sufficient'
  if (input.evidenceCount >= 1 && confidence >= 0.55) return 'partial'
  return 'weak'
}

export function getEvidenceQualityLabel(quality: EvidenceQuality) {
  const labels: Record<EvidenceQuality, string> = {
    sufficient: '证据充分',
    partial: '证据部分充分',
    weak: '证据不足',
  }

  return labels[quality]
}

export function inferMissingEvidence(knowledge: EventOperationsKnowledge, evidenceCount: number) {
  if (evidenceCount >= knowledge.evidenceRequirements.length) return []
  return knowledge.evidenceRequirements.slice(evidenceCount)
}


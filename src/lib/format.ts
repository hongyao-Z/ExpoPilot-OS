import type {
  AuditLog,
  DataSourceHealth,
  DataSourceMode,
  EventSeverity,
  EventStatus,
  EventOperationalState,
  NotificationReceipt,
  NotificationReceiptStatus,
  PermissionRole,
  ProjectStatus,
  ReminderChannel,
  ShiftStatus,
  SnapshotSourceMetadata,
  SnapshotSourceOrigin,
  TaskStatus,
  UiFeedbackState,
  ZoneType,
} from '../domain/types'

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

export function formatToken(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${value}`
}

export function severityLabel(value: EventSeverity) {
  switch (value) {
    case 'critical':
      return '关键'
    case 'high':
      return '高优先级'
    default:
      return '中优先级'
  }
}

export function taskStatusLabel(value: TaskStatus) {
  switch (value) {
    case 'created':
      return '已创建'
    case 'received':
      return '已接收'
    case 'processing':
      return '处理中'
    case 'completed':
      return '已完成'
    case 'exception':
      return '异常反馈'
    default:
      return '待处理'
  }
}

export function eventStatusLabel(value: EventStatus) {
  switch (value) {
    case 'confirmed':
      return '已确认'
    case 'ignored':
      return '已忽略'
    case 'escalated':
      return '已升级'
    case 'closed':
      return '已闭环'
    default:
      return '待确认'
  }
}

export function projectStatusLabel(value: ProjectStatus) {
  switch (value) {
    case 'running':
      return '运行中'
    case 'ready':
      return '待启动'
    case 'completed':
      return '已完成'
    default:
      return '筹备中'
  }
}

export function roleLabel(value: PermissionRole) {
  switch (value) {
    case 'organizer':
      return '主办方'
    case 'agency':
      return '执行方'
    case 'brand':
      return '品牌方'
    case 'staff':
      return '工作人员'
    case 'admin':
      return '系统管理员'
  }
}

export function zoneTypeLabel(value: ZoneType) {
  switch (value) {
    case 'entry':
      return '入口区'
    case 'stage':
      return '主通道区'
    case 'booth':
      return '展台区'
    case 'lounge':
      return '休息区'
    default:
      return '服务区'
  }
}

export function shiftStatusLabel(value: ShiftStatus) {
  switch (value) {
    case 'busy':
      return '忙碌'
    case 'backup':
      return '待支援'
    case 'offline':
      return '离线'
    default:
      return '在岗'
  }
}

export function sourceStatusLabel(value: DataSourceHealth | 'mixed' | 'unknown') {
  switch (value) {
    case 'online':
      return '在线'
    case 'degraded':
      return '降级'
    case 'offline':
      return '离线'
    case 'mixed':
      return '混合状态'
    default:
      return '未知'
  }
}

export function sourceTypeLabel(value: DataSourceMode | 'mixed' | 'unknown') {
  switch (value) {
    case 'realtime':
      return '实时输入'
    case 'recorded':
      return '预录回退'
    case 'manual':
      return '人工输入'
    case 'sandbox':
      return '模拟输入'
    case 'mixed':
      return '混合输入'
    default:
      return '未知输入'
  }
}

export function channelLabel(value: ReminderChannel) {
  switch (value) {
    case 'mobile':
      return '移动端'
    case 'browser':
      return 'Web 后台'
    case 'wearable':
      return '可穿戴预留'
  }
}

export function receiptStatusLabel(value: NotificationReceiptStatus) {
  switch (value) {
    case 'sent':
      return '已发送'
    case 'delivered':
      return '已送达'
    case 'read':
      return '已读'
    case 'accepted':
      return '已确认'
    case 'timeout':
      return '超时'
    case 'retrying':
      return '重试中'
    case 'failed_fallback':
      return '失败降级'
  }
}

export function receiptSummary(receipts: NotificationReceipt[] | undefined) {
  if (!receipts || receipts.length === 0) return '当前还没有提醒回执'
  const latest = [...receipts].sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())[0]
  return `${channelLabel(latest.channel)}${receiptStatusLabel(latest.status)}：${latest.detail}`
}

export function snapshotOriginLabel(value: SnapshotSourceOrigin) {
  switch (value) {
    case 'bootstrap':
      return '基础快照'
    case 'persisted':
      return '本地持久化'
    case 'connector':
      return '连接器同步'
    case 'server-proxy':
      return '服务代理'
    default:
      return '内嵌兜底'
  }
}

export function snapshotServiceModeLabel(metadata: SnapshotSourceMetadata) {
  switch (metadata.service_mode) {
    case 'proxy-ready':
      return '代理模式'
    case 'hybrid':
      return '混合模式'
    default:
      return '本地模拟'
  }
}

export function eventOperationalStateLabel(value: EventOperationalState) {
  switch (value) {
    case 'pending_confirmation':
      return '待确认'
    case 'ready_dispatch':
      return '待派发'
    case 'assigned':
      return '执行中'
    case 'need_support':
      return '异常待处理'
    case 'closed':
      return '已闭环'
  }
}

export function triggerRuleLabel(value: string) {
  if (value.startsWith('queue_minutes > ')) return `排队时长超过 ${value.replace('queue_minutes > ', '')} 分钟`
  if (value.startsWith('density > ') && value.includes(' for ')) {
    const [thresholdPart, durationPart] = value.split(' for ')
    return `密度持续 ${durationPart.replace('s', '')} 秒高于 ${thresholdPart.replace('density > ', '')}`
  }
  if (value.startsWith('heat > ')) return `热度超过 ${value.replace('heat > ', '')}`
  if (value.startsWith('avg_dwell_seconds > ')) return `平均停留超过 ${value.replace('avg_dwell_seconds > ', '')} 秒`
  if (value.startsWith('lead_capture_rate < ')) {
    return `线索登记率低于 ${Math.round(Number(value.replace('lead_capture_rate < ', '')) * 100)}%`
  }
  if (value === 'schedule_window = keynote-pre') return '处于论坛开场前预警窗口'
  if (value.startsWith('density_delta > ') && value.includes(' in ')) {
    const [deltaPart, windowPart] = value.split(' in ')
    return `${windowPart.replace('m', '')} 分钟内密度上升超过 ${deltaPart.replace('density_delta > ', '')}`
  }
  if (value.startsWith('outer_ring_density > ')) return `外围密度超过 ${value.replace('outer_ring_density > ', '')}`
  if (value.startsWith('path_clearance < ')) return `主通道净宽低于 ${value.replace('path_clearance < ', '')} 米`
  if (value === 'source = sandbox') return '信号来自模拟输入'
  if (value === 'manual_input = true') return '由人工补录触发'
  return value
}

export function auditActionLabel(value: AuditLog['action_type']) {
  switch (value) {
    case 'task_dispatched':
      return '任务派发'
    case 'task_completed':
      return '任务完成'
    case 'task_updated':
      return '任务状态变更'
    case 'event_created':
      return '事件创建'
    case 'event_updated':
      return '事件更新'
    case 'strategy_saved':
      return '策略沉淀'
    case 'report_exported':
      return '导出复盘'
    case 'settings_updated':
      return '设置变更'
    case 'project_created':
      return '项目创建'
    case 'data_source_updated':
      return '数据源更新'
  }
}

export function feedbackClassName(feedback: UiFeedbackState | null) {
  if (!feedback || feedback.kind === 'idle') return ''
  return `feedback-${feedback.kind}`
}

export function sourceModeHint(mode: DataSourceMode, health: DataSourceHealth) {
  if (health === 'degraded' && mode === 'realtime') return '实时输入异常，建议切换到预录回退或人工补录。'
  if (mode === 'recorded') return '当前已进入预录回退模式。'
  if (mode === 'manual') return '当前依赖人工输入继续运行。'
  if (mode === 'sandbox') return '当前处于模拟输入沙盒。'
  return '当前输入正常。'
}

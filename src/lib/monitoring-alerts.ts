import type { VenueEventType } from './venue-event-types'

export type MonitoringAlertSeverity = 'critical' | 'high' | 'medium' | 'low'
export type MonitoringAlertStatus =
  | 'new'
  | 'reviewing'
  | 'needs_manager_review'
  | 'acknowledged'
  | 'resolved'
  | 'dismissed'

export interface MonitoringEvidence {
  evidenceId: string
  sourceId: string
  label: string
  detail: string
  frameLabel: string
  timestampLabel: string
  confidence: number
}

export interface MonitoringAlert {
  alertId: string
  sourceId: string
  sourceName: string
  zoneId: string
  zoneName: string
  eventType: VenueEventType
  eventLabel: string
  severity: MonitoringAlertSeverity
  status: MonitoringAlertStatus
  title: string
  summary: string
  timestampLabel: string
  managerAttentionRequired: boolean
  recommendedFocusLabel: string
  evidence: readonly MonitoringEvidence[]
}

export interface MonitoringAlertSummary {
  total: number
  active: number
  critical: number
  high: number
  medium: number
  low: number
  managerAttentionRequired: number
  topAlert?: MonitoringAlert
}

export const DEMO_MONITORING_ALERTS: readonly MonitoringAlert[] = [
  {
    alertId: 'alert-entrance-a-congestion',
    sourceId: 'monitor-entrance-a-main',
    sourceName: '入口 A 主摄像头',
    zoneId: 'zone-entrance-a',
    zoneName: '入口 A',
    eventType: 'entrance_congestion',
    eventLabel: '入口拥堵',
    severity: 'high',
    status: 'needs_manager_review',
    title: '入口 A 排队压力正在上升',
    summary: '入口摄像头持续报告排队增长，闸口通行速度下降。',
    timestampLabel: '10:05',
    managerAttentionRequired: true,
    recommendedFocusLabel: '查看排队密度，开启额外通道，并确认人员派发。',
    evidence: [
      {
        evidenceId: 'evidence-entrance-a-queue-density',
        sourceId: 'monitor-entrance-a-main',
        label: '排队密度超过阈值',
        detail: '排队密度连续两个监测周期高于当前演示阈值。',
        frameLabel: 'EA-10-05-queue-rise',
        timestampLabel: '10:05',
        confidence: 0.92,
      },
      {
        evidenceId: 'evidence-entrance-a-gate-throughput',
        sourceId: 'monitor-entrance-a-main',
        label: '闸口通行变慢',
        detail: '主入口通道的移动速度低于此前基线窗口。',
        frameLabel: 'EA-10-05-throughput-drop',
        timestampLabel: '10:05',
        confidence: 0.87,
      },
    ],
  },
  {
    alertId: 'alert-booth-512-heatup',
    sourceId: 'monitor-booth-512-heat',
    sourceName: '展台 512 热度摄像头',
    zoneId: 'zone-booth-512',
    zoneName: '展台 512',
    eventType: 'booth_heatup',
    eventLabel: '展台热度升高',
    severity: 'medium',
    status: 'reviewing',
    title: '展台 512 观众关注度正在上升',
    summary: '展台摄像头报告演示台周边停留时长和互动需求增加。',
    timestampLabel: '10:20',
    managerAttentionRequired: false,
    recommendedFocusLabel: '检查展台接待容量，并准备更明确的演示排队方式。',
    evidence: [
      {
        evidenceId: 'evidence-booth-512-dwell-time',
        sourceId: 'monitor-booth-512-heat',
        label: '停留时长上升',
        detail: '展台 512 附近观众停留时长高于常规演示范围。',
        frameLabel: 'B512-10-20-heatup',
        timestampLabel: '10:20',
        confidence: 0.86,
      },
      {
        evidenceId: 'evidence-booth-512-interaction-load',
        sourceId: 'monitor-booth-512-heat',
        label: '互动需求增加',
        detail: '等待产品互动的观众数量高于展台基线承载能力。',
        frameLabel: 'B512-10-20-demo-counter',
        timestampLabel: '10:21',
        confidence: 0.81,
      },
    ],
  },
  {
    alertId: 'alert-stage-equipment-issue',
    sourceId: 'monitor-stage-equipment',
    sourceName: '舞台设备监看',
    zoneId: 'zone-stage',
    zoneName: '舞台区',
    eventType: 'equipment_issue',
    eventLabel: '设备异常',
    severity: 'critical',
    status: 'needs_manager_review',
    title: '舞台设备告警需要复核',
    summary: '舞台边缘监测报告设备告警，可能影响下一场活动。',
    timestampLabel: '10:30',
    managerAttentionRequired: true,
    recommendedFocusLabel: '在下一场舞台节目开始前确认技术检查。',
    evidence: [
      {
        evidenceId: 'evidence-stage-device-warning',
        sourceId: 'monitor-stage-equipment',
        label: '设备健康告警',
        detail: '舞台控制设备在演示窗口期间报告异常健康信号。',
        frameLabel: 'STAGE-10-30-device-warning',
        timestampLabel: '10:30',
        confidence: 0.9,
      },
      {
        evidenceId: 'evidence-stage-service-risk',
        sourceId: 'monitor-stage-equipment',
        label: '服务中断风险',
        detail: '该告警接近既定舞台时段，可能影响节目执行。',
        frameLabel: 'STAGE-10-30-service-risk',
        timestampLabel: '10:31',
        confidence: 0.84,
      },
    ],
  },
] as const

const activeAlertStatuses = new Set<MonitoringAlertStatus>([
  'new',
  'reviewing',
  'needs_manager_review',
  'acknowledged',
])

const severityRank: Record<MonitoringAlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function byHighestSeverity(left: MonitoringAlert, right: MonitoringAlert) {
  const severityDelta = severityRank[right.severity] - severityRank[left.severity]

  if (severityDelta !== 0) {
    return severityDelta
  }

  return Number(right.managerAttentionRequired) - Number(left.managerAttentionRequired)
}

export function listMonitoringAlerts() {
  return [...DEMO_MONITORING_ALERTS]
}

export function getMonitoringAlertById(alertId: string) {
  return DEMO_MONITORING_ALERTS.find((alert) => alert.alertId === alertId) ?? null
}

export function getActiveMonitoringAlerts() {
  return DEMO_MONITORING_ALERTS.filter((alert) => activeAlertStatuses.has(alert.status))
}

export function getAlertsByMonitorSourceId(sourceId: string) {
  return DEMO_MONITORING_ALERTS.filter((alert) => alert.sourceId === sourceId)
}

export function getHighestSeverityAlert() {
  return getActiveMonitoringAlerts().sort(byHighestSeverity)[0] ?? null
}

export function getMonitoringAlertSummary(): MonitoringAlertSummary {
  const alerts = listMonitoringAlerts()
  const activeAlerts = getActiveMonitoringAlerts()

  return {
    total: alerts.length,
    active: activeAlerts.length,
    critical: alerts.filter((alert) => alert.severity === 'critical').length,
    high: alerts.filter((alert) => alert.severity === 'high').length,
    medium: alerts.filter((alert) => alert.severity === 'medium').length,
    low: alerts.filter((alert) => alert.severity === 'low').length,
    managerAttentionRequired: alerts.filter((alert) => alert.managerAttentionRequired).length,
    topAlert: getHighestSeverityAlert() ?? undefined,
  }
}

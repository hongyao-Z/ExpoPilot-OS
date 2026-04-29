import type { VenueEventType } from './venue-event-types'
import type { VenueZoneType } from './venue-zones'

export type MonitorSourceType = 'fixed_camera' | 'ptz_camera' | 'edge_counter' | 'manual_observation'
export type MonitorSourceStatus = 'online' | 'warning' | 'offline' | 'maintenance'
export type MonitorSourceHealth = 'stable' | 'degraded' | 'critical'

export interface MonitorSourceSnapshot {
  sourceId: string
  timestampLabel: string
  frameLabel: string
  signalLabel: string
  crowdLevel: number
  confidence: number
  suggestedEventTypes: VenueEventType[]
}

export interface MonitorSource {
  sourceId: string
  sourceName: string
  sourceType: MonitorSourceType
  zoneId: string
  zoneName: string
  zoneType: VenueZoneType
  status: MonitorSourceStatus
  health: MonitorSourceHealth
  streamLabel: string
  positionLabel: string
  ownerTeam: string
  primaryEventTypes: VenueEventType[]
  lastSignalLabel: string
  lastUpdatedLabel: string
  snapshot: MonitorSourceSnapshot
}

export interface MonitorSourceSummary {
  total: number
  active: number
  warning: number
  offline: number
  critical: number
  zonesCovered: number
  topFocusSource?: MonitorSource
}

export const DEMO_MONITOR_SOURCES: readonly MonitorSource[] = [
  {
    sourceId: 'monitor-entrance-a-main',
    sourceName: '入口 A 主摄像头',
    sourceType: 'fixed_camera',
    zoneId: 'zone-entrance-a',
    zoneName: '入口 A',
    zoneType: 'entrance',
    status: 'warning',
    health: 'critical',
    streamLabel: 'CAM-EA-01',
    positionLabel: 'A 口上方俯视位',
    ownerTeam: '现场运营',
    primaryEventTypes: ['entrance_congestion', 'queue_growth', 'visitor_guidance_needed'],
    lastSignalLabel: '主入口通道附近排队密度正在上升。',
    lastUpdatedLabel: '10:05',
    snapshot: {
      sourceId: 'monitor-entrance-a-main',
      timestampLabel: '10:05',
      frameLabel: 'EA-10-05-queue-rise',
      signalLabel: '排队长度超过演示阈值',
      crowdLevel: 86,
      confidence: 0.92,
      suggestedEventTypes: ['entrance_congestion', 'queue_growth'],
    },
  },
  {
    sourceId: 'monitor-booth-512-heat',
    sourceName: '展台 512 热度摄像头',
    sourceType: 'ptz_camera',
    zoneId: 'zone-booth-512',
    zoneName: '展台 512',
    zoneType: 'booth',
    status: 'online',
    health: 'degraded',
    streamLabel: 'CAM-B512-02',
    positionLabel: '展台 512 观众侧',
    ownerTeam: '展台运营',
    primaryEventTypes: ['booth_heatup', 'queue_growth', 'visitor_guidance_needed'],
    lastSignalLabel: '观众停留时长和互动需求正在上升。',
    lastUpdatedLabel: '10:20',
    snapshot: {
      sourceId: 'monitor-booth-512-heat',
      timestampLabel: '10:20',
      frameLabel: 'B512-10-20-heatup',
      signalLabel: '展台关注度高于常规运营水平',
      crowdLevel: 68,
      confidence: 0.86,
      suggestedEventTypes: ['booth_heatup'],
    },
  },
  {
    sourceId: 'monitor-stage-equipment',
    sourceName: '舞台设备监看',
    sourceType: 'edge_counter',
    zoneId: 'zone-stage',
    zoneName: '舞台区',
    zoneType: 'stage',
    status: 'warning',
    health: 'critical',
    streamLabel: 'EDGE-STAGE-01',
    positionLabel: '舞台控制机柜',
    ownerTeam: '节目运营',
    primaryEventTypes: ['equipment_issue', 'task_timeout', 'queue_growth'],
    lastSignalLabel: '设备健康信号提示舞台设备可能异常。',
    lastUpdatedLabel: '10:30',
    snapshot: {
      sourceId: 'monitor-stage-equipment',
      timestampLabel: '10:30',
      frameLabel: 'STAGE-10-30-device-warning',
      signalLabel: '设备告警并存在服务中断风险',
      crowdLevel: 54,
      confidence: 0.9,
      suggestedEventTypes: ['equipment_issue'],
    },
  },
  {
    sourceId: 'monitor-main-hall-corridor',
    sourceName: '主展厅通道摄像头',
    sourceType: 'fixed_camera',
    zoneId: 'zone-main-hall',
    zoneName: '主展厅',
    zoneType: 'main_hall',
    status: 'online',
    health: 'stable',
    streamLabel: 'CAM-MH-03',
    positionLabel: '主展厅中央通道',
    ownerTeam: '场馆协调',
    primaryEventTypes: ['crowd_spillover', 'visitor_guidance_needed', 'staff_shortage'],
    lastSignalLabel: '主通道目前处于常规运营范围内。',
    lastUpdatedLabel: '10:18',
    snapshot: {
      sourceId: 'monitor-main-hall-corridor',
      timestampLabel: '10:18',
      frameLabel: 'MH-10-18-normal-flow',
      signalLabel: '通道流量稳定',
      crowdLevel: 42,
      confidence: 0.82,
      suggestedEventTypes: ['visitor_guidance_needed'],
    },
  },
  {
    sourceId: 'monitor-registration-desk',
    sourceName: '签到台计数器',
    sourceType: 'edge_counter',
    zoneId: 'zone-registration',
    zoneName: '签到区',
    zoneType: 'registration',
    status: 'online',
    health: 'stable',
    streamLabel: 'EDGE-REG-01',
    positionLabel: '签到排队计数位',
    ownerTeam: '签到组',
    primaryEventTypes: ['queue_growth', 'staff_shortage', 'entrance_congestion'],
    lastSignalLabel: '签到排队仍低于当前演示告警阈值。',
    lastUpdatedLabel: '10:12',
    snapshot: {
      sourceId: 'monitor-registration-desk',
      timestampLabel: '10:12',
      frameLabel: 'REG-10-12-normal-queue',
      signalLabel: '签到负载正常',
      crowdLevel: 38,
      confidence: 0.8,
      suggestedEventTypes: ['queue_growth'],
    },
  },
] as const

export function listMonitorSources() {
  return [...DEMO_MONITOR_SOURCES]
}

export function getMonitorSourceById(sourceId: string) {
  return DEMO_MONITOR_SOURCES.find((source) => source.sourceId === sourceId) ?? null
}

export function getMonitorSourcesByZoneId(zoneId: string) {
  return DEMO_MONITOR_SOURCES.filter((source) => source.zoneId === zoneId)
}

export function getActiveMonitorSources() {
  return DEMO_MONITOR_SOURCES.filter((source) => source.status === 'online' || source.status === 'warning')
}

export function getMonitorSourceSummary(): MonitorSourceSummary {
  const sources = listMonitorSources()
  const active = sources.filter((source) => source.status === 'online' || source.status === 'warning')
  const criticalSources = sources.filter((source) => source.health === 'critical')

  return {
    total: sources.length,
    active: active.length,
    warning: sources.filter((source) => source.status === 'warning').length,
    offline: sources.filter((source) => source.status === 'offline').length,
    critical: criticalSources.length,
    zonesCovered: new Set(sources.map((source) => source.zoneId)).size,
    topFocusSource: criticalSources[0] ?? active[0],
  }
}

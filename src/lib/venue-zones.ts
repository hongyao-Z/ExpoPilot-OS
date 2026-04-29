export type VenueZoneType =
  | 'entrance'
  | 'registration'
  | 'main_hall'
  | 'booth'
  | 'service_desk'
  | 'stage'
  | 'emergency_passage'

export type VenueRiskLevel = 'low' | 'medium' | 'high'

export interface VenueZone {
  zoneId: string
  zoneType: VenueZoneType
  zoneName: string
  floor: string
  capacity: number
  ownerTeam: string
  defaultAssigneeRole: string
  riskLevel: VenueRiskLevel
}

export const demoVenueZones: VenueZone[] = [
  {
    zoneId: 'zone-entrance-a',
    zoneType: 'entrance',
    zoneName: '入口 A',
    floor: '1F',
    capacity: 800,
    ownerTeam: '现场执行组',
    defaultAssigneeRole: '入口引导员',
    riskLevel: 'high',
  },
  {
    zoneId: 'zone-registration',
    zoneType: 'registration',
    zoneName: '签到区',
    floor: '1F',
    capacity: 480,
    ownerTeam: '注册接待组',
    defaultAssigneeRole: '志愿者',
    riskLevel: 'medium',
  },
  {
    zoneId: 'zone-main-hall',
    zoneType: 'main_hall',
    zoneName: '主展厅',
    floor: '1F',
    capacity: 3000,
    ownerTeam: '场馆协调组',
    defaultAssigneeRole: '场馆协调员',
    riskLevel: 'medium',
  },
  {
    zoneId: 'zone-booth-512',
    zoneType: 'booth',
    zoneName: '展台 512',
    floor: '1F',
    capacity: 120,
    ownerTeam: '展台运营组',
    defaultAssigneeRole: '展台接待',
    riskLevel: 'medium',
  },
  {
    zoneId: 'zone-service-desk',
    zoneType: 'service_desk',
    zoneName: '服务台',
    floor: '1F',
    capacity: 80,
    ownerTeam: '客户服务组',
    defaultAssigneeRole: '志愿者',
    riskLevel: 'low',
  },
  {
    zoneId: 'zone-stage',
    zoneType: 'stage',
    zoneName: '舞台区',
    floor: '2F',
    capacity: 600,
    ownerTeam: '活动执行组',
    defaultAssigneeRole: '技术支持',
    riskLevel: 'medium',
  },
  {
    zoneId: 'zone-emergency-passage',
    zoneType: 'emergency_passage',
    zoneName: '应急通道',
    floor: '1F',
    capacity: 200,
    ownerTeam: '安保组',
    defaultAssigneeRole: '安保人员',
    riskLevel: 'high',
  },
]

export function listVenueZones() {
  return demoVenueZones
}

export function getVenueZoneById(zoneId: string) {
  return demoVenueZones.find((zone) => zone.zoneId === zoneId) ?? null
}

export function getVenueZonesByType(zoneType: VenueZoneType) {
  return demoVenueZones.filter((zone) => zone.zoneType === zoneType)
}

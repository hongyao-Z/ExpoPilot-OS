export interface RouteState {
  page:
    | 'login'
    | 'mobile'
    | 'projects'
    | 'config'
    | 'live'
    | 'events'
    | 'dispatch'
    | 'people'
    | 'explain'
    | 'replay'
    | 'strategies'
    | 'staff'
    | 'settings'
  projectId?: string
  itemId?: string
}

export function parseRoute(hash: string): RouteState {
  const cleaned = hash.replace(/^#/, '') || '/login'
  const segments = cleaned.split('/').filter(Boolean)

  if (segments[0] === 'mobile') return { page: 'mobile' }
  if (segments[0] === 'projects') return { page: 'projects' }
  if (segments[0] === 'staff') return { page: 'staff' }
  if (segments[0] === 'settings') return { page: 'settings' }

  if (segments[0] === 'project') {
    const projectId = segments[1]
    const target = segments[2]
    if (target === 'config') return { page: 'config', projectId }
    if (target === 'live') return { page: 'live', projectId }
    if (target === 'events') return { page: 'events', projectId }
    if (target === 'dispatch') return { page: 'dispatch', projectId }
    if (target === 'people') return { page: 'people', projectId }
    if (target === 'replay') return { page: 'replay', projectId }
    if (target === 'strategies') return { page: 'strategies', projectId }
    if (target === 'explain') return { page: 'explain', projectId, itemId: segments[3] }
  }

  return { page: 'login' }
}

export function toHash(route: RouteState) {
  switch (route.page) {
    case 'mobile':
      return '#/mobile'
    case 'projects':
      return '#/projects'
    case 'staff':
      return '#/staff'
    case 'settings':
      return '#/settings'
    case 'config':
      return `#/project/${route.projectId}/config`
    case 'live':
      return `#/project/${route.projectId}/live`
    case 'events':
      return `#/project/${route.projectId}/events`
    case 'dispatch':
      return `#/project/${route.projectId}/dispatch`
    case 'people':
      return `#/project/${route.projectId}/people`
    case 'replay':
      return `#/project/${route.projectId}/replay`
    case 'strategies':
      return `#/project/${route.projectId}/strategies`
    case 'explain':
      return `#/project/${route.projectId}/explain/${route.itemId}`
    default:
      return '#/login'
  }
}

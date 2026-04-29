import type { AuthGateway, AuthSession, LoginInput, PermissionSnapshot, RoleType } from '../domain/types'

function permissionForRole(role: RoleType, orgId?: string, staffId?: string): PermissionSnapshot {
  switch (role) {
    case 'staff':
      return {
        role,
        org_id: orgId,
        staff_id: staffId,
        scope: 'staff-only',
        visible_roles: ['staff'],
        can_view_settings: false,
        can_dispatch: false,
        can_manage_strategies: false,
      }
    case 'brand':
      return {
        role,
        org_id: orgId,
        scope: 'brand-scoped',
        visible_roles: ['brand'],
        can_view_settings: false,
        can_dispatch: false,
        can_manage_strategies: true,
      }
    case 'admin':
      return {
        role,
        org_id: orgId,
        scope: 'governance',
        visible_roles: ['admin', 'organizer', 'agency', 'brand'],
        can_view_settings: true,
        can_dispatch: false,
        can_manage_strategies: true,
      }
    default:
      return {
        role,
        org_id: orgId,
        scope: 'all',
        visible_roles: ['organizer', 'agency', 'brand', 'staff', 'admin'],
        can_view_settings: role === 'organizer',
        can_dispatch: true,
        can_manage_strategies: true,
      }
  }
}

function now() {
  return new Date().toISOString()
}

export const localAuthGateway: AuthGateway = {
  descriptor: {
    provider: 'local-auth-mock',
    mode: 'sandbox-login',
  },
  signIn(input: LoginInput): AuthSession {
    return {
      session_id: `session-${Date.now()}`,
      role: input.role,
      displayName: input.displayName,
      email: input.email,
      declared_role: input.role,
      organization_label: input.organization_label,
      login_at: now(),
      login_mode: 'sandbox-auth-gateway',
      staffId: input.staffId,
      orgId: input.orgId,
      permission: permissionForRole(input.role, input.orgId, input.staffId),
    }
  },
}

import type { Role } from '@ticketflow/shared'
import type { AuthVariables } from '../db/types'
import type { Context, Next } from 'hono'

export const PERMISSIONS = {
  TICKET_CREATE: 'ticket:create',
  TICKET_ASSIGN: 'ticket:assign',
  TICKET_START: 'ticket:start',
  TICKET_COMPLETE: 'ticket:complete',
  TICKET_READ: 'ticket:read',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  submitter: ['ticket:create', 'ticket:read'],
  dispatcher: ['ticket:assign', 'ticket:read'],
  completer: ['ticket:start', 'ticket:complete', 'ticket:read'],
}

export function getPermissionsForRoles(roles: Role[]): Set<Permission> {
  return new Set(roles.flatMap((r) => ROLE_PERMISSIONS[r] ?? []))
}

export function requirePermission(permission: Permission) {
  return async (c: Context<AuthVariables>, next: Next) => {
    const user = c.get('user')
    const roles: Role[] = [user!.role]
    if (!getPermissionsForRoles(roles).has(permission)) {
      return c.json({ error: '权限不足' }, 403)
    }
    await next()
  }
}

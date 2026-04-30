import { describe, it, expect, vi } from 'vitest'
import type { Role } from '@ticketflow/shared'

// These imports will fail until permissions.ts is created (TDD Red)
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getPermissionsForRoles,
  requirePermission,
} from '../lib/permissions'

describe('PERMISSIONS constant', () => {
  it('contains exactly 5 permission strings', () => {
    const values = Object.values(PERMISSIONS)
    expect(values).toHaveLength(5)
    expect(values).toContain('ticket:create')
    expect(values).toContain('ticket:assign')
    expect(values).toContain('ticket:start')
    expect(values).toContain('ticket:complete')
    expect(values).toContain('ticket:read')
  })
})

describe('ROLE_PERMISSIONS mapping', () => {
  it('submitter has create + read', () => {
    expect(ROLE_PERMISSIONS['submitter']).toEqual(['ticket:create', 'ticket:read'])
  })

  it('dispatcher has assign + read', () => {
    expect(ROLE_PERMISSIONS['dispatcher']).toEqual(['ticket:assign', 'ticket:read'])
  })

  it('completer has start + complete + read', () => {
    expect(ROLE_PERMISSIONS['completer']).toEqual(['ticket:start', 'ticket:complete', 'ticket:read'])
  })

  it('every role has ticket:read', () => {
    const roles: Role[] = ['submitter', 'dispatcher', 'completer']
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role]).toContain('ticket:read')
    }
  })
})

describe('getPermissionsForRoles', () => {
  it('returns correct set for single role', () => {
    const perms = getPermissionsForRoles(['submitter'])
    expect(perms.has('ticket:create')).toBe(true)
    expect(perms.has('ticket:read')).toBe(true)
    expect(perms.has('ticket:assign')).toBe(false)
  })

  it('merges permissions from multiple roles', () => {
    const perms = getPermissionsForRoles(['submitter', 'dispatcher'])
    expect(perms.has('ticket:create')).toBe(true)
    expect(perms.has('ticket:assign')).toBe(true)
    expect(perms.has('ticket:read')).toBe(true)
  })

  it('multi-role without target permission returns false', () => {
    const perms = getPermissionsForRoles(['submitter', 'dispatcher'])
    expect(perms.has('ticket:start')).toBe(false)
    expect(perms.has('ticket:complete')).toBe(false)
  })

  it('handles empty array', () => {
    const perms = getPermissionsForRoles([])
    expect(perms.size).toBe(0)
  })
})

describe('requirePermission middleware', () => {
  it('calls next when user has the required permission', async () => {
    const next = vi.fn()
    const json = vi.fn().mockReturnThis()
    const c = {
      get: (key: string) => {
        if (key === 'user') return { role: 'dispatcher', username: 'dispatcher' }
        return undefined
      },
      json,
    } as any

    const middleware = requirePermission('ticket:assign')
    await middleware(c, next)

    expect(next).toHaveBeenCalled()
    expect(json).not.toHaveBeenCalled()
  })

  it('returns 403 when user lacks the required permission', async () => {
    const next = vi.fn()
    const json = vi.fn().mockReturnValue({ status: 403 })
    const c = {
      get: (key: string) => {
        if (key === 'user') return { role: 'submitter', username: 'submitter' }
        return undefined
      },
      json,
    } as any

    const middleware = requirePermission('ticket:assign')
    await middleware(c, next)

    expect(json).toHaveBeenCalledWith({ error: '权限不足' }, 403)
    expect(next).not.toHaveBeenCalled()
  })
})

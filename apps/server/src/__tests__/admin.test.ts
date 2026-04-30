import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp } from './helpers'
import { users } from '../db/schema'
import { hashPassword } from '../lib/password'
import { sessionStore } from '../lib/sessions'

const { app, db } = createTestApp()

async function login(username: string, password: string) {
  return app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}

function extractCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) throw new Error('No set-cookie header')
  return setCookie.split(';')[0]
}

describe('Admin API', () => {
  beforeEach(async () => {
    sessionStore.clear()
    await db.delete(users)
    // Seed test users
    await db.insert(users).values({
      id: 'u-admin-00000000-0000-0000-000000000001',
      username: 'admin',
      displayName: '管理员',
      role: 'admin',
      passwordHash: await hashPassword('admin'),
      createdAt: new Date().toISOString(),
    })
    await db.insert(users).values({
      id: 'u-sub-00000000-0000-0000-000000000002',
      username: 'submitter',
      displayName: '提交者',
      role: 'submitter',
      passwordHash: await hashPassword('changeme'),
      createdAt: new Date().toISOString(),
    })
  })

  describe('GET /api/admin/users', () => {
    it('returns user list for admin (no passwordHash)', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users', {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(2)
      expect(body[0]).not.toHaveProperty('passwordHash')
      expect(body[0]).toHaveProperty('username')
      expect(body[0]).toHaveProperty('displayName')
      expect(body[0]).toHaveProperty('role')
      expect(body[0]).toHaveProperty('createdAt')
    })

    it('returns 403 for submitter', async () => {
      const loginRes = await login('submitter', 'changeme')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users', {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(403)
    })

    it('returns 401 for unauthenticated', async () => {
      const res = await app.request('/api/admin/users')
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/admin/users', () => {
    it('creates user and returns 201 without passwordHash', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ username: 'alice', displayName: 'Alice', role: 'submitter', password: 'pass123' }),
      })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.username).toBe('alice')
      expect(body.displayName).toBe('Alice')
      expect(body.role).toBe('submitter')
      expect(body).not.toHaveProperty('passwordHash')
      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('createdAt')
    })

    it('returns 400 for duplicate username', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ username: 'submitter', displayName: 'X', role: 'submitter', password: 'pass' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('用户名已存在')
    })

    it('returns 400 for missing fields', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ username: 'bob' }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid role', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ username: 'bob', displayName: 'Bob', role: 'superuser', password: 'pass' }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 for empty password', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ username: 'bob', displayName: 'Bob', role: 'submitter', password: '' }),
      })
      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/admin/users/:username', () => {
    it('updates displayName and role', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users/submitter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ displayName: 'New Name', role: 'dispatcher' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.displayName).toBe('New Name')
      expect(body.role).toBe('dispatcher')
    })

    it('updates password when provided', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users/submitter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ password: 'newpass' }),
      })
      expect(res.status).toBe(200)

      // Verify new password works
      const newLogin = await login('submitter', 'newpass')
      expect(newLogin.status).toBe(200)
    })

    it('does not change password when not provided', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users/submitter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ displayName: 'Changed' }),
      })
      expect(res.status).toBe(200)

      // Verify old password still works
      const oldLogin = await login('submitter', 'changeme')
      expect(oldLogin.status).toBe(200)
    })

    it('returns 404 for non-existent user', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ displayName: 'X' }),
      })
      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid role', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users/submitter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ role: 'superuser' }),
      })
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/admin/users/:username', () => {
    it('deletes non-admin user and returns ok', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users/submitter', {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
    })

    it('returns 400 when deleting admin user', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users/admin', {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('不能删除管理员用户')
    })

    it('returns 404 for non-existent user', async () => {
      const loginRes = await login('admin', 'admin')
      const cookie = extractCookie(loginRes)

      const res = await app.request('/api/admin/users/nonexistent', {
        method: 'DELETE',
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(404)
    })
  })
})

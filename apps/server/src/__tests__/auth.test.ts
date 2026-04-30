import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp } from './helpers'
import { users } from '../db/schema'
import { sessionStore } from '../lib/sessions'
import { hashPassword } from '../lib/password'

const { app, db } = createTestApp()

const testPassword = 'testpass'

describe('Auth API', () => {
  beforeEach(async () => {
    sessionStore.clear()
    await db.delete(users)
    await db.insert(users).values({
      id: 'u-test-00000000-0000-0000-000000000001',
      username: 'testuser',
      displayName: 'Test User',
      role: 'submitter',
      passwordHash: await hashPassword(testPassword),
      createdAt: new Date().toISOString(),
    })
  })

  // Helper: login and return response
  async function login(username: string = 'testuser', password: string = testPassword) {
    return app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  }

  describe('GET /api/auth/users', () => {
    it('returns user list without auth', async () => {
      const res = await app.request('/api/auth/users')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(1)
      expect(body[0].username).toBe('testuser')
      expect(body[0].displayName).toBe('Test User')
      expect(body[0].role).toBe('submitter')
    })
  })

  describe('POST /api/auth/login', () => {
    it('returns user and sets cookie on valid credentials', async () => {
      const res = await login()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.username).toBe('testuser')
      expect(body.displayName).toBe('Test User')
      expect(body.role).toBe('submitter')
      expect(body.id).toBe('u-test-00000000-0000-0000-000000000001')

      const setCookie = res.headers.get('set-cookie')
      expect(setCookie).toContain('ticketflow-session=')
    })

    it('returns 400 when username is missing', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'x' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('returns 400 when password is missing', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('returns 401 for wrong password', async () => {
      const res = await login('testuser', 'wrong')
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('密码错误')
    })

    it('returns 401 for non-existent username', async () => {
      const res = await login('nonexistent', 'any')
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns current user with valid session', async () => {
      const loginRes = await login()
      const cookie = loginRes.headers.get('set-cookie')!

      const res = await app.request('/api/auth/me', {
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.username).toBe('testuser')
      expect(body).not.toHaveProperty('passwordHash')
    })

    it('returns 401 without session cookie', async () => {
      const res = await app.request('/api/auth/me')
      expect(res.status).toBe(401)
    })

    it('returns 401 with invalid session cookie', async () => {
      const res = await app.request('/api/auth/me', {
        headers: { Cookie: 'ticketflow-session=invalid-session-id' },
      })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('destroys session and clears cookie', async () => {
      const loginRes = await login()
      const cookie = loginRes.headers.get('set-cookie')!

      const res = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: cookie },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)

      // Subsequent me request should fail
      const meRes = await app.request('/api/auth/me', {
        headers: { Cookie: cookie },
      })
      expect(meRes.status).toBe(401)
    })

    it('returns 401 without session cookie', async () => {
      const res = await app.request('/api/auth/logout', { method: 'POST' })
      expect(res.status).toBe(401)
    })
  })
})

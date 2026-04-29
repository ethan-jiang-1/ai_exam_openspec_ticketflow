import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp } from './helpers'
import { users } from '../db/schema'
import { sessionStore } from '../lib/sessions'

const { app, db } = createTestApp()

const testUser = {
  id: 'u-test-00000000-0000-0000-000000000001',
  username: 'testuser',
  displayName: 'Test User',
  role: 'submitter',
  createdAt: new Date().toISOString(),
}

describe('Auth API', () => {
  beforeEach(async () => {
    sessionStore.clear()
    await db.delete(users)
    await db.insert(users).values(testUser)
  })

  // Helper: login and return Set-Cookie header
  async function login(username: string = 'testuser') {
    return app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
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
    it('returns user and sets cookie on valid username', async () => {
      const res = await login()
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.username).toBe('testuser')
      expect(body.displayName).toBe('Test User')
      expect(body.role).toBe('submitter')
      expect(body.id).toBe(testUser.id)

      const setCookie = res.headers.get('set-cookie')
      expect(setCookie).toContain('ticketflow-session=')
    })

    it('returns 400 when username is missing', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('returns 401 for non-existent username', async () => {
      const res = await login('nonexistent')
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

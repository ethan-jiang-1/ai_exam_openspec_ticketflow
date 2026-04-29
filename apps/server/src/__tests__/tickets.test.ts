import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp } from './helpers'
import { tickets, users } from '../db/schema'
import { sessionStore } from '../lib/sessions'

const { app, db } = createTestApp()

const testSubmitter = {
  id: 'u-test-00000000-0000-0000-000000000001',
  username: 'submitter',
  displayName: 'Test Submitter',
  role: 'submitter',
  createdAt: new Date().toISOString(),
}

describe('Tickets API', () => {
  let cookie: string

  beforeEach(async () => {
    sessionStore.clear()
    await db.delete(tickets)
    await db.delete(users)
    await db.insert(users).values(testSubmitter)

    // Login to get session cookie
    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'submitter' }),
    })
    cookie = loginRes.headers.get('set-cookie')!
  })

  const headers = () => ({ Cookie: cookie, 'Content-Type': 'application/json' })

  const createTicket = async (overrides?: Record<string, string>) => {
    const body = { title: 'Test ticket', description: 'Test description', ...overrides }
    return app.request('/api/tickets', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    })
  }

  describe('POST /api/tickets', () => {
    it('should create a ticket and return 201', async () => {
      const res = await createTicket()
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/)
      expect(body.status).toBe('submitted')
      expect(body.assignedTo).toBeNull()
      expect(body.createdBy).toBe('submitter')
      expect(body.title).toBe('Test ticket')
      expect(body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(body.updatedAt).toBe(body.createdAt)
    })

    it('should reject empty title with 400', async () => {
      const res = await createTicket({ title: '' })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should reject title exceeding 200 characters with 400', async () => {
      const res = await createTicket({ title: 'A'.repeat(201) })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should reject description exceeding 2000 characters with 400', async () => {
      const res = await createTicket({ description: 'B'.repeat(2001) })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should ignore createdBy in body and use auth user', async () => {
      const res = await createTicket({ createdBy: 'someone_else' })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.createdBy).toBe('submitter')
    })
  })

  describe('GET /api/tickets', () => {
    it('should return an empty array', async () => {
      const res = await app.request('/api/tickets', { headers: headers() })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual([])
    })

    it('should return all tickets', async () => {
      await createTicket({ title: 'Ticket 1' })
      await createTicket({ title: 'Ticket 2' })
      const res = await app.request('/api/tickets', { headers: headers() })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(2)
    })
  })

  describe('GET /api/tickets/:id', () => {
    it('should return a ticket by ID', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}`, { headers: headers() })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.id).toBe(created.id)
      expect(body.title).toBe('Test ticket')
    })

    it('should return 404 for non-existent ID', async () => {
      const res = await app.request('/api/tickets/non-existent-id', { headers: headers() })
      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })
  })

  describe('PATCH /api/tickets/:id/assign', () => {
    it('should assign a submitted ticket', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('assigned')
      expect(body.assignedTo).toBe('completer')
      expect(body.updatedAt).not.toBe(body.createdAt)
    })

    it('should reject assign for non-submitted status', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      const res = await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ assignedTo: 'other' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should return 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/assign', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/tickets/:id/start', () => {
    it('should start an assigned ticket', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      const res = await app.request(`/api/tickets/${created.id}/start`, {
        method: 'PATCH',
        headers: headers(),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('in_progress')
    })

    it('should reject start for submitted ticket', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}/start`, {
        method: 'PATCH',
        headers: headers(),
      })
      expect(res.status).toBe(400)
    })

    it('should return 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/start', {
        method: 'PATCH',
        headers: headers(),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/tickets/:id/complete', () => {
    it('should complete an in_progress ticket', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      await app.request(`/api/tickets/${created.id}/start`, {
        method: 'PATCH',
        headers: headers(),
      })
      const res = await app.request(`/api/tickets/${created.id}/complete`, {
        method: 'PATCH',
        headers: headers(),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('completed')
    })

    it('should reject complete for assigned ticket', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      const res = await app.request(`/api/tickets/${created.id}/complete`, {
        method: 'PATCH',
        headers: headers(),
      })
      expect(res.status).toBe(400)
    })

    it('should return 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/complete', {
        method: 'PATCH',
        headers: headers(),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('Auth guard', () => {
    it('should return 401 for all ticket endpoints without session', async () => {
      const endpoints = [
        { method: 'GET', path: '/api/tickets' },
        { method: 'GET', path: '/api/tickets/some-id' },
        { method: 'POST', path: '/api/tickets' },
        { method: 'PATCH', path: '/api/tickets/some-id/assign' },
        { method: 'PATCH', path: '/api/tickets/some-id/start' },
        { method: 'PATCH', path: '/api/tickets/some-id/complete' },
      ]
      for (const ep of endpoints) {
        const res = await app.request(ep.path, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          body: ep.method === 'GET' ? undefined : '{}',
        })
        expect(res.status).toBe(401)
      }
    })
  })
})

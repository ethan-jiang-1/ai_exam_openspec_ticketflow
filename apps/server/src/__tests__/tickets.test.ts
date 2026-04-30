import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp } from './helpers'
import { tickets, users } from '../db/schema'
import { sessionStore } from '../lib/sessions'
import { hashPassword } from '../lib/password'

const { app, db } = createTestApp()

async function seedUser(id: string, username: string, displayName: string, role: string, password: string) {
  await db.insert(users).values({
    id,
    username,
    displayName,
    role,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  })
}

async function loginAs(username: string): Promise<string> {
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'testpass' }),
  })
  return res.headers.get('set-cookie')!
}

describe('Tickets API', () => {
  let submitterCookie: string
  let dispatcherCookie: string
  let completerCookie: string

  beforeEach(async () => {
    sessionStore.clear()
    await db.delete(tickets)
    await db.delete(users)
    await seedUser('u-test-00000000-0000-0000-000000000001', 'submitter', 'Test Submitter', 'submitter', 'testpass')
    await seedUser('u-test-00000000-0000-0000-000000000002', 'dispatcher', 'Test Dispatcher', 'dispatcher', 'testpass')
    await seedUser('u-test-00000000-0000-0000-000000000003', 'completer', 'Test Completer', 'completer', 'testpass')
    submitterCookie = await loginAs('submitter')
    dispatcherCookie = await loginAs('dispatcher')
    completerCookie = await loginAs('completer')
  })

  const submitterHeaders = () => ({ Cookie: submitterCookie, 'Content-Type': 'application/json' })
  const dispatcherHeaders = () => ({ Cookie: dispatcherCookie, 'Content-Type': 'application/json' })
  const completerHeaders = () => ({ Cookie: completerCookie, 'Content-Type': 'application/json' })

  const createTicket = async (overrides?: Record<string, string>) => {
    const body = { title: 'Test ticket', description: 'Test description', ...overrides }
    return app.request('/api/tickets', {
      method: 'POST',
      headers: submitterHeaders(),
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

    it('should create ticket with priority and dueDate', async () => {
      const res = await createTicket({ priority: 'high', dueDate: '2026-06-01' })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.priority).toBe('high')
      expect(body.dueDate).toBe('2026-06-01')
    })

    it('should default priority to medium and dueDate to null', async () => {
      const res = await createTicket()
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.priority).toBe('medium')
      expect(body.dueDate).toBeNull()
    })

    it('should reject invalid priority with 400', async () => {
      const res = await createTicket({ priority: 'urgent' })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/priority/i)
    })

    it('should reject invalid dueDate with 400', async () => {
      const res = await createTicket({ dueDate: 'not-a-date' })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/dueDate/i)
    })
  })

  describe('GET /api/tickets', () => {
    it('should return an empty array', async () => {
      const res = await app.request('/api/tickets', { headers: submitterHeaders() })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual([])
    })

    it('should return all tickets', async () => {
      await createTicket({ title: 'Ticket 1' })
      await createTicket({ title: 'Ticket 2' })
      const res = await app.request('/api/tickets', { headers: submitterHeaders() })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(2)
    })
  })

  describe('GET /api/tickets/:id', () => {
    it('should return a ticket by ID', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}`, { headers: submitterHeaders() })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.id).toBe(created.id)
      expect(body.title).toBe('Test ticket')
    })

    it('should return 404 for non-existent ID', async () => {
      const res = await app.request('/api/tickets/non-existent-id', { headers: submitterHeaders() })
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
        headers: dispatcherHeaders(),
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
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      const res = await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'other' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should return 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/assign', {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      expect(res.status).toBe(404)
    })

    it('should reject assigning to non-existent user with 400', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'nobody' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toEqual({ error: '指派目标用户不存在' })
    })
  })

  describe('PATCH /api/tickets/:id/start', () => {
    it('should start an assigned ticket', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      const res = await app.request(`/api/tickets/${created.id}/start`, {
        method: 'PATCH',
        headers: completerHeaders(),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('in_progress')
    })

    it('should reject start for submitted ticket', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}/start`, {
        method: 'PATCH',
        headers: completerHeaders(),
      })
      expect(res.status).toBe(400)
    })

    it('should return 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/start', {
        method: 'PATCH',
        headers: completerHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/tickets/:id/complete', () => {
    it('should complete an in_progress ticket', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      await app.request(`/api/tickets/${created.id}/start`, {
        method: 'PATCH',
        headers: completerHeaders(),
      })
      const res = await app.request(`/api/tickets/${created.id}/complete`, {
        method: 'PATCH',
        headers: completerHeaders(),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('completed')
    })

    it('should reject complete for assigned ticket', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      const res = await app.request(`/api/tickets/${created.id}/complete`, {
        method: 'PATCH',
        headers: completerHeaders(),
      })
      expect(res.status).toBe(400)
    })

    it('should return 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/complete', {
        method: 'PATCH',
        headers: completerHeaders(),
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

  describe('Permission guard (403)', () => {
    it('submitter cannot assign tickets', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: submitterHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body).toEqual({ error: '权限不足' })
    })

    it('submitter cannot start tickets', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}/start`, {
        method: 'PATCH',
        headers: submitterHeaders(),
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body).toEqual({ error: '权限不足' })
    })

    it('dispatcher cannot create tickets', async () => {
      const res = await app.request('/api/tickets', {
        method: 'POST',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ title: 'Hack', description: 'Should fail' }),
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body).toEqual({ error: '权限不足' })
    })

    it('dispatcher cannot complete tickets', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      await app.request(`/api/tickets/${created.id}/start`, {
        method: 'PATCH',
        headers: completerHeaders(),
      })
      const res = await app.request(`/api/tickets/${created.id}/complete`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body).toEqual({ error: '权限不足' })
    })

    it('completer cannot create tickets', async () => {
      const res = await app.request('/api/tickets', {
        method: 'POST',
        headers: completerHeaders(),
        body: JSON.stringify({ title: 'Hack', description: 'Should fail' }),
      })
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body).toEqual({ error: '权限不足' })
    })
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestApp } from './helpers'
import { tickets, ticketHistory, users } from '../db/schema'
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
    await db.delete(ticketHistory)
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
      expect(new Date(body.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(body.createdAt).getTime())
    })

    it('should reassign an assigned ticket to a different user', async () => {
      await seedUser('u-test-00000000-0000-0000-000000000004', 'completer2', 'Test Completer2', 'completer', 'testpass')
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      const res = await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer2' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('assigned')
      expect(body.assignedTo).toBe('completer2')
    })

    it('should reject assign for in_progress status', async () => {
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
      const res = await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
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

    it('should reject assigning to same user with 400', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      const res = await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toEqual({ error: '工单已指派给该用户' })
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

  describe('ticket_history writes', () => {
    it('should write created event with content snapshot on POST /api/tickets', async () => {
      const res = await createTicket()
      const ticket = await res.json()
      const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, ticket.id))
      expect(history).toHaveLength(1)
      expect(history[0].action).toBe('created')
      expect(history[0].actor).toBe('submitter')
      expect(history[0].fromStatus).toBeNull()
      expect(history[0].toStatus).toBe('submitted')
      const details = JSON.parse(history[0].details!)
      expect(details.title).toBe('Test ticket')
      expect(details.description).toBe('Test description')
      expect(details.priority).toBe('medium')
      expect(details.dueDate).toBeNull()
    })

    it('should store default priority in created snapshot', async () => {
      const res = await app.request('/api/tickets', {
        method: 'POST',
        headers: submitterHeaders(),
        body: JSON.stringify({ title: 'Minimal', description: 'test' }),
      })
      const ticket = await res.json()
      const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, ticket.id))
      const details = JSON.parse(history[0].details!)
      expect(details.priority).toBe('medium')
      expect(details.dueDate).toBeNull()
    })

    it('should write assigned event on first assign', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, created.id))
      const assignEntry = history.find((h) => h.action === 'assigned')
      expect(assignEntry).toBeDefined()
      expect(assignEntry!.actor).toBe('dispatcher')
      expect(assignEntry!.fromStatus).toBe('submitted')
      expect(assignEntry!.toStatus).toBe('assigned')
    })

    it('should write reassigned event on reassign', async () => {
      await seedUser('u-test-00000000-0000-0000-000000000004', 'completer2', 'Test Completer2', 'completer', 'testpass')
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer2' }),
      })
      const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, created.id))
      const reassignEntry = history.find((h) => h.action === 'reassigned')
      expect(reassignEntry).toBeDefined()
      expect(reassignEntry!.fromStatus).toBe('assigned')
      expect(reassignEntry!.toStatus).toBe('assigned')
      const details = JSON.parse(reassignEntry!.details!)
      expect(details.assignee).toBe('completer2')
      expect(details.prevAssignee).toBe('completer')
    })

    it('should write started event on start', async () => {
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
      const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, created.id))
      const startEntry = history.find((h) => h.action === 'started')
      expect(startEntry).toBeDefined()
      expect(startEntry!.actor).toBe('completer')
      expect(startEntry!.fromStatus).toBe('assigned')
      expect(startEntry!.toStatus).toBe('in_progress')
    })

    it('should write completed event on complete', async () => {
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
      await app.request(`/api/tickets/${created.id}/complete`, {
        method: 'PATCH',
        headers: completerHeaders(),
      })
      const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, created.id))
      const completeEntry = history.find((h) => h.action === 'completed')
      expect(completeEntry).toBeDefined()
      expect(completeEntry!.actor).toBe('completer')
      expect(completeEntry!.fromStatus).toBe('in_progress')
      expect(completeEntry!.toStatus).toBe('completed')
    })

    it('should NOT write history on failed operation', async () => {
      const res = await app.request('/api/tickets', {
        method: 'POST',
        headers: submitterHeaders(),
        body: JSON.stringify({ title: '' }),
      })
      expect(res.status).toBe(400)
      const allHistory = await db.select().from(ticketHistory)
      expect(allHistory).toHaveLength(0)
    })
  })

  describe('GET /api/tickets/:id/history', () => {
    it('should return full timeline in createdAt ascending order', async () => {
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
      await app.request(`/api/tickets/${created.id}/complete`, {
        method: 'PATCH',
        headers: completerHeaders(),
      })
      const res = await app.request(`/api/tickets/${created.id}/history`, {
        headers: submitterHeaders(),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(4)
      expect(body[0].action).toBe('created')
      expect(body[3].action).toBe('completed')
      // Check ascending order
      for (let i = 1; i < body.length; i++) {
        expect(new Date(body[i].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(body[i - 1].createdAt).getTime())
      }
    })

    it('should return empty array when ticket has no history', async () => {
      const created = await (await createTicket()).json()
      // Delete all history to simulate empty case
      await db.delete(ticketHistory).where(eq(ticketHistory.ticketId, created.id))
      const res = await app.request(`/api/tickets/${created.id}/history`, {
        headers: submitterHeaders(),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual([])
    })

    it('should return 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/history', {
        headers: submitterHeaders(),
      })
      expect(res.status).toBe(404)
    })

    it('should return 401 without session', async () => {
      const res = await app.request('/api/tickets/some-id/history')
      expect(res.status).toBe(401)
    })
  })

  describe('Auth guard', () => {
    it('should return 401 for all ticket endpoints without session', async () => {
      const endpoints = [
        { method: 'GET', path: '/api/tickets' },
        { method: 'GET', path: '/api/tickets/some-id' },
        { method: 'GET', path: '/api/tickets/some-id/history' },
        { method: 'POST', path: '/api/tickets' },
        { method: 'PATCH', path: '/api/tickets/some-id/assign' },
        { method: 'PATCH', path: '/api/tickets/some-id/start' },
        { method: 'PATCH', path: '/api/tickets/some-id/complete' },
        { method: 'PATCH', path: '/api/tickets/some-id' },
        { method: 'POST', path: '/api/tickets/some-id/comments' },
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

  describe('PATCH /api/tickets/:id — edit ticket', () => {
    it('submitter can edit title in submitted status', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}`, {
        method: 'PATCH',
        headers: submitterHeaders(),
        body: JSON.stringify({ title: 'Updated title' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.title).toBe('Updated title')

      // Verify history
      const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, created.id))
      const editEntry = history.find((h) => h.action === 'edited')
      expect(editEntry).toBeDefined()
      expect(editEntry!.actor).toBe('submitter')
      expect(editEntry!.fromStatus).toBe('submitted')
      expect(editEntry!.toStatus).toBe('submitted')
      const details = JSON.parse(editEntry!.details!)
      expect(details.field).toBe('title')
      expect(details.oldValue).toBe('Test ticket')
      expect(details.newValue).toBe('Updated title')
    })

    it('returns 401 without session', async () => {
      const res = await app.request('/api/tickets/some-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'X' }),
      })
      expect(res.status).toBe(401)
    })

    it('non-submitter cannot edit ticket (403)', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ title: 'Hack' }),
      })
      expect(res.status).toBe(403)
    })

    it('cannot edit ticket not in submitted status (400)', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ assignedTo: 'completer' }),
      })
      const res = await app.request(`/api/tickets/${created.id}`, {
        method: 'PATCH',
        headers: submitterHeaders(),
        body: JSON.stringify({ title: 'Try' }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects empty title (400)', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}`, {
        method: 'PATCH',
        headers: submitterHeaders(),
        body: JSON.stringify({ title: '' }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects empty body (400)', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}`, {
        method: 'PATCH',
        headers: submitterHeaders(),
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
    })

    it('rejects invalid priority (400)', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}`, {
        method: 'PATCH',
        headers: submitterHeaders(),
        body: JSON.stringify({ priority: 'urgent' }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects title exceeding 200 chars (400)', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}`, {
        method: 'PATCH',
        headers: submitterHeaders(),
        body: JSON.stringify({ title: 'A'.repeat(201) }),
      })
      expect(res.status).toBe(400)
    })

    it('writes multiple history entries for multi-field edit', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}`, {
        method: 'PATCH',
        headers: submitterHeaders(),
        body: JSON.stringify({ title: 'New title', priority: 'high' }),
      })
      expect(res.status).toBe(200)
      const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, created.id))
      const editEntries = history.filter((h) => h.action === 'edited')
      expect(editEntries).toHaveLength(2)
    })

    it('does not write history when no field changed', async () => {
      const created = await (await createTicket()).json()
      const historyBefore = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, created.id))
      const res = await app.request(`/api/tickets/${created.id}`, {
        method: 'PATCH',
        headers: submitterHeaders(),
        body: JSON.stringify({ title: 'Test ticket' }),
      })
      expect(res.status).toBe(200)
      const historyAfter = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, created.id))
      expect(historyAfter).toHaveLength(historyBefore.length)
    })

    it('returns 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id', {
        method: 'PATCH',
        headers: submitterHeaders(),
        body: JSON.stringify({ title: 'X' }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/tickets/:id/comments — add comment', () => {
    it('can add comment to a ticket', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}/comments`, {
        method: 'POST',
        headers: dispatcherHeaders(),
        body: JSON.stringify({ comment: '已确认问题，正在修复' }),
      })
      expect(res.status).toBe(201)

      const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, created.id))
      const commentEntry = history.find((h) => h.action === 'commented')
      expect(commentEntry).toBeDefined()
      expect(commentEntry!.actor).toBe('dispatcher')
      expect(commentEntry!.fromStatus).toBe('submitted')
      expect(commentEntry!.toStatus).toBe('submitted')
      const details = JSON.parse(commentEntry!.details!)
      expect(details.comment).toBe('已确认问题，正在修复')
    })

    it('rejects empty comment (400)', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}/comments`, {
        method: 'POST',
        headers: submitterHeaders(),
        body: JSON.stringify({ comment: '' }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects comment exceeding 2000 chars (400)', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}/comments`, {
        method: 'POST',
        headers: submitterHeaders(),
        body: JSON.stringify({ comment: 'C'.repeat(2001) }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 401 without session', async () => {
      const res = await app.request('/api/tickets/some-id/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'test' }),
      })
      expect(res.status).toBe(401)
    })

    it('returns 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/comments', {
        method: 'POST',
        headers: submitterHeaders(),
        body: JSON.stringify({ comment: 'test' }),
      })
      expect(res.status).toBe(404)
    })

    it('does not modify tickets table', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/comments`, {
        method: 'POST',
        headers: submitterHeaders(),
        body: JSON.stringify({ comment: 'test' }),
      })
      const ticket = await db.select().from(tickets).where(eq(tickets.id, created.id))
      expect(ticket[0].updatedAt).toBe(created.updatedAt)
    })
  })
})

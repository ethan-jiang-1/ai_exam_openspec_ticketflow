import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp } from './helpers'
import { tickets } from '../db/schema'

const { app, db } = createTestApp()

describe('Tickets API', () => {
  beforeEach(async () => {
    await db.delete(tickets)
  })

  // Helper: create a ticket
  const createTicket = async (overrides?: Record<string, string>) => {
    const body = { title: 'Test ticket', description: 'Test description', createdBy: 'alice', ...overrides }
    return app.request('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  }

  describe('POST /api/tickets', () => {
    it('should create a ticket and return 201', async () => {
      const res = await createTicket()
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/)
      expect(body.status).toBe('submitted')
      expect(body.assignedTo).toBeNull()
      expect(body.createdBy).toBe('alice')
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

    it('should reject empty createdBy with 400', async () => {
      const res = await createTicket({ createdBy: '' })
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
  })

  describe('GET /api/tickets', () => {
    it('should return an empty array', async () => {
      const res = await app.request('/api/tickets')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual([])
    })

    it('should return all tickets', async () => {
      await createTicket({ title: 'Ticket 1' })
      await createTicket({ title: 'Ticket 2' })
      const res = await app.request('/api/tickets')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toHaveLength(2)
    })
  })

  describe('GET /api/tickets/:id', () => {
    it('should return a ticket by ID', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}`)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.id).toBe(created.id)
      expect(body.title).toBe('Test ticket')
    })

    it('should return 404 for non-existent ID', async () => {
      const res = await app.request('/api/tickets/non-existent-id')
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: 'bob' }),
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('assigned')
      expect(body.assignedTo).toBe('bob')
      expect(body.updatedAt).not.toBe(body.createdAt)
    })

    it('should reject assign for non-submitted status', async () => {
      const created = await (await createTicket()).json()
      // Assign first
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: 'bob' }),
      })
      // Try assign again
      const res = await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: 'charlie' }),
      })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should return 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/assign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: 'bob' }),
      })
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/tickets/:id/start', () => {
    it('should start an assigned ticket', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: 'bob' }),
      })
      const res = await app.request(`/api/tickets/${created.id}/start`, { method: 'PATCH' })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('in_progress')
    })

    it('should reject start for submitted ticket', async () => {
      const created = await (await createTicket()).json()
      const res = await app.request(`/api/tickets/${created.id}/start`, { method: 'PATCH' })
      expect(res.status).toBe(400)
    })

    it('should return 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/start', { method: 'PATCH' })
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/tickets/:id/complete', () => {
    it('should complete an in_progress ticket', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: 'bob' }),
      })
      await app.request(`/api/tickets/${created.id}/start`, { method: 'PATCH' })
      const res = await app.request(`/api/tickets/${created.id}/complete`, { method: 'PATCH' })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('completed')
    })

    it('should reject complete for assigned ticket', async () => {
      const created = await (await createTicket()).json()
      await app.request(`/api/tickets/${created.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: 'bob' }),
      })
      const res = await app.request(`/api/tickets/${created.id}/complete`, { method: 'PATCH' })
      expect(res.status).toBe(400)
    })

    it('should return 404 for non-existent ticket', async () => {
      const res = await app.request('/api/tickets/non-existent-id/complete', { method: 'PATCH' })
      expect(res.status).toBe(404)
    })
  })
})

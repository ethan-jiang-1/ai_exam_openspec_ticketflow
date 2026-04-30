import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { tickets } from '../db/schema'
import type { TicketStatus } from '@ticketflow/shared'
import type { AuthVariables } from '../db/types'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../lib/permissions'

const ticketsRoute = new Hono<AuthVariables>()

// GET /api/tickets
ticketsRoute.get('/', requireAuth, async (c) => {
  const db = c.get('db')
  const result = await db.select().from(tickets)
  return c.json(result)
})

// GET /api/tickets/:id
ticketsRoute.get('/:id', requireAuth, async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const result = await db.select().from(tickets).where(eq(tickets.id, id))
  if (result.length === 0) {
    return c.json({ error: 'Ticket not found' }, 404)
  }
  return c.json(result[0])
})

// POST /api/tickets
ticketsRoute.post('/', requireAuth, requirePermission('ticket:create'), async (c) => {
  const db = c.get('db')
  const user = c.get('user')!
  const body = await c.req.json<{ title?: string; description?: string }>()

  if (!body.title || body.title.trim() === '') {
    return c.json({ error: 'title is required' }, 400)
  }
  if (body.title.length > 200) {
    return c.json({ error: 'title must be at most 200 characters' }, 400)
  }
  if (body.description && body.description.length > 2000) {
    return c.json({ error: 'description must be at most 2000 characters' }, 400)
  }

  const now = new Date().toISOString()
  const newTicket = {
    id: crypto.randomUUID(),
    title: body.title,
    description: body.description ?? '',
    status: 'submitted' satisfies TicketStatus,
    createdBy: user.username,
    assignedTo: null,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(tickets).values(newTicket)
  return c.json(newTicket, 201)
})

// PATCH /api/tickets/:id/assign
ticketsRoute.patch('/:id/assign', requireAuth, requirePermission('ticket:assign'), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const existing = await db.select().from(tickets).where(eq(tickets.id, id))

  if (existing.length === 0) {
    return c.json({ error: 'Ticket not found' }, 404)
  }

  const ticket = existing[0]
  if (ticket.status !== 'submitted') {
    return c.json({ error: `Cannot assign ticket in status "${ticket.status}"` }, 400)
  }

  const body = await c.req.json<{ assignedTo?: string }>()
  const now = new Date().toISOString()

  await db
    .update(tickets)
    .set({ status: 'assigned', assignedTo: body.assignedTo ?? null, updatedAt: now })
    .where(eq(tickets.id, id))

  return c.json({ ...ticket, status: 'assigned', assignedTo: body.assignedTo ?? null, updatedAt: now })
})

// PATCH /api/tickets/:id/start
ticketsRoute.patch('/:id/start', requireAuth, requirePermission('ticket:start'), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const existing = await db.select().from(tickets).where(eq(tickets.id, id))

  if (existing.length === 0) {
    return c.json({ error: 'Ticket not found' }, 404)
  }

  const ticket = existing[0]
  if (ticket.status !== 'assigned') {
    return c.json({ error: `Cannot start ticket in status "${ticket.status}"` }, 400)
  }

  const now = new Date().toISOString()
  await db.update(tickets).set({ status: 'in_progress', updatedAt: now }).where(eq(tickets.id, id))

  return c.json({ ...ticket, status: 'in_progress', updatedAt: now })
})

// PATCH /api/tickets/:id/complete
ticketsRoute.patch('/:id/complete', requireAuth, requirePermission('ticket:complete'), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const existing = await db.select().from(tickets).where(eq(tickets.id, id))

  if (existing.length === 0) {
    return c.json({ error: 'Ticket not found' }, 404)
  }

  const ticket = existing[0]
  if (ticket.status !== 'in_progress') {
    return c.json({ error: `Cannot complete ticket in status "${ticket.status}"` }, 400)
  }

  const now = new Date().toISOString()
  await db.update(tickets).set({ status: 'completed', updatedAt: now }).where(eq(tickets.id, id))

  return c.json({ ...ticket, status: 'completed', updatedAt: now })
})

export default ticketsRoute

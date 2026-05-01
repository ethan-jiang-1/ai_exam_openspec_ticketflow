import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { tickets, ticketHistory, users } from '../db/schema'
import { PRIORITIES, type TicketStatus } from '@ticketflow/shared'
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

// GET /api/tickets/:id/history
ticketsRoute.get('/:id/history', requireAuth, async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const ticketResult = await db.select().from(tickets).where(eq(tickets.id, id))
  if (ticketResult.length === 0) {
    return c.json({ error: 'Ticket not found' }, 404)
  }
  const history = await db
    .select()
    .from(ticketHistory)
    .where(eq(ticketHistory.ticketId, id))
  history.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return c.json(history)
})

// POST /api/tickets
ticketsRoute.post('/', requireAuth, requirePermission('ticket:create'), async (c) => {
  const db = c.get('db')
  const user = c.get('user')!
  const body = await c.req.json<{ title?: string; description?: string; priority?: string; dueDate?: string }>()

  if (!body.title || body.title.trim() === '') {
    return c.json({ error: 'title is required' }, 400)
  }
  if (body.title.length > 200) {
    return c.json({ error: 'title must be at most 200 characters' }, 400)
  }
  if (body.description && body.description.length > 2000) {
    return c.json({ error: 'description must be at most 2000 characters' }, 400)
  }

  const priority = body.priority || 'medium'
  const validPriorities = Object.values(PRIORITIES) as string[]
  if (!validPriorities.includes(priority)) {
    return c.json({ error: 'priority must be one of: low, medium, high' }, 400)
  }

  const dueDate = body.dueDate ?? null
  if (dueDate !== null && isNaN(Date.parse(dueDate))) {
    return c.json({ error: 'dueDate must be a valid date' }, 400)
  }

  const now = new Date().toISOString()
  const newTicket = {
    id: crypto.randomUUID(),
    title: body.title,
    description: body.description ?? '',
    status: 'submitted' satisfies TicketStatus,
    priority,
    dueDate,
    createdBy: user.username,
    assignedTo: null as string | null,
    createdAt: now,
    updatedAt: now,
  }

  await db.insert(tickets).values(newTicket)

  await db.insert(ticketHistory).values({
    id: crypto.randomUUID(),
    ticketId: newTicket.id,
    action: 'created',
    actor: user.username,
    fromStatus: null,
    toStatus: 'submitted',
    details: JSON.stringify({
      title: newTicket.title,
      description: newTicket.description,
      priority: newTicket.priority,
      dueDate: newTicket.dueDate,
    }),
    createdAt: now,
  })

  return c.json(newTicket, 201)
})

// PATCH /api/tickets/:id/assign
ticketsRoute.patch('/:id/assign', requireAuth, requirePermission('ticket:assign'), async (c) => {
  const db = c.get('db')
  const user = c.get('user')!
  const id = c.req.param('id')
  const existing = await db.select().from(tickets).where(eq(tickets.id, id))

  if (existing.length === 0) {
    return c.json({ error: 'Ticket not found' }, 404)
  }

  const ticket = existing[0]
  if (ticket.status !== 'submitted' && ticket.status !== 'assigned') {
    return c.json({ error: `Cannot assign ticket in status "${ticket.status}"` }, 400)
  }

  const body = await c.req.json<{ assignedTo?: string }>()
  const assignedTo = body.assignedTo ?? null

  if (assignedTo) {
    const targetUser = await db.select().from(users).where(eq(users.username, assignedTo))
    if (targetUser.length === 0) {
      return c.json({ error: '指派目标用户不存在' }, 400)
    }
  }

  if (ticket.status === 'assigned' && ticket.assignedTo === assignedTo) {
    return c.json({ error: '工单已指派给该用户' }, 400)
  }

  const now = new Date().toISOString()

  await db
    .update(tickets)
    .set({ status: 'assigned', assignedTo, updatedAt: now })
    .where(eq(tickets.id, id))

  const isReassign = ticket.status === 'assigned'
  await db.insert(ticketHistory).values({
    id: crypto.randomUUID(),
    ticketId: id,
    action: isReassign ? 'reassigned' : 'assigned',
    actor: user.username,
    fromStatus: isReassign ? 'assigned' : 'submitted',
    toStatus: 'assigned',
    details: isReassign
      ? JSON.stringify({ assignee: assignedTo, prevAssignee: ticket.assignedTo })
      : JSON.stringify({ assignee: assignedTo }),
    createdAt: now,
  })

  return c.json({ ...ticket, status: 'assigned', assignedTo, updatedAt: now })
})

// PATCH /api/tickets/:id/start
ticketsRoute.patch('/:id/start', requireAuth, requirePermission('ticket:start'), async (c) => {
  const db = c.get('db')
  const user = c.get('user')!
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

  await db.insert(ticketHistory).values({
    id: crypto.randomUUID(),
    ticketId: id,
    action: 'started',
    actor: user.username,
    fromStatus: 'assigned',
    toStatus: 'in_progress',
    details: null,
    createdAt: now,
  })

  return c.json({ ...ticket, status: 'in_progress', updatedAt: now })
})

// PATCH /api/tickets/:id/complete
ticketsRoute.patch('/:id/complete', requireAuth, requirePermission('ticket:complete'), async (c) => {
  const db = c.get('db')
  const user = c.get('user')!
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

  await db.insert(ticketHistory).values({
    id: crypto.randomUUID(),
    ticketId: id,
    action: 'completed',
    actor: user.username,
    fromStatus: 'in_progress',
    toStatus: 'completed',
    details: null,
    createdAt: now,
  })

  return c.json({ ...ticket, status: 'completed', updatedAt: now })
})

// PATCH /api/tickets/:id — 编辑工单字段
ticketsRoute.patch('/:id', requireAuth, async (c) => {
  const db = c.get('db')
  const user = c.get('user')!
  const id = c.req.param('id')

  const existing = await db.select().from(tickets).where(eq(tickets.id, id))
  if (existing.length === 0) {
    return c.json({ error: 'Ticket not found' }, 404)
  }

  const ticket = existing[0]

  // 仅 submitter（createdBy===user.username）可编辑
  if (ticket.createdBy !== user.username) {
    return c.json({ error: '仅工单提交者可编辑' }, 403)
  }

  // 仅在 submitted 状态可编辑
  if (ticket.status !== 'submitted') {
    return c.json({ error: '仅在"已提交"状态下可编辑工单' }, 400)
  }

  const body = await c.req.json<{ title?: string; description?: string; priority?: string; dueDate?: string }>()

  // 空 body 检查
  const fields = ['title', 'description', 'priority', 'dueDate'] as const
  const providedFields = fields.filter((f) => body[f] !== undefined)
  if (providedFields.length === 0) {
    return c.json({ error: 'no fields to update' }, 400)
  }

  // title 校验
  if (body.title !== undefined) {
    if (body.title.trim() === '') {
      return c.json({ error: 'title must not be empty' }, 400)
    }
    if (body.title.length > 200) {
      return c.json({ error: 'title must be at most 200 characters' }, 400)
    }
  }

  // description 校验
  if (body.description !== undefined && body.description.length > 2000) {
    return c.json({ error: 'description must be at most 2000 characters' }, 400)
  }

  // priority 校验
  if (body.priority !== undefined) {
    const validPriorities = Object.values(PRIORITIES) as string[]
    if (!validPriorities.includes(body.priority)) {
      return c.json({ error: 'priority must be one of: low, medium, high' }, 400)
    }
  }

  // dueDate 校验
  if (body.dueDate !== undefined && body.dueDate !== null && isNaN(Date.parse(body.dueDate))) {
    return c.json({ error: 'dueDate must be a valid date' }, 400)
  }

  const now = new Date().toISOString()
  const updated: Record<string, unknown> = {}

  // 仅更新实际变更的字段
  for (const field of fields) {
    if (body[field] !== undefined) {
      const newValue = field === 'dueDate' ? (body[field] ?? null) : body[field]
      const oldValue = (ticket as Record<string, unknown>)[field]
      // dueDate 特殊处理：null vs undefined
      const effectiveOld = field === 'dueDate' ? (oldValue ?? null) : oldValue
      const effectiveNew = field === 'dueDate' ? (newValue ?? null) : newValue

      if (String(effectiveOld) !== String(effectiveNew)) {
        const jsField = field
        updated[jsField] = newValue

        await db.insert(ticketHistory).values({
          id: crypto.randomUUID(),
          ticketId: id,
          action: 'edited',
          actor: user.username,
          fromStatus: ticket.status,
          toStatus: ticket.status,
          details: JSON.stringify({ field, oldValue: effectiveOld, newValue: effectiveNew }),
          createdAt: now,
        })
      }
    }
  }

  if (Object.keys(updated).length > 0) {
    await db.update(tickets).set({ ...updated, updatedAt: now }).where(eq(tickets.id, id))
  }

  const result = await db.select().from(tickets).where(eq(tickets.id, id))
  return c.json(result[0])
})

// POST /api/tickets/:id/comments — 添加备注
ticketsRoute.post('/:id/comments', requireAuth, async (c) => {
  const db = c.get('db')
  const user = c.get('user')!
  const id = c.req.param('id')

  const existing = await db.select().from(tickets).where(eq(tickets.id, id))
  if (existing.length === 0) {
    return c.json({ error: 'Ticket not found' }, 404)
  }

  const ticket = existing[0]
  const body = await c.req.json<{ comment?: string }>()

  if (!body.comment || body.comment.trim() === '') {
    return c.json({ error: 'comment must not be empty' }, 400)
  }
  if (body.comment.length > 2000) {
    return c.json({ error: 'comment must be at most 2000 characters' }, 400)
  }

  const now = new Date().toISOString()
  await db.insert(ticketHistory).values({
    id: crypto.randomUUID(),
    ticketId: id,
    action: 'commented',
    actor: user.username,
    fromStatus: ticket.status,
    toStatus: ticket.status,
    details: JSON.stringify({ comment: body.comment }),
    createdAt: now,
  })

  return c.json({ success: true }, 201)
})

export default ticketsRoute

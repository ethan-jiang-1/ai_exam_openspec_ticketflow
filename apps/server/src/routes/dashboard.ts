import { Hono } from 'hono'
import { sql, eq, and, gte, ne } from 'drizzle-orm'
import { tickets, ticketHistory, users } from '../db/schema'
import type { AuthVariables } from '../db/types'
import { requireAuth } from '../middleware/auth'

const dashboardRoute = new Hono<AuthVariables>()

function getWeekStart(): string {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (now.getDay() + 6) % 7)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

const countAll = sql<number>`COUNT(*)`.mapWith(Number)

// GET /api/dashboard
dashboardRoute.get('/', requireAuth, async (c) => {
  const db = c.get('db')
  const user = c.get('user')!

  if (user.role !== 'admin' && user.role !== 'dispatcher') {
    return c.json({ error: '无权限访问' }, 403)
  }

  const weekStart = getWeekStart()

  // --- overview ---
  const [totalRow] = await db.select({ count: countAll }).from(tickets)
  const total = totalRow?.count ?? 0

  const [createdThisWeekRow] = await db
    .select({ count: countAll })
    .from(tickets)
    .where(gte(tickets.createdAt, weekStart))
  const createdThisWeek = createdThisWeekRow?.count ?? 0

  const completedDistinct = sql<number>`COUNT(DISTINCT ticket_history.ticket_id)`.mapWith(Number)
  const [completedThisWeekRow] = await db
    .select({ count: completedDistinct })
    .from(ticketHistory)
    .where(and(
      eq(ticketHistory.action, 'completed'),
      gte(ticketHistory.createdAt, weekStart),
    ))
  const completedThisWeek = completedThisWeekRow?.count ?? 0

  const [pendingRow] = await db
    .select({ count: countAll })
    .from(tickets)
    .where(ne(tickets.status, 'completed'))
  const pending = pendingRow?.count ?? 0

  const priorityRows = await db
    .select({ priority: tickets.priority, count: countAll })
    .from(tickets)
    .where(ne(tickets.status, 'completed'))
    .groupBy(tickets.priority)

  const priorityDist = { high: 0, medium: 0, low: 0 }
  for (const row of priorityRows) {
    if (row.priority === 'high' || row.priority === 'medium' || row.priority === 'low') {
      priorityDist[row.priority] = row.count
    }
  }

  // --- efficiency ---
  // SQLite julianday converts ISO strings to Julian day numbers; difference * 1440 = minutes
  const [avgRespRow] = await db
    .select({
      avg: sql<number>`COALESCE(AVG((julianday((SELECT MIN(th.created_at) FROM ticket_history th WHERE th.ticket_id = tickets.id AND th.action = 'assigned')) - julianday(tickets.created_at)) * 1440.0), 0)`.mapWith(Number),
    })
    .from(tickets)
  const avgResponseMinutes = Math.round((avgRespRow?.avg ?? 0) * 100) / 100

  const [avgProcRow] = await db
    .select({
      avg: sql<number>`COALESCE(AVG((julianday((SELECT MIN(th2.created_at) FROM ticket_history th2 WHERE th2.ticket_id = tickets.id AND th2.action = 'completed')) - julianday((SELECT MIN(th1.created_at) FROM ticket_history th1 WHERE th1.ticket_id = tickets.id AND th1.action = 'assigned'))) * 1440.0), 0)`.mapWith(Number),
    })
    .from(tickets)
  const avgProcessMinutes = Math.round((avgProcRow?.avg ?? 0) * 100) / 100

  const [reassignRow] = await db
    .select({ count: countAll })
    .from(ticketHistory)
    .where(and(
      eq(ticketHistory.action, 'reassigned'),
      gte(ticketHistory.createdAt, weekStart),
    ))
  const reassignCount = reassignRow?.count ?? 0

  // --- workload ---
  const completerUsers = await db
    .select({ username: users.username, displayName: users.displayName })
    .from(users)
    .where(eq(users.role, 'completer'))

  const workload = []
  for (const cu of completerUsers) {
    const [assignedRow] = await db
      .select({ count: countAll })
      .from(tickets)
      .where(and(
        eq(tickets.assignedTo, cu.username),
        eq(tickets.status, 'assigned'),
      ))

    const [inProgressRow] = await db
      .select({ count: countAll })
      .from(tickets)
      .where(and(
        eq(tickets.assignedTo, cu.username),
        eq(tickets.status, 'in_progress'),
      ))

    const [completedRow] = await db
      .select({ count: completedDistinct })
      .from(ticketHistory)
      .innerJoin(tickets, eq(ticketHistory.ticketId, tickets.id))
      .where(and(
        eq(ticketHistory.action, 'completed'),
        eq(tickets.assignedTo, cu.username),
        gte(ticketHistory.createdAt, weekStart),
      ))

    workload.push({
      username: cu.username,
      displayName: cu.displayName,
      assignedCount: assignedRow?.count ?? 0,
      inProgressCount: inProgressRow?.count ?? 0,
      completedThisWeekCount: completedRow?.count ?? 0,
    })
  }

  // --- recentActivity ---
  const activityRows = await db
    .select({
      id: ticketHistory.id,
      ticketId: ticketHistory.ticketId,
      ticketTitle: tickets.title,
      action: ticketHistory.action,
      actor: ticketHistory.actor,
      actorDisplayName: users.displayName,
      toStatus: ticketHistory.toStatus,
      createdAt: ticketHistory.createdAt,
    })
    .from(ticketHistory)
    .innerJoin(tickets, eq(ticketHistory.ticketId, tickets.id))
    .innerJoin(users, eq(ticketHistory.actor, users.username))
    .orderBy(sql`ticket_history.created_at DESC`)
    .limit(10)

  const recentActivity = activityRows.map((r) => ({
    id: r.id,
    ticketId: r.ticketId,
    ticketTitle: r.ticketTitle,
    action: r.action,
    actor: r.actor,
    actorDisplayName: r.actorDisplayName ?? r.actor,
    toStatus: r.toStatus,
    createdAt: r.createdAt,
  }))

  return c.json({
    overview: {
      total,
      createdThisWeek,
      completedThisWeek,
      pending,
      priorityDistribution: priorityDist,
    },
    efficiency: {
      avgResponseMinutes,
      avgProcessMinutes,
      reassignCount,
    },
    workload,
    recentActivity,
  })
})

export default dashboardRoute

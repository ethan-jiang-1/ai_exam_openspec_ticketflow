import { describe, it, expect, beforeEach } from 'vitest'
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

describe('Dashboard API', () => {
  let adminCookie: string
  let dispatcherCookie: string
  let submitterCookie: string
  let completerCookie: string

  beforeEach(async () => {
    sessionStore.clear()
    await db.delete(ticketHistory)
    await db.delete(tickets)
    await db.delete(users)
    await seedUser('u-test-00000000-0000-0000-000000000001', 'admin', 'Test Admin', 'admin', 'testpass')
    await seedUser('u-test-00000000-0000-0000-000000000002', 'dispatcher', 'Test Dispatcher', 'dispatcher', 'testpass')
    await seedUser('u-test-00000000-0000-0000-000000000003', 'submitter', 'Test Submitter', 'submitter', 'testpass')
    await seedUser('u-test-00000000-0000-0000-000000000004', 'completer', 'Test Completer', 'completer', 'testpass')
    adminCookie = await loginAs('admin')
    dispatcherCookie = await loginAs('dispatcher')
    submitterCookie = await loginAs('submitter')
    completerCookie = await loginAs('completer')
  })

  const adminHeaders = () => ({ Cookie: adminCookie, 'Content-Type': 'application/json' })
  const dispatcherHeaders = () => ({ Cookie: dispatcherCookie, 'Content-Type': 'application/json' })
  const submitterHeaders = () => ({ Cookie: submitterCookie, 'Content-Type': 'application/json' })
  const completerHeaders = () => ({ Cookie: completerCookie, 'Content-Type': 'application/json' })

  const getDashboard = (headers: ReturnType<typeof adminHeaders>) =>
    app.request('/api/dashboard', { method: 'GET', headers })

  describe('GET /api/dashboard', () => {
    it('should return 200 for admin', async () => {
      const res = await getDashboard(adminHeaders())
      expect(res.status).toBe(200)
    })

    it('should return 200 for dispatcher', async () => {
      const res = await getDashboard(dispatcherHeaders())
      expect(res.status).toBe(200)
    })

    it('should return 403 for submitter', async () => {
      const res = await getDashboard(submitterHeaders())
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should return 403 for completer', async () => {
      const res = await getDashboard(completerHeaders())
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should return 401 for unauthenticated request', async () => {
      const res = await app.request('/api/dashboard')
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should return zero values when no tickets exist but users exist', async () => {
      const res = await getDashboard(adminHeaders())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.overview.total).toBe(0)
      expect(body.overview.createdThisWeek).toBe(0)
      expect(body.overview.completedThisWeek).toBe(0)
      expect(body.overview.pending).toBe(0)
      expect(body.overview.priorityDistribution).toEqual({ high: 0, medium: 0, low: 0 })
      expect(body.efficiency.avgResponseMinutes).toBe(0)
      expect(body.efficiency.avgProcessMinutes).toBe(0)
      expect(body.efficiency.reassignCount).toBe(0)
      expect(body.workload.length).toBe(1) // completer user
      expect(body.workload[0].assignedCount).toBe(0)
      expect(body.workload[0].inProgressCount).toBe(0)
      expect(body.workload[0].completedThisWeekCount).toBe(0)
      expect(body.recentActivity).toEqual([])
    })

    it('should return zero efficiency when tickets exist but no history', async () => {
      // Create 2 tickets with no history
      await db.insert(tickets).values({
        id: 't1',
        title: 'Ticket 1',
        description: 'Desc 1',
        status: 'submitted',
        priority: 'medium',
        createdBy: 'submitter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      await db.insert(tickets).values({
        id: 't2',
        title: 'Ticket 2',
        description: 'Desc 2',
        status: 'submitted',
        priority: 'high',
        createdBy: 'submitter',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const res = await getDashboard(adminHeaders())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.overview.total).toBe(2)
      expect(body.overview.pending).toBe(2)
      expect(body.efficiency.avgResponseMinutes).toBe(0)
      expect(body.efficiency.avgProcessMinutes).toBe(0)
    })

    it('should calculate avgResponseMinutes correctly', async () => {
      const now = Date.now()
      const t1Created = new Date(now - 3600000).toISOString() // 1 hour ago
      const t1Assigned = new Date(now - 1800000).toISOString() // 30 min ago → response time = 30 min
      const t2Created = new Date(now - 7200000).toISOString() // 2 hours ago
      const t2Assigned = new Date(now - 6000000).toISOString() // 100 min ago → response time = 20 min

      await db.insert(tickets).values({
        id: 't1', title: 'T1', description: 'D1', status: 'assigned', priority: 'medium',
        createdBy: 'submitter', assignedTo: 'completer', createdAt: t1Created, updatedAt: t1Assigned,
      })
      await db.insert(tickets).values({
        id: 't2', title: 'T2', description: 'D2', status: 'assigned', priority: 'medium',
        createdBy: 'submitter', assignedTo: 'completer', createdAt: t2Created, updatedAt: t2Assigned,
      })
      await db.insert(ticketHistory).values({
        id: 'h1', ticketId: 't1', action: 'assigned', actor: 'dispatcher',
        fromStatus: 'submitted', toStatus: 'assigned', createdAt: t1Assigned,
      })
      await db.insert(ticketHistory).values({
        id: 'h2', ticketId: 't2', action: 'assigned', actor: 'dispatcher',
        fromStatus: 'submitted', toStatus: 'assigned', createdAt: t2Assigned,
      })

      const res = await getDashboard(adminHeaders())
      expect(res.status).toBe(200)
      const body = await res.json()
      // avg = (30 + 20) / 2 = 25
      expect(body.efficiency.avgResponseMinutes).toBe(25)
    })

    it('should include ticketTitle and actorDisplayName in recentActivity', async () => {
      const now = new Date().toISOString()
      await db.insert(tickets).values({
        id: 't1', title: '修复登录页样式', description: 'Desc', status: 'completed',
        priority: 'high', createdBy: 'submitter', assignedTo: 'completer',
        createdAt: now, updatedAt: now,
      })
      await db.insert(ticketHistory).values({
        id: 'h1', ticketId: 't1', action: 'completed', actor: 'completer',
        fromStatus: 'in_progress', toStatus: 'completed', createdAt: now,
      })

      const res = await getDashboard(adminHeaders())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.recentActivity.length).toBe(1)
      expect(body.recentActivity[0].ticketTitle).toBe('修复登录页样式')
      expect(body.recentActivity[0].action).toBe('completed')
      expect(body.recentActivity[0].actor).toBe('completer')
      expect(body.recentActivity[0].actorDisplayName).toBe('Test Completer')
    })

    it('should count priority distribution only for non-completed tickets', async () => {
      const now = new Date().toISOString()
      // 3 pending: high, high, low
      await db.insert(tickets).values({ id: 't1', title: 'T1', description: 'D1', status: 'submitted', priority: 'high', createdBy: 'submitter', createdAt: now, updatedAt: now })
      await db.insert(tickets).values({ id: 't2', title: 'T2', description: 'D2', status: 'assigned', priority: 'high', createdBy: 'submitter', createdAt: now, updatedAt: now })
      await db.insert(tickets).values({ id: 't3', title: 'T3', description: 'D3', status: 'submitted', priority: 'low', createdBy: 'submitter', createdAt: now, updatedAt: now })
      // 1 completed: high (should not be counted)
      await db.insert(tickets).values({ id: 't4', title: 'T4', description: 'D4', status: 'completed', priority: 'high', createdBy: 'submitter', createdAt: now, updatedAt: now })

      const res = await getDashboard(adminHeaders())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.overview.priorityDistribution).toEqual({ high: 2, medium: 0, low: 1 })
    })

    it('should return workload with zero-activity users', async () => {
      // completer user already seeded, no tickets assigned to them
      const res = await getDashboard(adminHeaders())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.workload.length).toBe(1)
      expect(body.workload[0].username).toBe('completer')
      expect(body.workload[0].displayName).toBe('Test Completer')
      expect(body.workload[0].assignedCount).toBe(0)
      expect(body.workload[0].inProgressCount).toBe(0)
      expect(body.workload[0].completedThisWeekCount).toBe(0)
    })
  })
})

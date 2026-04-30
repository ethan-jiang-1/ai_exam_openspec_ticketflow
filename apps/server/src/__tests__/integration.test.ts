import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp } from './helpers'
import { tickets, users } from '../db/schema'
import { sessionStore } from '../lib/sessions'

const { app, db } = createTestApp()

const testUsers = [
  { id: 'u-int-00000000-0000-0000-000000000001', username: 'submitter', displayName: 'Integration Submitter', role: 'submitter' as const, createdAt: new Date().toISOString() },
  { id: 'u-int-00000000-0000-0000-000000000002', username: 'dispatcher', displayName: 'Integration Dispatcher', role: 'dispatcher' as const, createdAt: new Date().toISOString() },
  { id: 'u-int-00000000-0000-0000-000000000003', username: 'completer', displayName: 'Integration Completer', role: 'completer' as const, createdAt: new Date().toISOString() },
]

async function loginAs(username: string): Promise<string> {
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  return res.headers.get('set-cookie')!
}

describe('Integration: full ticket lifecycle', () => {
  let submitterH: Record<string, string>
  let dispatcherH: Record<string, string>
  let completerH: Record<string, string>

  beforeEach(async () => {
    sessionStore.clear()
    await db.delete(tickets)
    await db.delete(users)
    await db.insert(users).values(testUsers)
    submitterH = { Cookie: await loginAs('submitter'), 'Content-Type': 'application/json' }
    dispatcherH = { Cookie: await loginAs('dispatcher'), 'Content-Type': 'application/json' }
    completerH = { Cookie: await loginAs('completer'), 'Content-Type': 'application/json' }
  })

  it('should complete the full create → assign → start → complete flow', async () => {
    // Step 1: Create ticket (as submitter)
    const createRes = await app.request('/api/tickets', {
      method: 'POST',
      headers: submitterH,
      body: JSON.stringify({ title: 'Integration test', description: 'Full flow', priority: 'high', dueDate: '2026-06-01' }),
    })
    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    expect(created.status).toBe('submitted')
    expect(created.priority).toBe('high')
    expect(created.dueDate).toBe('2026-06-01')
    expect(created.createdBy).toBe('submitter')
    expect(created.assignedTo).toBeNull()

    // Step 2: Assign ticket (as dispatcher)
    const assignRes = await app.request(`/api/tickets/${created.id}/assign`, {
      method: 'PATCH',
      headers: dispatcherH,
      body: JSON.stringify({ assignedTo: 'completer' }),
    })
    expect(assignRes.status).toBe(200)
    const assigned = await assignRes.json()
    expect(assigned.status).toBe('assigned')
    expect(assigned.assignedTo).toBe('completer')
    expect(assigned.priority).toBe('high')
    expect(assigned.dueDate).toBe('2026-06-01')

    // Step 3: Start ticket (as completer)
    const startRes = await app.request(`/api/tickets/${created.id}/start`, {
      method: 'PATCH',
      headers: completerH,
    })
    expect(startRes.status).toBe(200)
    const started = await startRes.json()
    expect(started.status).toBe('in_progress')

    // Step 4: Complete ticket (as completer)
    const completeRes = await app.request(`/api/tickets/${created.id}/complete`, {
      method: 'PATCH',
      headers: completerH,
    })
    expect(completeRes.status).toBe(200)
    const completed = await completeRes.json()
    expect(completed.status).toBe('completed')
    expect(completed.id).toBe(created.id)
    expect(completed.priority).toBe('high')
    expect(completed.dueDate).toBe('2026-06-01')
  })
})

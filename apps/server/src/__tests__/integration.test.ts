import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp } from './helpers'
import { tickets, users } from '../db/schema'
import { sessionStore } from '../lib/sessions'

const { app, db } = createTestApp()

const testSubmitter = {
  id: 'u-int-00000000-0000-0000-000000000001',
  username: 'submitter',
  displayName: 'Integration Submitter',
  role: 'submitter',
  createdAt: new Date().toISOString(),
}

describe('Integration: full ticket lifecycle', () => {
  let cookie: string

  beforeEach(async () => {
    sessionStore.clear()
    await db.delete(tickets)
    await db.delete(users)
    await db.insert(users).values(testSubmitter)

    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'submitter' }),
    })
    cookie = loginRes.headers.get('set-cookie')!
  })

  it('should complete the full create → assign → start → complete flow', async () => {
    const h = { Cookie: cookie, 'Content-Type': 'application/json' }

    // Step 1: Create ticket
    const createRes = await app.request('/api/tickets', {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ title: 'Integration test', description: 'Full flow' }),
    })
    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    expect(created.status).toBe('submitted')
    expect(created.createdBy).toBe('submitter')
    expect(created.assignedTo).toBeNull()

    // Step 2: Assign ticket
    const assignRes = await app.request(`/api/tickets/${created.id}/assign`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({ assignedTo: 'completer' }),
    })
    expect(assignRes.status).toBe(200)
    const assigned = await assignRes.json()
    expect(assigned.status).toBe('assigned')
    expect(assigned.assignedTo).toBe('completer')

    // Step 3: Start ticket
    const startRes = await app.request(`/api/tickets/${created.id}/start`, {
      method: 'PATCH',
      headers: h,
    })
    expect(startRes.status).toBe(200)
    const started = await startRes.json()
    expect(started.status).toBe('in_progress')

    // Step 4: Complete ticket
    const completeRes = await app.request(`/api/tickets/${created.id}/complete`, {
      method: 'PATCH',
      headers: h,
    })
    expect(completeRes.status).toBe(200)
    const completed = await completeRes.json()
    expect(completed.status).toBe('completed')
    expect(completed.id).toBe(created.id)
  })
})

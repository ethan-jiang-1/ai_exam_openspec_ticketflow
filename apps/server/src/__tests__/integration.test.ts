import { describe, it, expect, beforeEach } from 'vitest'
import { createTestApp } from './helpers'
import { tickets } from '../db/schema'

const { app, db } = createTestApp()

describe('Integration: full ticket lifecycle', () => {
  beforeEach(async () => {
    await db.delete(tickets)
  })

  it('should complete the full create → assign → start → complete flow', async () => {
    // Step 1: Create ticket
    const createRes = await app.request('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Integration test', description: 'Full flow', createdBy: 'submitter' }),
    })
    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    expect(created.status).toBe('submitted')
    expect(created.createdBy).toBe('submitter')
    expect(created.assignedTo).toBeNull()

    // Step 2: Assign ticket
    const assignRes = await app.request(`/api/tickets/${created.id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: 'completer' }),
    })
    expect(assignRes.status).toBe(200)
    const assigned = await assignRes.json()
    expect(assigned.status).toBe('assigned')
    expect(assigned.assignedTo).toBe('completer')

    // Step 3: Start ticket
    const startRes = await app.request(`/api/tickets/${created.id}/start`, {
      method: 'PATCH',
    })
    expect(startRes.status).toBe(200)
    const started = await startRes.json()
    expect(started.status).toBe('in_progress')

    // Step 4: Complete ticket
    const completeRes = await app.request(`/api/tickets/${created.id}/complete`, {
      method: 'PATCH',
    })
    expect(completeRes.status).toBe(200)
    const completed = await completeRes.json()
    expect(completed.status).toBe('completed')
    expect(completed.id).toBe(created.id)
  })
})

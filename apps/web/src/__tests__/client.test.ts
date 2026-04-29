import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTickets,
  getTicket,
  createTicket,
  assignTicket,
  startTicket,
  completeTicket,
} from '../api/client'

describe('API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getTickets sends GET /api/tickets', async () => {
    const mockData = [{ id: '1', title: 'Test' }]
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const result = await getTickets()
    expect(fetch).toHaveBeenCalledWith('/api/tickets')
    expect(result).toEqual(mockData)
  })

  it('getTicket sends GET /api/tickets/:id', async () => {
    const mockData = { id: 'abc', title: 'Test' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const result = await getTicket('abc')
    expect(fetch).toHaveBeenCalledWith('/api/tickets/abc')
    expect(result).toEqual(mockData)
  })

  it('createTicket sends POST with correct body', async () => {
    const mockData = { id: '1', title: 'Bug' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const result = await createTicket({ title: 'Bug', description: 'Desc', createdBy: 'alice' })
    expect(fetch).toHaveBeenCalledWith('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Bug', description: 'Desc', createdBy: 'alice' }),
    })
    expect(result).toEqual(mockData)
  })

  it('assignTicket sends PATCH with correct body', async () => {
    const mockData = { id: '1', assignedTo: 'completer' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const result = await assignTicket('1', 'completer')
    expect(fetch).toHaveBeenCalledWith('/api/tickets/1/assign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: 'completer' }),
    })
    expect(result).toEqual(mockData)
  })

  it('startTicket sends PATCH', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', status: 'in_progress' }),
    } as Response)

    await startTicket('1')
    expect(fetch).toHaveBeenCalledWith('/api/tickets/1/start', { method: 'PATCH' })
  })

  it('completeTicket sends PATCH', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', status: 'completed' }),
    } as Response)

    await completeTicket('1')
    expect(fetch).toHaveBeenCalledWith('/api/tickets/1/complete', { method: 'PATCH' })
  })

  it('throws on error status code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad request' }),
    } as Response)

    await expect(createTicket({ title: '', description: '', createdBy: '' }))
      .rejects.toThrow('Bad request')
  })

  it('throws on 404 status code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    } as Response)

    await expect(getTicket('nonexistent')).rejects.toThrow('Not found')
  })
})

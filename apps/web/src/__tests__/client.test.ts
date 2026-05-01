import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTickets,
  getTicket,
  createTicket,
  assignTicket,
  startTicket,
  completeTicket,
  getUsers,
} from '../api/client'

describe('API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getTickets sends GET /api/tickets with credentials', async () => {
    const mockData = [{ id: '1', title: 'Test' }]
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const result = await getTickets()
    expect(fetch).toHaveBeenCalledWith('/api/tickets', { credentials: 'include' })
    expect(result).toEqual(mockData)
  })

  it('getTicket sends GET /api/tickets/:id with credentials', async () => {
    const mockData = { id: 'abc', title: 'Test' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const result = await getTicket('abc')
    expect(fetch).toHaveBeenCalledWith('/api/tickets/abc', { credentials: 'include' })
    expect(result).toEqual(mockData)
  })

  it('createTicket sends POST with correct body', async () => {
    const mockData = { id: '1', title: 'Bug' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const result = await createTicket({ title: 'Bug', description: 'Desc' })
    expect(fetch).toHaveBeenCalledWith('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Bug', description: 'Desc' }),
      credentials: 'include',
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
      credentials: 'include',
    })
    expect(result).toEqual(mockData)
  })

  it('startTicket sends PATCH with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', status: 'in_progress' }),
    } as Response)

    await startTicket('1')
    expect(fetch).toHaveBeenCalledWith('/api/tickets/1/start', { method: 'PATCH', credentials: 'include' })
  })

  it('completeTicket sends PATCH with credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', status: 'completed' }),
    } as Response)

    await completeTicket('1')
    expect(fetch).toHaveBeenCalledWith('/api/tickets/1/complete', { method: 'PATCH', credentials: 'include' })
  })

  it('getUsers sends GET /api/auth/users with credentials', async () => {
    const mockData = [{ username: 'submitter', displayName: '提交者', role: 'submitter' }]
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const result = await getUsers()
    expect(fetch).toHaveBeenCalledWith('/api/auth/users', { credentials: 'include' })
    expect(result).toEqual(mockData)
  })

  it('throws on error status code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad request' }),
    } as Response)

    await expect(createTicket({ title: '', description: '' }))
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

  it('dispatches auth:expired on 401 when NOT on login page', async () => {
    vi.stubGlobal('location', { pathname: '/workbench/submitter' })
    const spy = vi.spyOn(window, 'dispatchEvent')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: '未登录' }),
    } as Response)

    await expect(getTickets()).rejects.toThrow('未登录')
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:expired' }))
  })

  it('does NOT dispatch auth:expired on 401 when on /login page', async () => {
    vi.stubGlobal('location', { pathname: '/login' })
    const spy = vi.spyOn(window, 'dispatchEvent')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: '未登录' }),
    } as Response)

    await expect(getUsers()).rejects.toThrow('未登录')
    expect(spy).not.toHaveBeenCalled()
  })

  it('does NOT dispatch auth:expired on 401 when on /login-dev page', async () => {
    vi.stubGlobal('location', { pathname: '/login-dev' })
    const spy = vi.spyOn(window, 'dispatchEvent')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: '未登录' }),
    } as Response)

    await expect(getUsers()).rejects.toThrow('未登录')
    expect(spy).not.toHaveBeenCalled()
  })
})

import type { Ticket, Priority, User, TicketHistoryEvent } from '@ticketflow/shared'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    const err = await response.json()
    throw new Error(err.error || `API error: ${response.status}`)
  }
  return response.json()
}

export async function getTickets(): Promise<Ticket[]> {
  const res = await fetch('/api/tickets', { credentials: 'include' })
  return handleResponse<Ticket[]>(res)
}

export async function getTicket(id: string): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}`, { credentials: 'include' })
  return handleResponse<Ticket>(res)
}

export async function getTicketHistory(id: string): Promise<TicketHistoryEvent[]> {
  const res = await fetch(`/api/tickets/${id}/history`, { credentials: 'include' })
  return handleResponse<TicketHistoryEvent[]>(res)
}

export async function createTicket(data: {
  title: string
  description: string
  priority?: Priority
  dueDate?: string
}): Promise<Ticket> {
  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  return handleResponse<Ticket>(res)
}

export async function assignTicket(
  id: string,
  assignedTo: string,
): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignedTo }),
    credentials: 'include',
  })
  return handleResponse<Ticket>(res)
}

export async function startTicket(id: string): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}/start`, {
    method: 'PATCH',
    credentials: 'include',
  })
  return handleResponse<Ticket>(res)
}

export async function completeTicket(id: string): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}/complete`, {
    method: 'PATCH',
    credentials: 'include',
  })
  return handleResponse<Ticket>(res)
}

export async function getUsers() {
  const res = await fetch('/api/auth/users', { credentials: 'include' })
  return handleResponse<User[]>(res)
}

// --- Admin API ---

export async function getAdminUsers(): Promise<User[]> {
  const res = await fetch('/api/admin/users', { credentials: 'include' })
  return handleResponse<User[]>(res)
}

export async function createUser(data: {
  username: string
  displayName: string
  role: string
  password: string
}): Promise<User> {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  return handleResponse<User>(res)
}

export async function updateUser(
  username: string,
  data: { displayName?: string; role?: string; password?: string },
): Promise<User> {
  const res = await fetch(`/api/admin/users/${username}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  return handleResponse<User>(res)
}

export async function deleteUser(username: string): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/admin/users/${username}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return handleResponse<{ ok: boolean }>(res)
}

import type { Ticket, Priority, User } from '@ticketflow/shared'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
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

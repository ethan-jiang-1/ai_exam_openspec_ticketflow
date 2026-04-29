import type { Ticket } from '@ticketflow/shared'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error || `API error: ${response.status}`)
  }
  return response.json()
}

export async function getTickets(): Promise<Ticket[]> {
  const res = await fetch('/api/tickets')
  return handleResponse<Ticket[]>(res)
}

export async function getTicket(id: string): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}`)
  return handleResponse<Ticket>(res)
}

export async function createTicket(data: {
  title: string
  description: string
  createdBy: string
}): Promise<Ticket> {
  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
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
  })
  return handleResponse<Ticket>(res)
}

export async function startTicket(id: string): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}/start`, {
    method: 'PATCH',
  })
  return handleResponse<Ticket>(res)
}

export async function completeTicket(id: string): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}/complete`, {
    method: 'PATCH',
  })
  return handleResponse<Ticket>(res)
}

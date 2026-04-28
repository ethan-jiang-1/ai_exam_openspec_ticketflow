import { describe, it, expect } from 'vitest'
import {
  ROLES,
  ROLE_LIST,
  TICKET_STATUSES,
  TICKET_STATUS_LIST,
  type Role,
  type TicketStatus,
  type Ticket,
} from '../index'

describe('ROLES', () => {
  it('should contain three roles with key=value consistency', () => {
    expect(ROLES.submitter).toBe('submitter')
    expect(ROLES.dispatcher).toBe('dispatcher')
    expect(ROLES.completer).toBe('completer')
  })

  it('should have keys matching values', () => {
    for (const [key, value] of Object.entries(ROLES)) {
      expect(key).toBe(value)
    }
  })
})

describe('ROLE_LIST', () => {
  it('should have length 3', () => {
    expect(ROLE_LIST).toHaveLength(3)
  })

  it('should contain all role values', () => {
    const values: readonly Role[] = ['submitter', 'dispatcher', 'completer']
    expect(ROLE_LIST).toEqual(values)
  })
})

describe('TICKET_STATUSES', () => {
  it('should contain four statuses with snake_case key=value', () => {
    expect(TICKET_STATUSES.submitted).toBe('submitted')
    expect(TICKET_STATUSES.assigned).toBe('assigned')
    expect(TICKET_STATUSES.in_progress).toBe('in_progress')
    expect(TICKET_STATUSES.completed).toBe('completed')
  })

  it('should have keys matching values', () => {
    for (const [key, value] of Object.entries(TICKET_STATUSES)) {
      expect(key).toBe(value)
    }
  })
})

describe('TICKET_STATUS_LIST', () => {
  it('should have length 4', () => {
    expect(TICKET_STATUS_LIST).toHaveLength(4)
  })

  it('should contain all status values in order', () => {
    const values: readonly TicketStatus[] = [
      'submitted',
      'assigned',
      'in_progress',
      'completed',
    ]
    expect(TICKET_STATUS_LIST).toEqual(values)
  })
})

describe('Ticket', () => {
  const validTicket: Ticket = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Fix login bug',
    description: 'Login fails on Safari',
    status: 'submitted',
    createdBy: 'alice',
    assignedTo: null,
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-04-28T10:00:00Z',
  }

  it('should accept a valid ticket with assignedTo null', () => {
    expect(validTicket.assignedTo).toBeNull()
    expect(validTicket.status).toBe('submitted')
  })

  it('should accept a valid ticket with assignedTo string', () => {
    const assigned: Ticket = { ...validTicket, assignedTo: 'bob', status: 'assigned' }
    expect(assigned.assignedTo).toBe('bob')
  })

  it('should require all fields', () => {
    const requiredKeys = [
      'id', 'title', 'description', 'status',
      'createdBy', 'assignedTo', 'createdAt', 'updatedAt',
    ] as const
    for (const key of requiredKeys) {
      expect(key in validTicket).toBe(true)
    }
  })
})

import { describe, it, expect } from 'vitest'
import {
  ROLES,
  ROLE_LIST,
  TICKET_STATUSES,
  TICKET_STATUS_LIST,
  PRIORITIES,
  PRIORITY_ORDER,
  PRIORITY_LABELS,
  type Role,
  type TicketStatus,
  type Ticket,
} from '../index'

describe('ROLES', () => {
  it('should contain four roles with key=value consistency', () => {
    expect(ROLES.submitter).toBe('submitter')
    expect(ROLES.dispatcher).toBe('dispatcher')
    expect(ROLES.completer).toBe('completer')
    expect(ROLES.admin).toBe('admin')
  })

  it('should have keys matching values', () => {
    for (const [key, value] of Object.entries(ROLES)) {
      expect(key).toBe(value)
    }
  })
})

describe('ROLE_LIST', () => {
  it('should have length 4', () => {
    expect(ROLE_LIST).toHaveLength(4)
  })

  it('should contain all role values', () => {
    const values: readonly Role[] = ['submitter', 'dispatcher', 'completer', 'admin']
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

describe('PRIORITIES', () => {
  it('should contain exactly low, medium, high', () => {
    const values = Object.values(PRIORITIES)
    expect(values).toHaveLength(3)
    expect(values).toContain('low')
    expect(values).toContain('medium')
    expect(values).toContain('high')
  })
})

describe('PRIORITY_ORDER', () => {
  it('should order high > medium > low', () => {
    expect(PRIORITY_ORDER.high).toBeGreaterThan(PRIORITY_ORDER.medium)
    expect(PRIORITY_ORDER.medium).toBeGreaterThan(PRIORITY_ORDER.low)
  })
})

describe('PRIORITY_LABELS', () => {
  it('should return Chinese labels', () => {
    expect(PRIORITY_LABELS.low).toBe('低')
    expect(PRIORITY_LABELS.medium).toBe('中')
    expect(PRIORITY_LABELS.high).toBe('高')
  })
})

describe('Ticket', () => {
  const validTicket: Ticket = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Fix login bug',
    description: 'Login fails on Safari',
    status: 'submitted',
    priority: 'high',
    dueDate: '2026-05-30',
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

  it('should accept ticket with null dueDate', () => {
    const noDue: Ticket = { ...validTicket, dueDate: null }
    expect(noDue.dueDate).toBeNull()
  })

  it('should require all fields', () => {
    const requiredKeys = [
      'id', 'title', 'description', 'status', 'priority', 'dueDate',
      'createdBy', 'assignedTo', 'createdAt', 'updatedAt',
    ] as const
    for (const key of requiredKeys) {
      expect(key in validTicket).toBe(true)
    }
  })
})

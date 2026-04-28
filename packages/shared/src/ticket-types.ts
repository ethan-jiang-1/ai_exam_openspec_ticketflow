// --- Role ---

export const ROLES = {
  submitter: 'submitter',
  dispatcher: 'dispatcher',
  completer: 'completer',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LIST: readonly Role[] = Object.values(ROLES)

// --- TicketStatus ---

export const TICKET_STATUSES = {
  submitted: 'submitted',
  assigned: 'assigned',
  in_progress: 'in_progress',
  completed: 'completed',
} as const

export type TicketStatus = (typeof TICKET_STATUSES)[keyof typeof TICKET_STATUSES]

export const TICKET_STATUS_LIST: readonly TicketStatus[] =
  Object.values(TICKET_STATUSES)

// --- Ticket ---

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  createdBy: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
}

// --- Role ---

export const ROLES = {
  submitter: 'submitter',
  dispatcher: 'dispatcher',
  completer: 'completer',
  admin: 'admin',
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

// --- Priority ---

export const PRIORITIES = {
  low: 'low',
  medium: 'medium',
  high: 'high',
} as const

export type Priority = (typeof PRIORITIES)[keyof typeof PRIORITIES]

export const PRIORITY_ORDER: Record<Priority, number> = {
  low: 0,
  medium: 1,
  high: 2,
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'green',
  medium: 'gold',
  high: 'red',
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  submitted: '已提交',
  assigned: '已指派',
  in_progress: '处理中',
  completed: '已完成',
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  submitted: 'blue',
  assigned: 'orange',
  in_progress: 'processing',
  completed: 'green',
}

export const ROLE_LABELS: Record<Role, string> = {
  submitter: '提交者',
  dispatcher: '调度者',
  completer: '完成者',
  admin: '管理员',
}

export const ROLE_COLORS: Record<Role, string> = {
  submitter: '#5b8def',
  dispatcher: '#7c3aed',
  completer: '#059669',
  admin: '#d97706',
}

// --- Ticket ---

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: Priority
  dueDate: string | null
  createdBy: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
}

// --- User ---

export interface User {
  id: string
  username: string
  displayName: string
  role: Role
  createdAt: string
}

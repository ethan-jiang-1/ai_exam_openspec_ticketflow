import { eq } from 'drizzle-orm'
import { createDb } from './node'
import { tickets, users } from './schema'
import { hashPassword } from '../lib/password'

const db = createDb(process.env.DATABASE_PATH || './data/ticketflow.db')

const now = new Date().toISOString()

// --- Seed users ---

const seedUserDefs = [
  { id: 'u-00000000-0000-0000-0000-000000000001', username: 'submitter', displayName: '提交者', role: 'submitter', password: 'changeme' },
  { id: 'u-00000000-0000-0000-0000-000000000002', username: 'dispatcher', displayName: '调度者', role: 'dispatcher', password: 'changeme' },
  { id: 'u-00000000-0000-0000-0000-000000000003', username: 'completer', displayName: '完成者', role: 'completer', password: 'changeme' },
  { id: 'u-00000000-0000-0000-0000-000000000004', username: 'admin', displayName: '管理员', role: 'admin', password: 'admin' },
]

for (const def of seedUserDefs) {
  const existing = await db.select().from(users).where(eq(users.username, def.username))
  if (existing.length === 0) {
    const passwordHash = await hashPassword(def.password)
    await db.insert(users).values({
      id: def.id,
      username: def.username,
      displayName: def.displayName,
      role: def.role,
      passwordHash,
      createdAt: now,
    })
  }
}
console.log(`Seeded ${seedUserDefs.length} users`)

// --- Seed tickets ---

const seedTickets = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    title: 'Fix login page styling on mobile',
    description: 'The login form overflows on screens narrower than 375px',
    status: 'submitted',
    priority: 'high',
    dueDate: '2026-05-15',
    createdBy: 'submitter',
    assignedTo: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    title: 'Add dark mode support',
    description: 'Users have requested a system-preference-aware dark theme',
    status: 'submitted',
    priority: 'low',
    dueDate: null,
    createdBy: 'submitter',
    assignedTo: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    title: 'Optimize database queries for dashboard',
    description: 'Dashboard loads slowly when there are >1000 tickets',
    status: 'assigned',
    priority: 'medium',
    dueDate: '2026-05-20',
    createdBy: 'dispatcher',
    assignedTo: 'completer',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    title: 'Implement email notifications',
    description: 'Send email when ticket status changes to assigned or completed',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-05-10',
    createdBy: 'submitter',
    assignedTo: 'completer',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    title: 'Write API documentation',
    description: 'Document all REST endpoints with request/response examples',
    status: 'completed',
    priority: 'medium',
    dueDate: null,
    createdBy: 'dispatcher',
    assignedTo: 'completer',
    createdAt: now,
    updatedAt: now,
  },
]

let ticketCount = 0
for (const ticket of seedTickets) {
  const existing = await db.select().from(tickets).where(eq(tickets.id, ticket.id))
  if (existing.length === 0) {
    await db.insert(tickets).values(ticket)
    ticketCount++
  }
}
console.log(`Seeded ${ticketCount} tickets`)

import { eq } from 'drizzle-orm'
import { createDb } from './node'
import { tickets, users } from './schema'

const db = createDb(process.env.DATABASE_PATH || './data/ticketflow.db')

const now = new Date().toISOString()

// --- Seed users ---

const seedUsers = [
  { id: 'u-00000000-0000-0000-0000-000000000001', username: 'submitter', displayName: '提交者', role: 'submitter', createdAt: now },
  { id: 'u-00000000-0000-0000-0000-000000000002', username: 'dispatcher', displayName: '调度者', role: 'dispatcher', createdAt: now },
  { id: 'u-00000000-0000-0000-0000-000000000003', username: 'completer', displayName: '完成者', role: 'completer', createdAt: now },
]

for (const u of seedUsers) {
  const existing = await db.select().from(users).where(eq(users.username, u.username))
  if (existing.length === 0) {
    await db.insert(users).values(u)
  }
}
console.log(`Seeded ${seedUsers.length} users`)

// --- Seed tickets ---

const seedTickets = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    title: 'Fix login page styling on mobile',
    description: 'The login form overflows on screens narrower than 375px',
    status: 'submitted',
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
    createdBy: 'dispatcher',
    assignedTo: 'completer',
    createdAt: now,
    updatedAt: now,
  },
]

await db.insert(tickets).values(seedTickets)
console.log(`Seeded ${seedTickets.length} tickets`)

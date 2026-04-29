import { createDb } from './node'
import { tickets } from './schema'

const db = createDb(process.env.DATABASE_PATH || './data/ticketflow.db')

const now = new Date().toISOString()

const seedTickets = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    title: 'Fix login page styling on mobile',
    description: 'The login form overflows on screens narrower than 375px',
    status: 'submitted',
    createdBy: 'alice',
    assignedTo: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    title: 'Add dark mode support',
    description: 'Users have requested a system-preference-aware dark theme',
    status: 'submitted',
    createdBy: 'bob',
    assignedTo: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    title: 'Optimize database queries for dashboard',
    description: 'Dashboard loads slowly when there are >1000 tickets',
    status: 'assigned',
    createdBy: 'alice',
    assignedTo: 'charlie',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    title: 'Implement email notifications',
    description: 'Send email when ticket status changes to assigned or completed',
    status: 'in_progress',
    createdBy: 'bob',
    assignedTo: 'alice',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    title: 'Write API documentation',
    description: 'Document all REST endpoints with request/response examples',
    status: 'completed',
    createdBy: 'charlie',
    assignedTo: 'bob',
    createdAt: now,
    updatedAt: now,
  },
]

await db.insert(tickets).values(seedTickets)
console.log(`Seeded ${seedTickets.length} tickets`)

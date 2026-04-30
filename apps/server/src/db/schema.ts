import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('submitted'),
  priority: text('priority').notNull().default('medium'),
  dueDate: text('due_date'),
  createdBy: text('created_by').notNull(),
  assignedTo: text('assigned_to'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
})

export const ticketHistory = sqliteTable('ticket_history', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull(),
  action: text('action').notNull(),
  actor: text('actor').notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  details: text('details'),
  createdAt: text('created_at').notNull(),
})

export const schema = { tickets, users, ticketHistory }

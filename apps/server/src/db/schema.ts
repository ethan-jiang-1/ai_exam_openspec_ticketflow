import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('submitted'),
  createdBy: text('created_by').notNull(),
  assignedTo: text('assigned_to'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const schema = { tickets }

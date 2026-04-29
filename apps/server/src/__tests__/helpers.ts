import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { createApp } from '../app'
import { createDb } from '../db/node'
import type { NodeEnv } from '../db/types'

export function createTestApp() {
  const db = createDb(':memory:')
  migrate(db, { migrationsFolder: './drizzle' })

  const app = createApp<NodeEnv>(async (c, next) => {
    c.set('db', db)
    await next()
  })
  return { app, db }
}

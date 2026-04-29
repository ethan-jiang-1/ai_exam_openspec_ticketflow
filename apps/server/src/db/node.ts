import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import * as schema from './schema'

export function createDb(dbPath: string) {
  const resolvedPath = dbPath === ':memory:' ? dbPath : path.resolve(dbPath)

  if (dbPath !== ':memory:') {
    const dbDir = path.dirname(resolvedPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
  }

  const sqlite = new Database(resolvedPath)
  sqlite.pragma('journal_mode = WAL')

  return Object.assign(drizzle(sqlite, { schema }), { sqlite })
}

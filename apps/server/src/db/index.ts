import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/ticketflow.db')
const dbDir = path.dirname(dbPath)

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')

export { sqlite }

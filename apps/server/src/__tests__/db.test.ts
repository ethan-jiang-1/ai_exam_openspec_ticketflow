import { describe, it, expect } from 'vitest'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { createDb } from '../db/node'
import { tickets } from '../db/schema'
import fs from 'node:fs'

describe('Database connection (node factory)', () => {
  it('should create a Drizzle instance with sqlite', () => {
    const result = createDb(':memory:')
    expect(result).toBeDefined()
    expect(typeof result.select).toBe('function')
    expect(result.sqlite).toBeDefined()
    expect(typeof result.sqlite.prepare).toBe('function')
  })

  it('should have WAL mode enabled for file-based db', () => {
    const tmpDir = import.meta.dirname!
    const tmpDb = `${tmpDir}/test-wal-${Date.now()}.db`
    try {
      const { sqlite } = createDb(tmpDb)
      const result = sqlite.pragma('journal_mode', { simple: true })
      expect(result).toBe('wal')
    } finally {
      for (const ext of ['', '-wal', '-shm', '-journal']) {
        try { fs.unlinkSync(tmpDb + ext) } catch { /* file may not exist */ }
      }
    }
  })

  it('should support :memory: databases with migrations', async () => {
    const result = createDb(':memory:')
    migrate(result, { migrationsFolder: './drizzle' })
    await result.insert(tickets).values({
      id: 'test-1',
      title: 'Memory test',
      description: 'In-memory db',
      status: 'submitted',
      createdBy: 'tester',
      assignedTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const rows = await result.select().from(tickets)
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('Memory test')
  })
})

import { describe, it, expect } from 'vitest'

describe('Database connection', () => {
  it('should export a sqlite instance', async () => {
    const { sqlite } = await import('../db')
    expect(sqlite).toBeDefined()
    expect(typeof sqlite.prepare).toBe('function')
  })

  it('should have WAL mode enabled', async () => {
    const { sqlite } = await import('../db')
    const result = sqlite.pragma('journal_mode', { simple: true })
    expect(result).toBe('wal')
  })
})

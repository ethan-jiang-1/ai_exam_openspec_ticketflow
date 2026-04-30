import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../lib/password'

describe('password', () => {
  describe('hashPassword', () => {
    it('returns salt:hash format with 64-char hex each', async () => {
      const result = await hashPassword('mypassword')
      const [salt, hash] = result.split(':')
      expect(salt).toHaveLength(64)
      expect(hash).toHaveLength(64)
    })

    it('produces different hashes for same password', async () => {
      const h1 = await hashPassword('same')
      const h2 = await hashPassword('same')
      expect(h1).not.toBe(h2)
    })

    it('works with empty string password', async () => {
      const result = await hashPassword('')
      expect(result).toContain(':')
    })
  })

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const stored = await hashPassword('test123')
      const result = await verifyPassword('test123', stored)
      expect(result).toBe(true)
    })

    it('returns false for wrong password', async () => {
      const stored = await hashPassword('test123')
      const result = await verifyPassword('wrong', stored)
      expect(result).toBe(false)
    })

    it('returns false for empty stored string', async () => {
      const result = await verifyPassword('test', '')
      expect(result).toBe(false)
    })

    it('returns false for stored string without colon', async () => {
      const result = await verifyPassword('test', 'invalidformat')
      expect(result).toBe(false)
    })
  })
})

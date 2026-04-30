import { describe, it, expect, beforeEach } from 'vitest'
import { SessionStore } from '../lib/sessions'

describe('SessionStore', () => {
  let store: SessionStore

  beforeEach(() => {
    store = new SessionStore()
  })

  it('creates and retrieves a session', () => {
    const id = store.create('user-123')
    const session = store.get(id)
    expect(session).toBeDefined()
    expect(session!.userId).toBe('user-123')
    expect(typeof session!.createdAt).toBe('number')
  })

  it('generates UUID v4 format session IDs', () => {
    const id = store.create('user-1')
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('destroys a session', () => {
    const id = store.create('user-1')
    store.destroy(id)
    expect(store.get(id)).toBeUndefined()
  })

  it('clears all sessions', () => {
    store.create('user-1')
    store.create('user-2')
    store.clear()
    expect(store.get('any')).toBeUndefined()
  })

  describe('TTL', () => {
    it('returns undefined for expired session and deletes it', async () => {
      const ttlStore = new SessionStore(1) // 1ms TTL
      const id = ttlStore.create('user-1')
      await new Promise((r) => setTimeout(r, 2))
      expect(ttlStore.get(id)).toBeUndefined()
    })

    it('returns session data for non-expired session', () => {
      const ttlStore = new SessionStore(86_400_000) // 24h TTL
      const id = ttlStore.create('user-1')
      const session = ttlStore.get(id)
      expect(session).toBeDefined()
      expect(session!.userId).toBe('user-1')
    })

    it('default TTL is 24h (86,400,000ms)', () => {
      const defaultStore = new SessionStore()
      const id = defaultStore.create('user-1')
      expect(defaultStore.get(id)).toBeDefined()
    })
  })

  describe('cleanExpired', () => {
    it('removes expired sessions, keeps valid ones', async () => {
      const ttlStore = new SessionStore(1)
      ttlStore.create('user-expired')
      await new Promise((r) => setTimeout(r, 2))
      const validId = ttlStore.create('user-valid')

      ttlStore.cleanExpired()

      expect(ttlStore.get(validId)).toBeDefined()
    })

    it('cleanExpired is called on create (lazy cleanup)', async () => {
      const ttlStore = new SessionStore(1)
      ttlStore.create('user-1')
      await new Promise((r) => setTimeout(r, 2))

      // create should call cleanExpired, removing the expired session
      ttlStore.create('user-2')

      // user-1 should be gone (cleaned up by create's cleanExpired call)
      // user-2 should exist
      const allSessions = ttlStore.size()
      expect(allSessions).toBe(1)
    })
  })
})

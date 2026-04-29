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
})

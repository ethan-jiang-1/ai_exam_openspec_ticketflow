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

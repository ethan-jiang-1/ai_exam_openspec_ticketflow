export interface SessionData {
  userId: string
  createdAt: number
}

const DEFAULT_TTL_MS = 86_400_000 // 24 hours

export class SessionStore {
  private store = new Map<string, SessionData>()
  private ttlMs: number

  constructor(ttlMs?: number) {
    this.ttlMs = ttlMs ?? DEFAULT_TTL_MS
  }

  create(userId: string): string {
    this.cleanExpired()
    const sessionId = crypto.randomUUID()
    this.store.set(sessionId, { userId, createdAt: Date.now() })
    return sessionId
  }

  get(sessionId: string): SessionData | undefined {
    const session = this.store.get(sessionId)
    if (!session) return undefined
    if (Date.now() - session.createdAt > this.ttlMs) {
      this.store.delete(sessionId)
      return undefined
    }
    return session
  }

  destroy(sessionId: string): void {
    this.store.delete(sessionId)
  }

  cleanExpired(): void {
    const now = Date.now()
    for (const [id, session] of this.store) {
      if (now - session.createdAt > this.ttlMs) {
        this.store.delete(id)
      }
    }
  }

  clear(): void {
    this.store.clear()
  }

  size(): number {
    return this.store.size
  }
}

export const sessionStore = new SessionStore()

import { randomUUID } from 'crypto'

export interface SessionData {
  userId: string
  createdAt: number
}

export class SessionStore {
  private store = new Map<string, SessionData>()

  create(userId: string): string {
    const sessionId = randomUUID()
    this.store.set(sessionId, { userId, createdAt: Date.now() })
    return sessionId
  }

  get(sessionId: string): SessionData | undefined {
    return this.store.get(sessionId)
  }

  destroy(sessionId: string): void {
    this.store.delete(sessionId)
  }

  clear(): void {
    this.store.clear()
  }
}

export const sessionStore = new SessionStore()

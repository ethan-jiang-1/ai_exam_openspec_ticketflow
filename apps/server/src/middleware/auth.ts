import { getCookie } from 'hono/cookie'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import { sessionStore } from '../lib/sessions'
import type { AuthVariables } from '../db/types'
import type { Context, Next } from 'hono'

export async function sessionMiddleware(c: Context<AuthVariables>, next: Next) {
  const sessionId = getCookie(c, 'ticketflow-session')
  if (!sessionId) {
    c.set('user', null)
    await next()
    return
  }

  const session = sessionStore.get(sessionId)
  if (!session) {
    c.set('user', null)
    c.set('sessionExpired', true)
    await next()
    return
  }

  const db = c.get('db')
  const result = await db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, session.userId))
  c.set('user', result[0] ?? null)
  await next()
}

export async function requireAuth(c: Context<AuthVariables>, next: Next) {
  const user = c.get('user')
  if (!user) {
    const msg = c.get('sessionExpired') ? '会话已过期，请重新登录' : '未登录'
    return c.json({ error: msg }, 401)
  }
  await next()
}

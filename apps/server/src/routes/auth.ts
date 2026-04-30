import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import { sessionStore } from '../lib/sessions'
import { verifyPassword } from '../lib/password'
import { requireAuth } from '../middleware/auth'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import type { AuthVariables } from '../db/types'

const authRoute = new Hono<AuthVariables>()

// GET /api/auth/users — 返回可选用户列表（无需认证）
authRoute.get('/users', async (c) => {
  const db = c.get('db')
  const allUsers = await db.select({
    username: users.username,
    displayName: users.displayName,
    role: users.role,
  }).from(users)
  return c.json(allUsers)
})

// POST /api/auth/login
authRoute.post('/login', async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>()

  if (!body.username) {
    return c.json({ error: 'username is required' }, 400)
  }
  if (!body.password) {
    return c.json({ error: 'password is required' }, 400)
  }

  const db = c.get('db')
  const result = await db.select().from(users).where(eq(users.username, body.username))

  if (result.length === 0) {
    return c.json({ error: '用户不存在' }, 401)
  }

  const user = result[0]
  const valid = await verifyPassword(body.password, user.passwordHash)
  if (!valid) {
    return c.json({ error: '密码错误' }, 401)
  }

  const sessionId = sessionStore.create(user.id)

  setCookie(c, 'ticketflow-session', sessionId, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 86400,
  })

  return c.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  })
})

// POST /api/auth/logout
authRoute.post('/logout', requireAuth, async (c) => {
  const sessionId = getCookie(c, 'ticketflow-session')
  if (sessionId) {
    sessionStore.destroy(sessionId)
  }
  deleteCookie(c, 'ticketflow-session', { path: '/' })
  return c.json({ ok: true })
})

// GET /api/auth/me
authRoute.get('/me', requireAuth, async (c) => {
  const user = c.get('user')!
  return c.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  })
})

export default authRoute

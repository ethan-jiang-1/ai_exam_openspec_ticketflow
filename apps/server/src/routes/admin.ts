import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../lib/permissions'
import { hashPassword } from '../lib/password'
import { ROLE_LIST } from '@ticketflow/shared'
import type { AuthVariables } from '../db/types'

const adminRoute = new Hono<AuthVariables>()

adminRoute.use('*', requireAuth)
adminRoute.use('*', requirePermission('user:manage'))

// GET /api/admin/users
adminRoute.get('/users', async (c) => {
  const db = c.get('db')
  const allUsers = await db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users)
  return c.json(allUsers)
})

// POST /api/admin/users
adminRoute.post('/users', async (c) => {
  const body = await c.req.json<{ username?: string; displayName?: string; role?: string; password?: string }>()

  if (!body.username || body.username.trim() === '') {
    return c.json({ error: 'username is required' }, 400)
  }
  if (!body.displayName || body.displayName.trim() === '') {
    return c.json({ error: 'displayName is required' }, 400)
  }
  if (!body.role) {
    return c.json({ error: 'role is required' }, 400)
  }
  if (!body.password || body.password === '') {
    return c.json({ error: 'password is required' }, 400)
  }

  const validRoles = ROLE_LIST as readonly string[]
  if (!validRoles.includes(body.role)) {
    return c.json({ error: `role must be one of: ${validRoles.join(', ')}` }, 400)
  }

  const db = c.get('db')
  const existing = await db.select().from(users).where(eq(users.username, body.username))
  if (existing.length > 0) {
    return c.json({ error: '用户名已存在' }, 400)
  }

  const passwordHash = await hashPassword(body.password)
  const now = new Date().toISOString()
  const newUser = {
    id: crypto.randomUUID(),
    username: body.username,
    displayName: body.displayName,
    role: body.role,
    passwordHash,
    createdAt: now,
  }

  await db.insert(users).values(newUser)
  return c.json({
    id: newUser.id,
    username: newUser.username,
    displayName: newUser.displayName,
    role: newUser.role,
    createdAt: newUser.createdAt,
  }, 201)
})

// PATCH /api/admin/users/:username
adminRoute.patch('/users/:username', async (c) => {
  const username = c.req.param('username')
  const body = await c.req.json<{ displayName?: string; role?: string; password?: string }>()

  const db = c.get('db')
  const existing = await db.select().from(users).where(eq(users.username, username))
  if (existing.length === 0) {
    return c.json({ error: '用户不存在' }, 404)
  }

  const user = existing[0]

  if (body.role !== undefined) {
    const validRoles = ROLE_LIST as readonly string[]
    if (!validRoles.includes(body.role)) {
      return c.json({ error: `role must be one of: ${validRoles.join(', ')}` }, 400)
    }
  }

  const updates: Record<string, string> = {}
  if (body.displayName !== undefined) updates.displayName = body.displayName
  if (body.role !== undefined) updates.role = body.role
  if (body.password !== undefined && body.password !== '') {
    updates.passwordHash = await hashPassword(body.password)
  }

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.username, username))
  }

  return c.json({
    id: user.id,
    username: user.username,
    displayName: updates.displayName ?? user.displayName,
    role: updates.role ?? user.role,
    createdAt: user.createdAt,
  })
})

// DELETE /api/admin/users/:username
adminRoute.delete('/users/:username', async (c) => {
  const username = c.req.param('username')

  const db = c.get('db')
  const existing = await db.select().from(users).where(eq(users.username, username))
  if (existing.length === 0) {
    return c.json({ error: '用户不存在' }, 404)
  }

  if (existing[0].role === 'admin') {
    return c.json({ error: '不能删除管理员用户' }, 400)
  }

  await db.delete(users).where(eq(users.username, username))
  return c.json({ ok: true })
})

export default adminRoute

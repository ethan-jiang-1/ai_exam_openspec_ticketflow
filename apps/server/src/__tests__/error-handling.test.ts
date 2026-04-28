import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

function createAppWithErrorRoute() {
  const app = new Hono()
  app.use(cors())
  app.onError((err, c) => {
    return c.json(
      { error: err.message || 'Internal Server Error', code: 'INTERNAL_ERROR' },
      500,
    )
  })
  app.get('/boom', () => {
    throw new Error('something broke')
  })
  return app
}

describe('Error handling middleware', () => {
  it('should return unified JSON error for unhandled exceptions', async () => {
    const app = createAppWithErrorRoute()
    const res = await app.request('/boom')
    expect(res.status).toBe(500)
    expect(res.headers.get('content-type')).toContain('application/json')
    const body = await res.json()
    expect(body).toEqual({ error: 'something broke', code: 'INTERNAL_ERROR' })
  })
})

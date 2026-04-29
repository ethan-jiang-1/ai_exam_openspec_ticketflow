import { Hono } from 'hono'
import type { MiddlewareHandler } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import health from './routes/health'
import ticketsRoute from './routes/tickets'
import type { DbVariables } from './db/types'

export function createApp<E extends DbVariables>(dbMiddleware: MiddlewareHandler<E>) {
  const app = new Hono<E>()

  app.use(logger())
  app.use(cors())
  app.use('*', dbMiddleware)

  app.route('/', health)
  app.route('/api/tickets', ticketsRoute)

  app.onError((err, c) => {
    console.error('Unhandled error:', err)
    return c.json(
      {
        error: err.message || 'Internal Server Error',
        code: 'INTERNAL_ERROR',
      },
      500,
    )
  })

  return app
}

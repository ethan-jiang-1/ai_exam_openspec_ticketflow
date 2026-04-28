import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import health from './routes/health'
import ticketsRoute from './routes/tickets'
import './db'

const app = new Hono()

app.use(logger())
app.use(cors())

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

export default app

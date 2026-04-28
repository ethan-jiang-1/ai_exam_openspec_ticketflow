import 'dotenv/config'
import { serve } from '@hono/node-server'
import app from './app'

const port = Number(process.env.SERVER_PORT) || 3000
const host = process.env.SERVER_HOST || 'localhost'

try {
  console.log(`Server starting on ${host}:${port}...`)
  serve({ fetch: app.fetch, port, hostname: host }, (info) => {
    console.log(`Server running at http://${info.address}:${info.port}`)
  })
} catch (err: unknown) {
  if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
    console.error(`Error: Port ${port} is already in use. Set SERVER_PORT in .env to a different port.`)
    process.exit(1)
  }
  throw err
}

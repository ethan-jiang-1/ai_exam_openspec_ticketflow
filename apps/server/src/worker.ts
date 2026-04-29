/// <reference types="@cloudflare/workers-types" />

import { createApp } from './app'
import { createDb } from './db/d1'
import type { WorkerEnv } from './db/types'

const app = createApp<WorkerEnv>(async (c, next) => {
  const db = createDb(c.env.DB)
  c.set('db', db)
  await next()
})

export default app

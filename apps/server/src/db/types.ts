import type { D1Database } from '@cloudflare/workers-types'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { User } from '@ticketflow/shared'

export type Db = BetterSQLite3Database | DrizzleD1Database

export type DbVariables = { Variables: { db: Db } }

export type AuthVariables = { Variables: { db: Db; user: User | null } }

export type WorkerBindings = { Bindings: { DB: D1Database } }

export type WorkerEnv = DbVariables & WorkerBindings

export type NodeEnv = AuthVariables

/**
 * E2E smoke test — starts real server, walks full MVP flow, verifies results.
 * Usage: node scripts/e2e-smoke.mjs
 *
 * No external dependencies — uses Node.js built-in fetch + child_process.
 */

import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { unlinkSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const serverDir = resolve(root, 'apps', 'server')

const PORT = 13976
const BASE = `http://localhost:${PORT}`
const DB_PATH = resolve(serverDir, `.e2e-test-${Date.now()}.db`)

let serverProc = null

// ── Helpers ──────────────────────────────────────────────────────────

function log(step, msg) {
  console.log(`  [${step}] ${msg}`)
}

function logPass(step) {
  console.log(`  [${step}] ✓ PASS`)
}

function logFail(step, detail) {
  console.log(`  [${step}] ✗ FAIL — ${detail}`)
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const body = await res.json()
  return { status: res.status, body, headers: res.headers }
}

function extractCookie(setCookie) {
  if (!setCookie) return ''
  // Take the first cookie value up to ';'
  return setCookie.split(';')[0]
}

// ── Server lifecycle ─────────────────────────────────────────────────

async function startServer() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 15_000)

    serverProc = spawn('node', ['dist/index.js'], {
      cwd: serverDir,
      env: {
        ...process.env,
        DATABASE_PATH: DB_PATH,
        SERVER_PORT: String(PORT),
        SERVER_HOST: 'localhost',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let started = false
    serverProc.stdout.on('data', (data) => {
      const msg = data.toString()
      if (!started && msg.includes('Server running')) {
        started = true
        clearTimeout(timeout)
        resolve()
      }
    })

    serverProc.stderr.on('data', (data) => {
      // ignore noisy stderr (Hono logger goes here)
    })

    serverProc.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    serverProc.on('exit', (code) => {
      if (!started) {
        clearTimeout(timeout)
        reject(new Error(`Server exited with code ${code}`))
      }
    })
  })
}

async function seedServer() {
  // Seed via the seed script — it's idempotent
  return new Promise((resolve, reject) => {
    const seed = spawn('node', ['--import', 'tsx', 'src/db/seed.ts'], {
      cwd: serverDir,
      env: {
        ...process.env,
        DATABASE_PATH: DB_PATH,
      },
      stdio: 'pipe',
    })
    let output = ''
    seed.stdout.on('data', (d) => { output += d.toString() })
    seed.stderr.on('data', (d) => { output += d.toString() })
    seed.on('close', (code) => {
      if (code === 0) resolve(output)
      else reject(new Error(`Seed failed (code ${code}): ${output}`))
    })
  })
}

function stopServer() {
  if (serverProc) {
    serverProc.kill('SIGTERM')
    serverProc = null
  }
  // Clean up test DB
  try { if (existsSync(DB_PATH)) unlinkSync(DB_PATH) } catch {}
  try { if (existsSync(DB_PATH + '-shm')) unlinkSync(DB_PATH + '-shm') } catch {}
  try { if (existsSync(DB_PATH + '-wal')) unlinkSync(DB_PATH + '-wal') } catch {}
}

// ── Test steps ───────────────────────────────────────────────────────

async function testHealthCheck() {
  const { status } = await request('/health')
  if (status !== 200) throw new Error(`Expected 200, got ${status}`)
  logPass('health')
}

async function testGetUsers() {
  const { status, body } = await request('/api/auth/users')
  if (status !== 200) throw new Error(`Expected 200, got ${status}`)
  if (body.length < 3) throw new Error(`Expected 3+ users, got ${body.length}`)
  const names = body.map(u => u.username)
  if (!names.includes('submitter') || !names.includes('dispatcher') || !names.includes('completer')) {
    throw new Error(`Missing preset users: ${names}`)
  }
  logPass('GET /api/auth/users')
  return body
}

async function testLoginFail() {
  // Missing username
  const r1 = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({}) })
  if (r1.status !== 400) throw new Error(`Missing username: expected 400, got ${r1.status}`)

  // Non-existent user
  const r2 = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'nobody' }) })
  if (r2.status !== 401) throw new Error(`Non-existent user: expected 401, got ${r2.status}`)

  logPass('login failure cases')
}

async function testLogin(username) {
  const { status, body, headers } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  })
  if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`)
  if (body.username !== username) throw new Error(`Expected username="${username}", got "${body.username}"`)

  const setCookie = headers.get('set-cookie')
  if (!setCookie || !setCookie.includes('ticketflow-session=')) {
    throw new Error('No session cookie set')
  }

  logPass(`login as ${username}`)
  return extractCookie(setCookie)
}

async function testMe(cookie) {
  const { status, body } = await request('/api/auth/me', {
    headers: { Cookie: cookie },
  })
  if (status !== 200) throw new Error(`Expected 200, got ${status}`)
  if (!body.username) throw new Error('No username in /me response')
  logPass('GET /api/auth/me')
}

async function testMeUnauth() {
  const { status } = await request('/api/auth/me')
  if (status !== 401) throw new Error(`Expected 401, got ${status}`)
  logPass('GET /api/auth/me (unauthenticated)')
}

async function testCreateTicket(cookie) {
  const { status, body } = await request('/api/tickets', {
    method: 'POST',
    body: JSON.stringify({ title: 'E2E smoke test ticket', description: 'Created by automated smoke test' }),
    headers: { Cookie: cookie },
  })
  if (status !== 201) throw new Error(`Expected 201, got ${status}: ${JSON.stringify(body)}`)
  if (body.status !== 'submitted') throw new Error(`Expected "submitted", got "${body.status}"`)
  if (body.createdBy !== 'submitter') throw new Error(`Expected createdBy="submitter", got "${body.createdBy}"`)
  logPass('create ticket')
  return body
}

async function testAssignTicket(cookie, ticketId) {
  const { status, body } = await request(`/api/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedTo: 'completer' }),
    headers: { Cookie: cookie },
  })
  if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`)
  if (body.status !== 'assigned') throw new Error(`Expected "assigned", got "${body.status}"`)
  logPass('assign ticket')
}

async function testStartTicket(cookie, ticketId) {
  const { status, body } = await request(`/api/tickets/${ticketId}/start`, {
    method: 'PATCH',
    headers: { Cookie: cookie },
  })
  if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`)
  if (body.status !== 'in_progress') throw new Error(`Expected "in_progress", got "${body.status}"`)
  logPass('start ticket')
}

async function testCompleteTicket(cookie, ticketId) {
  const { status, body } = await request(`/api/tickets/${ticketId}/complete`, {
    method: 'PATCH',
    headers: { Cookie: cookie },
  })
  if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(body)}`)
  if (body.status !== 'completed') throw new Error(`Expected "completed", got "${body.status}"`)
  logPass('complete ticket')
}

async function testTicketAuthGuard() {
  const endpoints = [
    { method: 'GET', path: '/api/tickets' },
    { method: 'POST', path: '/api/tickets', body: '{}' },
  ]
  for (const ep of endpoints) {
    const { status } = await request(ep.path, { method: ep.method, body: ep.body })
    if (status !== 401) throw new Error(`${ep.method} ${ep.path}: expected 401, got ${status}`)
  }
  logPass('ticket auth guard')
}

async function testLogout(cookie) {
  const { status, body } = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Cookie: cookie },
  })
  if (status !== 200) throw new Error(`Expected 200, got ${status}`)
  if (!body.ok) throw new Error('Expected body.ok = true')

  // Verify session is destroyed
  const { status: meStatus } = await request('/api/auth/me', {
    headers: { Cookie: cookie },
  })
  if (meStatus !== 401) throw new Error(`Session not destroyed: expected 401, got ${meStatus}`)

  logPass('logout + session destroyed')
}

async function testSessionPersists() {
  // Login → me → me again — cookie should keep working
  const { headers } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'dispatcher' }),
  })
  const cookie = extractCookie(headers.get('set-cookie'))

  const r1 = await request('/api/auth/me', { headers: { Cookie: cookie } })
  const r2 = await request('/api/auth/me', { headers: { Cookie: cookie } })
  if (r1.status !== 200 || r2.status !== 200) throw new Error('Session did not persist across requests')
  if (r1.body.username !== r2.body.username) throw new Error('Session user changed between requests')

  logPass('session persists across requests')
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== TicketFlow E2E Smoke Test ===\n')

  let failed = 0
  let passed = 0

  try {
    console.log('Starting server...')
    await startServer()
    console.log('Server ready.\n')

    console.log('Seeding database...')
    await seedServer()
    console.log('Seed complete.\n')

    const steps = [
      ['Health check', () => testHealthCheck()],
      ['Auth: get users', () => testGetUsers()],
      ['Auth: login failure', () => testLoginFail()],
      ['Auth: me (unauth)', () => testMeUnauth()],
      ['Auth: login as submitter', async () => { globalThis.__cookie = await testLogin('submitter') }],
      ['Auth: me (auth)', () => testMe(globalThis.__cookie)],
      ['Tickets: auth guard', () => testTicketAuthGuard()],
      ['Tickets: create', async () => { globalThis.__ticket = await testCreateTicket(globalThis.__cookie) }],
      ['Tickets: assign', () => testAssignTicket(globalThis.__cookie, globalThis.__ticket.id)],
      ['Tickets: start', () => testStartTicket(globalThis.__cookie, globalThis.__ticket.id)],
      ['Tickets: complete', () => testCompleteTicket(globalThis.__cookie, globalThis.__ticket.id)],
      ['Auth: session persistence', () => testSessionPersists()],
      ['Auth: logout', () => testLogout(globalThis.__cookie)],
    ]

    for (const [name, fn] of steps) {
      try {
        await fn()
        passed++
      } catch (err) {
        logFail(name, err.message)
        failed++
      }
    }

  } catch (err) {
    console.error(`\nFATAL: ${err.message}`)
    failed++
  } finally {
    stopServer()
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main()

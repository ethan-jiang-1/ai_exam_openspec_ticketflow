import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.E2E_BASE_URL ?? 'https://ai-exam-openspec-ticketflow.ethan1-jiang.workers.dev'
const outDir = resolve(__dirname, '..', 'tests', 'e2e', 'screenshots')
mkdirSync(outDir, { recursive: true })

console.log(`诊断目标: ${BASE}\n`)

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

// Capture all network
const networkLog = []
page.on('request', (req) => {
  if (req.url().includes('/api/') || req.url().includes('.js') || req.url().includes('.css')) {
    console.log(`[REQ] ${req.method()} ${req.url()}`)
  }
})
page.on('response', async (res) => {
  const url = res.url()
  if (url.includes('/api/')) {
    let body = ''
    try { body = await res.text().catch(() => '<unreadable>') } catch { body = '<unreadable>' }
    console.log(`[RES] ${res.status()} ${url}`)
    console.log(`  Body: ${body.slice(0, 600)}`)
    networkLog.push({ status: res.status(), url, body: body.slice(0, 1000) })
  }
})
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`)
  }
})

// Step 1: Load login page
console.log('\n=== Step 1: GET /login ===')
try {
  const res = await page.goto(BASE + '/login', { timeout: 30000, waitUntil: 'load' })
  console.log(`Status: ${res.status()}, URL: ${page.url()}`)
} catch (e) {
  console.log(`GOTO ERROR: ${e.message}`)
}

await page.screenshot({ path: resolve(outDir, 'investigate-1-login-page.png'), fullPage: true })
const html = await page.content()
console.log(`HTML length: ${html.length}`)
console.log(`Has "请输入用户名": ${html.includes('请输入用户名')}`)
console.log(`Has form input: ${html.includes('<input')}`)
console.log(`Has antd: ${html.includes('ant-')}`)

// Step 2: Try to log in
console.log('\n=== Step 2: POST /api/auth/login (admin/admin) ===')
try {
  await page.fill('input[placeholder="请输入用户名"]', 'admin')
  await page.fill('input[placeholder="请输入密码"]', 'admin')
  await page.screenshot({ path: resolve(outDir, 'investigate-2-form-filled.png'), fullPage: true })
  console.log('Form filled')

  await page.click('button:has-text("登")')
  await page.waitForTimeout(5000)
  await page.screenshot({ path: resolve(outDir, 'investigate-3-after-login.png'), fullPage: true })
  console.log(`After login URL: ${page.url()}`)

  // Check what's on the page
  const afterHtml = await page.content()
  console.log(`Body contains "error": ${afterHtml.includes('error')}`)
  console.log(`Body contains "workbench": ${afterHtml.includes('workbench')}`)
  console.log(`Body contains "用户管理": ${afterHtml.includes('用户管理')}`)

  // Check cookies
  const cookies = await browser.contexts()[0].cookies()
  console.log(`Cookies: ${cookies.length}`)
  cookies.forEach(c => console.log(`  Cookie: ${c.name}=${c.value.slice(0,30)}... domain=${c.domain}`))
} catch (e) {
  console.log(`LOGIN ERROR: ${e.message}`)
}

// Step 3: Try direct API call
console.log('\n=== Step 3: Direct API test ===')
const apiRes = await page.evaluate(async () => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
    credentials: 'include',
  })
  const data = await res.json()
  return { status: res.status, data, headers: Object.fromEntries(res.headers) }
})
console.log(`Direct fetch result:`, JSON.stringify(apiRes, null, 2))

await browser.close()

// Write network log summary
const errors = networkLog.filter(e => e.status >= 400)
console.log(`\n=== 总结 ===`)
console.log(`API 错误 (4xx/5xx): ${errors.length}`)
errors.forEach(e => console.log(`  ${e.status} ${e.url}: ${e.body}`))

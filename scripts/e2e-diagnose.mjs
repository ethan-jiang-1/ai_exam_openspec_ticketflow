import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const screenshotsDir = resolve(__dirname, '..', 'tests', 'e2e', 'screenshots')

mkdirSync(screenshotsDir, { recursive: true })

console.log(`🔍 诊断模式启动: ${baseUrl}`)
console.log('Ctrl+C 或关闭浏览器窗口退出\n')

let browser
try {
  browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  page.on('console', (msg) => {
    console.log(`[browser console] [${msg.type()}] ${msg.text()}`)
  })

  page.on('request', (req) => {
    console.log(`[network] → ${req.method()} ${req.url()}`)
  })

  page.on('response', (res) => {
    console.log(
      `[network] ← ${res.status()} ${res.request().method()} ${res.url()}`,
    )
  })

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    console.log(`\n✅ 页面已加载: ${page.url()}`)
  } catch (e) {
    console.log(`\n❌ 连接失败: ${baseUrl}`)
    console.log(`   原因: ${e.message}`)
    console.log('   浏览器保持打开，可手动改 URL 重试')
  }

  // Keep browser open until Ctrl+C or close
  await new Promise(() => {
    // resolve never called - keeps process alive
  })
} catch (e) {
  console.error('启动浏览器失败:', e.message)
  process.exit(1)
} finally {
  if (browser) {
    const pages = browser.contexts().flatMap((c) => c.pages())
    if (pages.length > 0) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const screenshotPath = resolve(screenshotsDir, `diagnose-${ts}.png`)
      try {
        await pages[0].screenshot({ path: screenshotPath, fullPage: true })
        console.log(`\n📸 截图已保存: ${screenshotPath}`)
      } catch {
        // screenshot may fail if page already closed
      }
    }
    await browser.close()
    console.log('诊断模式退出')
  }
}

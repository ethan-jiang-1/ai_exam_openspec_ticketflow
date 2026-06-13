/**
 * Browser smoke test — Playwright-driven deployment health check.
 * Usage: node scripts/browser-smoke.mjs --url <url> [--clicks N] [--readonly] [--headed] [--wait MS] [--pretty] [--output-dir <dir>]
 */

import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Project root: .claude/skills/browser-smoke/scripts → project root (4 levels up)
const root = resolve(__dirname, '../../../..')

// ── CLI args ────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { url: '', clicks: 8, readonly: false, pretty: false, outputDir: '', headed: false, wait: 5000 }
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url': opts.url = args[++i]; break
      case '--clicks': opts.clicks = parseInt(args[++i], 10); break
      case '--readonly': opts.readonly = true; break
      case '--pretty': opts.pretty = true; break
      case '--output-dir': opts.outputDir = args[++i]; break
      case '--headed': opts.headed = true; break
      case '--wait': opts.wait = parseInt(args[++i], 10); break
    }
  }
  if (!opts.url) {
    console.error('Error: --url is required')
    process.exit(2)
  }
  return opts
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Phase 1: LOAD ───────────────────────────────────────────────────

async function phaseLoad(page) {
  const timing = await page.evaluate(() => {
    const t = performance.timing
    const firstByte = t.responseStart - t.requestStart
    const domReady = t.domContentLoadedEventEnd - t.navigationStart
    const fullLoad = t.loadEventEnd - t.navigationStart
    return { firstByte, domReady, fullLoad }
  })

  let verdict = 'unavailable'
  if (timing.firstByte > 0 || timing.fullLoad > 0) {
    if (timing.firstByte < 1000 && timing.fullLoad < 3000) verdict = 'fast'
    else if (timing.firstByte < 3000 && timing.fullLoad < 8000) verdict = 'normal'
    else verdict = 'slow'
  }

  return { ...timing, verdict }
}

// ── Phase 2: SCAN ───────────────────────────────────────────────────

async function phaseScan(page) {
  const content = await page.evaluate(() => {
    const title = document.title

    // Visible text samples
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        const style = window.getComputedStyle(parent)
        if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT
        const text = node.textContent.trim()
        if (!text) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    const texts = []
    let node
    while ((node = walker.nextNode()) && texts.length < 20) {
      texts.push(node.textContent.trim().slice(0, 100))
    }

    // Interactive elements
    const buttons = document.querySelectorAll('button:not([disabled]):not([aria-disabled="true"])')
    const links = document.querySelectorAll('a[href]:not([href=""])')
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input:not([type])')
    const selects = document.querySelectorAll('.ant-select-selector, select')

    const isVisible = (el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return false
      if (rect.bottom < 0 || rect.top > window.innerHeight) return false
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      return true
    }

    const visibleButtons = Array.from(buttons).filter(isVisible).length
    const visibleLinks = Array.from(links).filter(isVisible).length
    const visibleInputs = Array.from(inputs).filter(isVisible).length
    const visibleSelects = Array.from(selects).filter(isVisible).length
    const menuItems = document.querySelectorAll('.ant-menu-item:not(.ant-menu-item-disabled)')
    const visibleMenuItems = Array.from(menuItems).filter(isVisible).length

    const interactiveCount = visibleButtons + visibleLinks + visibleInputs + visibleSelects + visibleMenuItems

    // Error keywords
    const bodyText = document.body.innerText || ''
    const errorKeywords = /error|404|500|崩溃|not found|internal server error/i
    const hasErrorKeywords = errorKeywords.test(bodyText)

    return {
      title,
      visibleTextSample: texts,
      interactiveCount,
      interactiveBreakdown: {
        buttons: visibleButtons,
        links: visibleLinks,
        inputs: visibleInputs,
        selects: visibleSelects,
        menuItems: visibleMenuItems,
      },
      hasErrorKeywords,
    }
  })

  return content
}

// ── Phase 3: EXPLORE ─────────────────────────────────────────────────

async function phaseExplore(page, maxClicks, readonly) {
  const elements = await page.evaluate(() => {
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return false
      if (rect.bottom < 0 || rect.top > window.innerHeight) return false
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      return true
    }

    const collect = (selector, tagName) =>
      Array.from(document.querySelectorAll(selector))
        .filter((el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true' && isVisible(el))
        .map((el) => {
          const text = (el.textContent || '').trim().slice(0, 50)
          // Build a unique-ish selector
          let selector = tagName
          if (el.className && typeof el.className === 'string') {
            const cls = el.className.split(' ').filter(c => c && !c.startsWith('css-'))[0]
            if (cls) selector += '.' + cls
          }
          if (text) selector += `:has-text("${text.slice(0, 20)}")`
          return { tagName, visibleText: text, selector }
        })

    // Priority 1: buttons
    const buttons = collect('button:not([disabled])', 'button')

    // Priority 2: links
    const links = collect('a[href]:not([href=""])', 'a')

    // Priority 3: antd selects
    const selects = collect('.ant-select-selector', '.ant-select-selector')

    // Priority 4: inputs
    const inputs = collect('input[type="text"], input[type="search"]', 'input')

    // Priority 5: antd tags, menu items
    const tags = collect('.ant-tag', '.ant-tag')
    const menuItems = collect('.ant-menu-item:not(.ant-menu-item-disabled)', '.ant-menu-item')

    return [...buttons, ...links, ...selects, ...inputs, ...tags, ...menuItems]
  })

  if (readonly) {
    // Exclude potentially destructive elements
    const dangerous = /删除|确认|提交|保存|delete|confirm|submit|save/i
    const filtered = elements.filter((el) => {
      if (el.tagName === 'button' && dangerous.test(el.visibleText)) return false
      return true
    })
    elements.length = 0
    elements.push(...filtered)
  }

  // Shuffle within priority groups (elements are already ordered by priority, so just pick randomly)
  const selected = []
  const pool = [...elements]
  const limit = Math.min(maxClicks, pool.length)

  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    selected.push(pool.splice(idx, 1)[0])
  }

  const explorations = []
  const urlBefore = page.url()

  for (const el of selected) {
    let result = 'noChange'
    let error = null
    let domBefore
    let domAfter

    try {
      domBefore = await page.evaluate(() => document.querySelectorAll('*').length)
      await page.click(el.selector, { timeout: 3000 })
      await sleep(500)
      domAfter = await page.evaluate(() => document.querySelectorAll('*').length)

      const urlAfter = page.url()
      if (urlAfter !== urlBefore) {
        result = 'navigated'
        // Go back if we navigated away
        if (urlAfter !== 'about:blank') {
          try { await page.goBack({ timeout: 3000 }); await sleep(500) } catch { /* best-effort: goBack may fail if navigation was blocked */ }
        }
      } else if (Math.abs(domAfter - domBefore) / Math.max(domBefore, 1) > 0.1) {
        result = 'contentChanged'
      }
    } catch (e) {
      result = 'clickFailed'
      error = e.message
    }

    explorations.push({
      selector: el.selector,
      tagName: el.tagName,
      visibleText: el.visibleText,
      result,
      errors: error ? [error] : [],
    })
  }

  return explorations
}

// ── Error collection ─────────────────────────────────────────────────

function setupErrorCollection(page) {
  const errors = {
    console: [],
    network: [],
    antdErrorMessages: [],
  }

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.console.push({
        type: 'console',
        message: msg.text(),
        timestamp: new Date().toISOString(),
      })
    }
  })

  page.on('pageerror', (err) => {
    errors.console.push({
      type: 'console',
      message: err.message,
      timestamp: new Date().toISOString(),
    })
  })

  page.on('response', (res) => {
    if (res.status() >= 400) {
      errors.network.push({
        type: 'network',
        url: res.url(),
        status: res.status(),
        method: res.request().method(),
      })
    }
  })

  return errors
}

async function checkAntdErrors(page, errors) {
  try {
    const antdErrors = await page.evaluate(() => {
      const selectors = ['.ant-message-error', '.ant-notification-error', '.ant-message .ant-message-error']
      const results = []
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel)
        els.forEach((el) => {
          const text = (el.textContent || '').trim()
          if (text) results.push({ type: 'antd', message: text })
        })
      }
      return results
    })
    errors.antdErrorMessages.push(...antdErrors)
  } catch { /* antd check is best-effort */ }
}

async function checkWhiteScreen(page, errors) {
  try {
    const isEmpty = await page.evaluate(() => {
      return document.body && document.body.innerText.trim() === '' && window.location.href !== 'about:blank'
    })
    if (isEmpty) {
      errors.console.push({ type: 'whiteScreen', message: 'Page body has no visible text', timestamp: new Date().toISOString() })
    }
  } catch { /* whiteScreen check is best-effort */ }
}

// ── Verdict ──────────────────────────────────────────────────────────

function computeVerdict(errors, timingVerdict) {
  const hasErrors =
    errors.console.length > 0 ||
    errors.network.length > 0 ||
    errors.antdErrorMessages.length > 0

  if (hasErrors) return 'unhealthy'
  if (timingVerdict === 'slow') return 'warning'
  return 'healthy'
}

// ── Phase 4: REPORT ──────────────────────────────────────────────────

function generateMarkdownReport(data) {
  const { url, timestamp, timing, pageContent, errors, explorations, verdict } = data

  const lines = []

  lines.push('# 浏览器冒烟测试报告')
  lines.push('')
  lines.push(`- **测试 URL**: ${url}`)
  lines.push(`- **测试时间**: ${timestamp}`)
  lines.push('')

  // 加载速度
  lines.push('## 加载速度')
  lines.push('')
  if (timing.verdict === 'unavailable') {
    lines.push('无法获取加载时间指标（Performance API 不可用）。')
  } else {
    const labels = { fast: '快 🚀', normal: '正常 ✅', slow: '慢 ⚠️' }
    lines.push(`| 指标 | 数值 |`)
    lines.push(`|------|------|`)
    lines.push(`| 首字节 (firstByte) | ${timing.firstByte}ms |`)
    lines.push(`| DOM 就绪 (domReady) | ${timing.domReady}ms |`)
    lines.push(`| 完全加载 (fullLoad) | ${timing.fullLoad}ms |`)
    lines.push(`| 等级 | ${labels[timing.verdict] || timing.verdict} |`)
  }
  lines.push('')

  // 页面内容
  lines.push('## 页面内容')
  lines.push('')
  lines.push(`- **标题**: ${pageContent.title || '(无)'}`)
  lines.push(`- **可交互元素**: ${pageContent.interactiveCount} 个`)
  lines.push(`  - 按钮: ${pageContent.interactiveBreakdown.buttons}`)
  lines.push(`  - 链接: ${pageContent.interactiveBreakdown.links}`)
  lines.push(`  - 输入框: ${pageContent.interactiveBreakdown.inputs}`)
  lines.push(`  - 下拉框: ${pageContent.interactiveBreakdown.selects}`)
  lines.push(`  - 菜单项: ${pageContent.interactiveBreakdown.menuItems}`)
  if (pageContent.hasErrorKeywords) {
    lines.push(`- ⚠️ 页面包含错误关键词`)
  }
  if (pageContent.visibleTextSample.length > 0) {
    lines.push('')
    lines.push('**页面可见文本片段**:')
    for (const t of pageContent.visibleTextSample.slice(0, 10)) {
      lines.push(`- "${t}"`)
    }
  }
  lines.push('')

  // 交互探测
  lines.push('## 交互探测')
  lines.push('')
  if (explorations.length === 0) {
    lines.push('未执行交互探测（无可交互元素或点击数为 0）。')
  } else {
    const resultCounts = {}
    for (const e of explorations) {
      resultCounts[e.result] = (resultCounts[e.result] || 0) + 1
    }
    lines.push(`共点击 ${explorations.length} 个元素：`)
    for (const [r, c] of Object.entries(resultCounts)) {
      const labels = {
        navigated: '页面跳转',
        contentChanged: '内容变化',
        noChange: '无变化',
        clickFailed: '点击失败',
      }
      lines.push(`- ${labels[r] || r}: ${c} 次`)
    }
    lines.push('')
    lines.push('| 元素 | 动作 | 结果 |')
    lines.push('|------|------|------|')
    for (const e of explorations) {
      const labels = {
        navigated: '页面跳转',
        contentChanged: '内容变化',
        noChange: '无变化',
        clickFailed: '失败',
      }
      const icon = e.result === 'clickFailed' ? '❌' : e.result === 'noChange' ? '➖' : '✅'
      lines.push(`| ${e.visibleText || e.selector.slice(0, 30)} | ${e.tagName} | ${icon} ${labels[e.result] || e.result} |`)
    }
  }
  lines.push('')

  // 异常
  const totalErrors = errors.console.length + errors.network.length + errors.antdErrorMessages.length
  lines.push('## 异常')
  lines.push('')
  if (totalErrors === 0) {
    lines.push('未检测到异常。')
  } else {
    if (errors.console.length > 0) {
      lines.push('### Console 错误')
      for (const e of errors.console) {
        lines.push(`- \`${e.message}\``)
      }
      lines.push('')
    }
    if (errors.network.length > 0) {
      lines.push('### Network 错误')
      for (const e of errors.network) {
        lines.push(`- ${e.method} ${e.url} → ${e.status}`)
      }
      lines.push('')
    }
    if (errors.antdErrorMessages.length > 0) {
      lines.push('### 页面错误提示')
      for (const e of errors.antdErrorMessages) {
        lines.push(`- ${e.message}`)
      }
      lines.push('')
    }
  }

  // 综合判定
  const verdictLabels = {
    healthy: '🟢 健康 — 部署正常运行',
    warning: '🟡 警告 — 加载较慢但无其他异常',
    unhealthy: '🔴 异常 — 检测到错误，需要排查',
  }
  lines.push('## 综合判定')
  lines.push('')
  lines.push(verdictLabels[verdict] || verdict)
  lines.push('')

  return lines.join('\n')
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs()

  let browser
  try {
    browser = await chromium.launch({ headless: !opts.headed })
  } catch {
    console.error('Error: Chromium 未安装或启动失败。请运行: npx playwright install chromium')
    process.exit(2)
  }

  const context = await browser.newContext()
  const page = await context.newPage()

  // Setup error collection
  const errors = setupErrorCollection(page)

  let timing = { firstByte: 0, domReady: 0, fullLoad: 0, verdict: 'unavailable' }
  let pageContent = {
    title: '',
    visibleTextSample: [],
    interactiveCount: 0,
    interactiveBreakdown: { buttons: 0, links: 0, inputs: 0, selects: 0, menuItems: 0 },
    hasErrorKeywords: false,
  }
  let explorations = []

  try {
    // Phase 1: LOAD
    const response = await page.goto(opts.url, { timeout: 30000, waitUntil: 'load' })
    if (!response || response.status() >= 500) {
      errors.network.push({
        type: 'network',
        url: opts.url,
        status: response ? response.status() : 0,
        method: 'GET',
      })
    }
    timing = await phaseLoad(page)

    // Wait for SPA to render (configurable via --wait, default 5000ms)
    {
      const deadline = Date.now() + opts.wait
      let ready = false
      while (Date.now() < deadline && !ready) {
        await page.waitForTimeout(500)
        ready = await page.evaluate(() => {
          const textLen = document.body ? document.body.innerText.trim().length : 0
          const hasAntd = !!document.querySelector('.ant-layout,.ant-menu,.ant-btn,.ant-form,.ant-input,.ant-table,.ant-tag,.ant-select')
          return textLen > 20 || hasAntd
        }).catch(() => false)
      }
    }

    // Phase 2: SCAN
    pageContent = await phaseScan(page)

    // Check for antd errors and white screen before exploring
    await checkAntdErrors(page, errors)

    // Phase 3: EXPLORE
    if (pageContent.interactiveCount > 0 && opts.clicks > 0) {
      explorations = await phaseExplore(page, opts.clicks, opts.readonly)
    }

    // Final error checks after exploring
    await checkAntdErrors(page, errors)
    await checkWhiteScreen(page, errors)

  } catch (e) {
    errors.console.push({
      type: 'console',
      message: `Page load/explore error: ${e.message}`,
      timestamp: new Date().toISOString(),
    })
  }

  await browser.close()

  // Phase 4: REPORT
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const verdict = computeVerdict(errors, timing.verdict)

  const report = {
    url: opts.url,
    timestamp: new Date().toISOString(),
    timing,
    pageContent,
    errors,
    explorations,
    verdict,
  }

  // Write output files
  const outDir = opts.outputDir || resolve(root, 'data', 'smoke-reports')
  mkdirSync(outDir, { recursive: true })

  const jsonPath = resolve(outDir, `${timestamp}.json`)
  const mdPath = resolve(outDir, `${timestamp}.md`)

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8')
  writeFileSync(mdPath, generateMarkdownReport(report), 'utf-8')

  // Output JSON to stdout
  console.log(JSON.stringify(report, null, opts.pretty ? 2 : 0))

  // Exit code
  if (verdict === 'unhealthy') process.exit(1)
  process.exit(0)
}

main()

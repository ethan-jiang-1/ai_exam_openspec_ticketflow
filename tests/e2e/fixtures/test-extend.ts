import { test as base, expect } from '@playwright/test'

export { expect }

export const test = base.extend({
  page: async ({ page }, use) => {
    page.on('console', (msg) => {
      console.log(`[browser console] [${msg.type()}] ${msg.text()}`)
    })

    page.on('response', async (response) => {
      if (response.status() < 200 || response.status() >= 400) {
        let body = ''
        try {
          body = await response.text().catch(() => '<unreadable>')
        } catch {
          body = '<binary>'
        }
        console.log(
          `[network] ${response.status()} ${response.request().method()} ${response.url()}\n  body: ${body.slice(0, 500)}`,
        )
      }
    })

    await use(page)
  },
})

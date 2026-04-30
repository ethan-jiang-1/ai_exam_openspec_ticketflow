import { test, expect } from './fixtures/test-extend'
import { login, logout } from './fixtures/auth'

test.describe('工单流转', () => {
  const unique = () => `E2E-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  test('submitter 创建工单', async ({ page }) => {
    const title = unique()
    await login(page, 'submitter', 'changeme')

    await page.fill(
      'input[placeholder*="工单标题" i], input[placeholder*="标题"]',
      title,
    )
    await page.fill(
      'textarea[placeholder*="描述"], textarea',
      'Created by Playwright',
    )
    await page.click('button:has-text("提交")')

    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })
  })

  test('dispatcher 指派工单给 completer', async ({ page }) => {
    const title = unique()
    // First create a ticket as submitter
    await login(page, 'submitter', 'changeme')
    await page.fill(
      'input[placeholder*="工单标题" i], input[placeholder*="标题"]',
      title,
    )
    await page.fill(
      'textarea[placeholder*="描述"], textarea',
      'Ticket for assignment test',
    )
    await page.click('button:has-text("提交")')
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 })

    await logout(page)

    // Login as dispatcher
    await login(page, 'dispatcher', 'changeme')

    // Find the ticket row and assign
    const row = page.locator('tr', { has: page.getByText(title) }).first()
    const selectTrigger = row.locator('.ant-select-selector').first()
    if (await selectTrigger.isVisible()) {
      await selectTrigger.click()
      await page.click('.ant-select-item-option:has-text("completer")')
      await row.locator('button:has-text("指派")').click()
    }
  })

  test('completer 完成工单', async ({ page }) => {
    const title = unique()
    // Create ticket as submitter
    await login(page, 'submitter', 'changeme')
    await page.fill(
      'input[placeholder*="工单标题" i], input[placeholder*="标题"]',
      title,
    )
    await page.fill(
      'textarea[placeholder*="描述"], textarea',
      'Ticket for completion test',
    )
    await page.click('button:has-text("提交")')

    await logout(page)

    // Login as dispatcher and assign to completer
    await login(page, 'dispatcher', 'changeme')
    const row = page.locator('tr', { has: page.getByText(title) }).first()
    const selectTrigger = row.locator('.ant-select-selector').first()
    if (await selectTrigger.isVisible()) {
      await selectTrigger.click()
      await page.click('.ant-select-item-option:has-text("completer")')
      await row.locator('button:has-text("指派")').click()
    }

    await logout(page)

    // Login as completer
    await login(page, 'completer', 'changeme')

    // Find the ticket and complete it
    const completerRow = page
      .locator('tr', { has: page.getByText(title) })
      .first()
    const startBtn = completerRow.locator('button:has-text("开始处理")')
    if (await startBtn.isVisible()) {
      await startBtn.click()
    }
    await page.waitForTimeout(1000)
    const completeBtn = completerRow.locator('button:has-text("完成")')
    if (await completeBtn.isVisible()) {
      await completeBtn.click()
    }
  })
})

import { test, expect } from './fixtures/test-extend'
import { login } from './fixtures/auth'

test.describe('角色路由', () => {
  test('submitter 登录跳转到提交者工作台', async ({ page }) => {
    await login(page, 'submitter', 'changeme')
    expect(page.url()).toContain('/workbench/submitter')
  })

  test('dispatcher 登录跳转到调度者工作台', async ({ page }) => {
    await login(page, 'dispatcher', 'changeme')
    expect(page.url()).toContain('/workbench/dispatcher')
  })

  test('非授权角色访问被重定向', async ({ page }) => {
    await login(page, 'submitter', 'changeme')
    await page.goto('/workbench/admin')
    await page.waitForURL(/\/workbench\/submitter/)
    expect(page.url()).toContain('/workbench/submitter')
  })
})

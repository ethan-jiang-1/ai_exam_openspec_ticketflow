import { test, expect } from './fixtures/test-extend'
import { login } from './fixtures/auth'

test.describe('LoginPage', () => {
  test('表单式登录成功跳转', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder="请输入用户名"]', 'admin')
    await page.fill('input[placeholder="请输入密码"]', 'admin')
    await page.click('button:has-text("登")')
    await page.waitForURL(/\/workbench\/admin/)
    await expect(page.getByText('用户管理')).toBeVisible({ timeout: 10000 })
  })

  test('错误密码显示错误消息', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder="请输入用户名"]', 'admin')
    await page.fill('input[placeholder="请输入密码"]', 'wrongpassword')
    await page.click('button:has-text("登")')
    await expect(page.locator('.ant-message-error')).toBeVisible({
      timeout: 10000,
    })
    expect(page.url()).toContain('/login')
  })

  test('空用户名提交显示验证错误', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder="请输入密码"]', 'changeme')
    await page.click('button:has-text("登")')
    await expect(page.getByText('请输入用户名')).toBeVisible()
  })

  test('空密码提交显示验证错误', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[placeholder="请输入用户名"]', 'admin')
    await page.click('button:has-text("登")')
    await expect(page.getByText('请输入密码')).toBeVisible()
  })

  test('登录后 cookie 持久化', async ({ page }) => {
    await login(page, 'admin', 'admin')
    await page.goto('/workbench/admin')
    await expect(page).toHaveURL(/\/workbench\/admin/)
  })
})

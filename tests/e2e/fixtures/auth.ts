import type { Page } from '@playwright/test'

export async function login(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto('/login')
  await page.fill('input[placeholder="请输入用户名"]', username)
  await page.fill('input[placeholder="请输入密码"]', password)
  await page.click('button:has-text("登")')
  await page.waitForURL(/\/workbench\//)
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() =>
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),
  )
  await page.goto('/login')
}

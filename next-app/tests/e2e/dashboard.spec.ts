import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('should display homepage', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toContainText('廃棄物管理システム')
    await expect(page.locator('text=Next.js 14 + Prisma + Supabase')).toBeVisible()
  })

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/')

    // ダッシュボードボタンをクリック
    await page.click('text=ダッシュボード')

    // Note: 開発環境では認証をバイパスするので直接ダッシュボードに遷移
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h2')).toContainText('ダッシュボード')
  })

  test('should display statistics cards', async ({ page }) => {
    await page.goto('/dashboard')

    // 統計カードが表示されることを確認
    await expect(page.locator('text=組織数')).toBeVisible()
    await expect(page.locator('text=店舗数')).toBeVisible()
    await expect(page.locator('text=収集予定')).toBeVisible()
    await expect(page.locator('text=収集実績')).toBeVisible()
  })

  test('should navigate to organizations page', async ({ page }) => {
    await page.goto('/dashboard')

    // サイドバーの組織管理をクリック
    await page.click('text=組織管理')

    await expect(page).toHaveURL('/dashboard/organizations')
    await expect(page.locator('h2')).toContainText('組織管理')
  })
})


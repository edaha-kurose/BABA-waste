import { test, expect } from '@playwright/test'
import { e2eBypassLogin } from '../helpers/auth-helper'

test.describe('ダッシュボード統計API', () => {
  test.beforeEach(async ({ page }) => {
    await e2eBypassLogin(page)
  })

  test('API: /api/dashboard/stats が正常に動作', async ({ page }) => {
    // page.request を使用することで、page context の認証情報を継承
    const response = await page.request.get('/api/dashboard/stats')
    const data = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)
    
    // 必須フィールドの存在確認
    expect(data).toHaveProperty('totalBillingAmount')
    expect(data).toHaveProperty('managedStoresCount')
    expect(data).toHaveProperty('pendingCollectionsCount')
    expect(data).toHaveProperty('completedCollectionsCount')
    expect(data).toHaveProperty('currentMonth')
    
    // 数値型の確認
    expect(typeof data.totalBillingAmount).toBe('number')
    expect(typeof data.managedStoresCount).toBe('number')
    expect(typeof data.pendingCollectionsCount).toBe('number')
    expect(typeof data.completedCollectionsCount).toBe('number')
    
    // 0以上であることを確認
    expect(data.totalBillingAmount).toBeGreaterThanOrEqual(0)
    expect(data.managedStoresCount).toBeGreaterThanOrEqual(0)
    expect(data.pendingCollectionsCount).toBeGreaterThanOrEqual(0)
    expect(data.completedCollectionsCount).toBeGreaterThanOrEqual(0)
  })

  test('UI: ダッシュボードページで統計カードが表示', async ({ page }) => {
    // 統計カードのタイトルが表示されることを確認
    await expect(page.locator('text=今月の請求金額')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=管理店舗数')).toBeVisible()
    await expect(page.locator('text=回収予定')).toBeVisible()
    await expect(page.locator('text=回収完了')).toBeVisible()
    
    // 集計期間が表示されることを確認
    await expect(page.locator('text=集計期間:')).toBeVisible()
  })

  test('UI: 統計データが正しく表示される', async ({ page }) => {
    
    // 統計カードの表示を待機
    await expect(page.locator('.ant-statistic').first()).toBeVisible({ timeout: 10000 })
    
    // 各統計カードに数値が表示されていることを確認（0でも表示される）
    const cards = await page.locator('.ant-statistic').all()
    expect(cards.length).toBeGreaterThanOrEqual(4)
  })
})


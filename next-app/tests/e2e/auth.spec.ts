import { test, expect } from '@playwright/test'
import { e2eBypassLogin } from '../helpers/auth-helper'

test.describe('認証フロー', () => {
  test('E2Eバイパスログイン - Admin', async ({ page }) => {
    await e2eBypassLogin(page)
    await expect(page.locator('.ant-layout-sider, span:has-text("ダッシュボード")')).toBeVisible()
  })

  test.skip('クイックログイン - Emitter', async ({ page }) => {
    // E2Eバイパスは単一ロールのため、複数ロールテストはスキップ
  })

  test.skip('クイックログイン - Collector', async ({ page }) => {
    // E2Eバイパスは単一ロールのため、複数ロールテストはスキップ
  })

  test('セッション永続化の確認', async ({ page }) => {
    await e2eBypassLogin(page)
    
    // ページリロード
    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    await page.waitForFunction(() => {
      const text = document.body.textContent || '';
      return !text.includes('読み込み中');
    }, { timeout: 30000 })
    
    // 再度ログインページにリダイレクトされないことを確認（クエリパラメータは無視）
    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)
    await expect(page.locator('h1:has-text("ダッシュボード")')).toBeVisible({ timeout: 15000 })
  })
})


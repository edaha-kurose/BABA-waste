import { test, expect } from '@playwright/test'
import { e2eBypassLogin } from '../helpers/auth-helper'

test.describe('ダッシュボード - 基本機能', () => {
  test.beforeEach(async ({ page }) => {
    await e2eBypassLogin(page)
    // ダッシュボードのローディングが完了するまで待機
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    // ローディングスピナーが消えるまで待機
    await page.locator('.ant-spin-spinning').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
      console.log('⚠️ ローディングスピナーが見つからない（既に読み込み完了の可能性）')
    })
  })

  test('ログイン後、ダッシュボードが表示される', async ({ page }) => {
    // beforeEach で既にダッシュボードに到達しているはず
    await expect(page.locator('h1:has-text("ダッシュボード")')).toBeVisible({ timeout: 10000 })
  })

  test('統計カードが正しく表示される', async ({ page }) => {

    // 統計カードのタイトルが表示されることを確認
    await expect(page.locator('text=今月の請求金額')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=管理店舗数')).toBeVisible()
    await expect(page.locator('text=回収予定')).toBeVisible()
    await expect(page.locator('text=回収完了')).toBeVisible()
  })

  test.skip('サイドバーナビゲーション - テナント管理', async ({ page }) => {
    // TODO: メニュー構造が複雑で権限依存のため、直接URLアクセステストに変更を検討
    await page.goto('/dashboard/organizations')
    await expect(page).toHaveURL('/dashboard/organizations')
  })

  test.skip('サイドバーナビゲーション - 店舗管理', async ({ page }) => {
    // TODO: メニュー構造が複雑で権限依存のため、直接URLアクセステストに変更を検討
    await page.goto('/dashboard/stores')
    await expect(page).toHaveURL('/dashboard/stores')
  })

  test('システム情報カードが表示される', async ({ page }) => {

    // システム情報カードが表示される
    await expect(page.locator('text=システム情報')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=BABA廃棄物管理システムへようこそ')).toBeVisible()
  })
})


import { test, expect } from '@playwright/test'
import { e2eBypassLogin } from '../helpers/auth-helper'

test.describe('ロールベースアクセス制御 (RBAC)', () => {
  test.beforeEach(async ({ page }) => {
    await e2eBypassLogin(page)
    // サイドバーが完全に表示されるまで待機
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    await page.locator('.ant-layout-sider').waitFor({ state: 'visible', timeout: 10000 })
  })

  test.skip('Admin: 全メニューが表示される', async ({ page }) => {
    // TODO: メニュー構造が複雑で権限・データ依存のため、個別ページアクセステストに変更を検討
    // 主メニュー
    await expect(page.locator('span:has-text("ダッシュボード")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('span:has-text("廃棄依頼一覧")')).toBeVisible()
    await expect(page.locator('span:has-text("回収情報登録")')).toBeVisible()
    await expect(page.locator('span:has-text("JWNET登録データ")')).toBeVisible()
    await expect(page.locator('span:has-text("回収実績データ")')).toBeVisible()
    await expect(page.locator('span:has-text("取り込み履歴")')).toBeVisible()
    await expect(page.locator('span:has-text("店舗管理")')).toBeVisible()

    // 管理メニュー配下（force: true で強制クリック）
    await page.locator('span:has-text("管理メニュー")').click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('span:has-text("組織管理")')).toBeVisible()
    await expect(page.locator('span:has-text("ユーザー管理")')).toBeVisible()
    await expect(page.locator('span:has-text("収集業者管理")')).toBeVisible()
    await expect(page.locator('span:has-text("品目マップ")')).toBeVisible()
    await expect(page.locator('span:has-text("事業者組み合わせ")')).toBeVisible()
    await expect(page.locator('span:has-text("設定")')).toBeVisible()
  })

  test.skip('Emitter: 制限されたメニューのみ表示', async ({ page }) => {
    // TODO: Emitter 認証状態を作成して再度有効化（現在は Admin でログイン中）
    
    // 表示されるべきメニュー（Emitter）
    await expect(page.locator('span:has-text("ダッシュボード")')).toBeVisible()
    await expect(page.locator('span:has-text("店舗管理")')).toBeVisible()
    await expect(page.locator('span:has-text("廃棄依頼一覧")')).toBeVisible()
    await expect(page.locator('span:has-text("回収情報登録")')).toBeVisible()
    await expect(page.locator('span:has-text("回収実績データ")')).toBeVisible()
    
    // 表示されないべきメニュー
    const organizationsMenu = page.locator('nav span:has-text("組織管理")')
    const jwnetMenu = page.locator('nav span:has-text("JWNET登録データ")')
    const adminMenu = page.locator('nav span:has-text("管理メニュー")')
    
    await expect(organizationsMenu).toHaveCount(0)
    await expect(jwnetMenu).toHaveCount(0)
    await expect(adminMenu).toHaveCount(0)
  })

  test.skip('Transporter: 制限されたメニューのみ表示', async ({ page }) => {
    // TODO: Collector 認証状態を作成して再度有効化（現在は Admin でログイン中）
    
    // 表示されるべきメニュー（Transporter）
    await expect(page.locator('span:has-text("ダッシュボード")')).toBeVisible()
    await expect(page.locator('span:has-text("収集予定")')).toBeVisible()
    await expect(page.locator('span:has-text("収集登録")')).toBeVisible()
    
    // 表示されないべきメニュー
    const organizationsMenu = page.locator('nav span:has-text("組織管理")')
    const billingMenu = page.locator('nav span:has-text("請求管理")')
    const resultsMenu = page.locator('nav span:has-text("収集実績")')
    const adminMenu2 = page.locator('nav span:has-text("管理メニュー")')
    
    await expect(organizationsMenu).toHaveCount(0)
    await expect(billingMenu).toHaveCount(0)
    await expect(resultsMenu).toHaveCount(0)
    await expect(adminMenu2).toHaveCount(0)
  })

  test.skip('Emitter: 組織管理ページにアクセスできない', async ({ page }) => {
    // TODO: Emitter 認証状態を作成して再度有効化（現在は Admin でログイン中）
    
    // サイドバーに組織管理メニューが表示されていないことを確認
    const organizationsMenu = page.locator('nav span:has-text("組織管理")')
    await expect(organizationsMenu).toHaveCount(0)
  })
})


import { Page, expect } from '@playwright/test'

export async function quickLogin(page: Page, buttonText: string) {
  // ログインページに移動
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')
  
  // クイックログインボタンが表示されるのを待つ
  const loginButton = page.locator(`button:has-text("${buttonText}")`)
  await loginButton.waitFor({ state: 'visible', timeout: 5000 })
  
  // クイックログインボタンをクリック
  await loginButton.click()
  
  // セッション保存を待機（クイックログインは2秒待機するので少し余裕を持って3秒）
  await page.waitForTimeout(3000)
  
  // ダッシュボードへのリダイレクトを待つ（URL変更のみ確認）
  await page.waitForURL('/dashboard', { timeout: 15000 })
  
  // ページが完全に読み込まれるのを待つ
  await page.waitForLoadState('networkidle', { timeout: 10000 })
  
  // ダッシュボードが表示されたことを簡易確認（メニューが表示されればOK）
  await expect(page.locator('nav')).toBeVisible({ timeout: 5000 })
}

export const ADMIN_BUTTON = '👤 管理者でログイン'
export const EMITTER_BUTTON = '🏭 排出事業者でログイン'
export const COLLECTOR_BUTTON = '👥 収集業者でログイン'

// E2Eバイパス用の高速ログイン
export async function e2eBypassLogin(page: Page, targetPath: string = '/dashboard') {
  // E2Eバイパス用クッキーを設定
  await page.context().addCookies([
    { name: 'e2e-bypass', value: '1', domain: 'localhost', path: '/', httpOnly: false, sameSite: 'Lax' as const }
  ])

  // 直接ダッシュボードへ（バイパス用クエリ付き）
  await page.goto(`${targetPath}?e2e=1`, { waitUntil: 'networkidle', timeout: 45000 })

  // サイドメニュー(Sider) または メニュー文言の表示を確認
  const sider = page.locator('.ant-layout-sider')
  const dashboardLabel = page.locator('span:has-text("ダッシュボード")')
  await Promise.race([
    sider.waitFor({ state: 'visible', timeout: 10000 }),
    dashboardLabel.waitFor({ state: 'visible', timeout: 10000 }),
  ])
}


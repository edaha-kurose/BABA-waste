import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2, // ローカルでも2回リトライ（安定性向上）
  workers: process.env.CI ? 1 : 4, // 並列数を4に増やしてテスト高速化
  reporter: 'html',
  timeout: 120000, // テスト全体のタイムアウト120秒に延長
  use: {
    baseURL: 'http://localhost:3001', // 開発サーバーのポート（3001で起動中）
    trace: 'on-first-retry',
    actionTimeout: 25000, // アクション（クリック等）のタイムアウト25秒に延長
    navigationTimeout: 60000, // ページ遷移のタイムアウト60秒に延長
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 開発サーバー自動起動（既に起動している場合は再利用）
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true, // 既に起動中のサーバーを再利用
    timeout: 120000, // サーバー起動タイムアウト2分
  },
})


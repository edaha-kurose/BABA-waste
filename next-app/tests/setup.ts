import { beforeAll, afterAll } from 'vitest'

// テスト環境のセットアップ
beforeAll(async () => {
  console.log('Setting up test environment...')
  
  // 環境変数の設定
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  }
})

afterAll(async () => {
  console.log('Cleaning up test environment...')
})


import { test, expect } from '@playwright/test'
import { e2eBypassLogin } from '../helpers/auth-helper'

test.describe('基本APIエンドポイント', () => {
  test.beforeEach(async ({ page }) => {
    await e2eBypassLogin(page)
  })
  
  test('GET /api/organizations - 組織一覧取得', async ({ page }) => {
    const response = await page.request.get('/api/organizations')
    const data = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('count')
    expect(Array.isArray(data.data)).toBe(true)
    
    // データが存在する場合、最初のレコードの構造を確認
    if (data.data.length > 0) {
      const org = data.data[0]
      expect(org).toHaveProperty('id')
      expect(org).toHaveProperty('name')
      expect(org).toHaveProperty('code')
    }
  })

  test('GET /api/stores - 店舗一覧取得', async ({ page }) => {
    const response = await page.request.get('/api/stores')
    const data = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('count')
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('GET /api/dashboard/stats - ダッシュボード統計取得', async ({ page }) => {
    const response = await page.request.get('/api/dashboard/stats')
    const data = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)
    expect(data).toHaveProperty('totalBillingAmount')
    expect(data).toHaveProperty('managedStoresCount')
    expect(data).toHaveProperty('pendingCollectionsCount')
    expect(data).toHaveProperty('completedCollectionsCount')
  })
})


import { test, expect } from '@playwright/test'
import { e2eBypassLogin } from '../helpers/auth-helper'

test.describe('全APIエンドポイント', () => {
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

  test('GET /api/plans - 収集予定一覧取得', async ({ page }) => {
    const response = await page.request.get('/api/plans')
    const data = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('count')
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('GET /api/collection-requests - 収集依頼一覧取得', async ({ page }) => {
    const response = await page.request.get('/api/collection-requests')
    const data = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('count')
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('GET /api/collections - 収集実績一覧取得', async ({ page }) => {
    const response = await page.request.get('/api/collections')
    const data = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('count')
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('GET /api/waste-type-masters - 廃棄物マスター取得', async ({ page }) => {
    const response = await page.request.get('/api/waste-type-masters')
    const data = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('count')
    expect(Array.isArray(data.data)).toBe(true)
  })

  test('GET /api/jwnet-party-combinations - JWNET事業者組み合わせ取得', async ({ page }) => {
    const response = await page.request.get('/api/jwnet-party-combinations')
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
    expect(data).toHaveProperty('currentMonth')
  })

  test('全APIエンドポイント - 並行実行', async ({ page }) => {
    const endpoints = [
      '/api/organizations',
      '/api/stores',
      '/api/plans',
      '/api/collection-requests',
      '/api/collections',
      '/api/waste-type-masters',
      '/api/jwnet-party-combinations',
      '/api/dashboard/stats',
    ]

    const responses = await Promise.all(
      endpoints.map(endpoint => page.request.get(endpoint))
    )

    // 全てのエンドポイントが200を返すことを確認
    responses.forEach((response, index) => {
      expect(response.status()).toBe(200)
      console.log(`✅ ${endpoints[index]} - 200 OK`)
    })
  })
})



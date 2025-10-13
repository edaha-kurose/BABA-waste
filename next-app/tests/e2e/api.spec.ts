import { test, expect } from '@playwright/test'

test.describe('API Endpoints', () => {
  test('should return health check', async ({ request }) => {
    const response = await request.get('/api/health')
    const data = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)
    expect(data.status).toBe('ok')
    expect(data.version).toBe('0.1.0')
  })

  test('should return Prisma test', async ({ request }) => {
    const response = await request.get('/api/test')
    const data = await response.json()

    expect(response.status()).toBe(200)
    expect(data.status).toBe('ok')
  })

  test('should return organizations list', async ({ request }) => {
    const response = await request.get('/api/organizations')
    const data = await response.json()

    expect(response.ok()).toBeTruthy()
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('count')
    expect(Array.isArray(data.data)).toBe(true)
  })
})


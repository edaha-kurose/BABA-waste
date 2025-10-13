import { describe, it, expect, beforeAll } from 'vitest'

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

describe('Organizations API', () => {
  let testOrgId: string

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${API_BASE}/api/health`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data.version).toBe('0.1.0')
    })
  })

  describe('GET /api/test', () => {
    it('should verify Prisma client connection', async () => {
      const response = await fetch(`${API_BASE}/api/test`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data.message).toBe('Prisma client is working')
    })
  })

  describe('GET /api/organizations', () => {
    it('should return organizations list', async () => {
      const response = await fetch(`${API_BASE}/api/organizations`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('count')
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  describe('POST /api/organizations', () => {
    it('should create a new organization', async () => {
      const newOrg = {
        name: 'Test Organization',
        code: `TEST-${Date.now()}`,
      }

      const response = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newOrg),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data).toHaveProperty('id')
      expect(data.data.name).toBe(newOrg.name)
      expect(data.data.code).toBe(newOrg.code)

      testOrgId = data.data.id
    })

    it('should fail with invalid data', async () => {
      const response = await fetch(`${API_BASE}/api/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation Error')
    })
  })

  describe('GET /api/organizations/[id]', () => {
    it('should return organization details', async () => {
      // Skip if no test org created
      if (!testOrgId) return

      const response = await fetch(`${API_BASE}/api/organizations/${testOrgId}`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('id')
      expect(data.data.id).toBe(testOrgId)
    })

    it('should return 404 for non-existent organization', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await fetch(`${API_BASE}/api/organizations/${fakeId}`)

      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/organizations/[id]', () => {
    it('should update organization', async () => {
      // Skip if no test org created
      if (!testOrgId) return

      const updatedData = {
        name: 'Updated Test Organization',
      }

      const response = await fetch(`${API_BASE}/api/organizations/${testOrgId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.name).toBe(updatedData.name)
    })
  })

  describe('DELETE /api/organizations/[id]', () => {
    it('should delete organization (soft delete)', async () => {
      // Skip if no test org created
      if (!testOrgId) return

      const response = await fetch(`${API_BASE}/api/organizations/${testOrgId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('deleted_at')
      expect(data.data.deleted_at).not.toBeNull()
    })
  })
})


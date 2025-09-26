// ============================================================================
// ユーザーRepository (Dexie実装)
// 作成日: 2025-09-16
// 目的: ユーザーのデータアクセス
// ============================================================================

import { Repository } from '@/utils/repository'
import { User, UserCreate, UserUpdate } from '@contracts/v0/schema'
import { db, ensureDatabaseInitialized } from '@/utils/dexie-db'

export class DexieUserRepository implements Repository<User, UserCreate, UserUpdate> {
  private db = db

  async create(data: UserCreate): Promise<User> {
    await ensureDatabaseInitialized()
    
    const now = new Date().toISOString()
    const user: User = {
      ...data,
      // 重要: 渡されたidを無視して常にUUIDを採番（ID契約順守）
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    
    await this.db.users.add(user)
    return user
  }

  async findById(id: string): Promise<User | null> {
    await ensureDatabaseInitialized()
    return await this.db.users.get(id) || null
  }

  async findMany(): Promise<User[]> {
    await ensureDatabaseInitialized()
    return await this.db.users.toArray()
  }

  async findByEmail(email: string): Promise<User | null> {
    await ensureDatabaseInitialized()
    return await this.db.users
      .where('email')
      .equals(email)
      .first() || null
  }

  async findByOrgId(orgId: string): Promise<User[]> {
    await ensureDatabaseInitialized()
    return await this.db.users
      .where('org_id')
      .equals(orgId)
      .and(user => user.is_active)
      .toArray()
  }

  async findByRole(orgId: string, role: string): Promise<User[]> {
    await ensureDatabaseInitialized()
    return await this.db.users
      .where(['org_id', 'role'])
      .equals([orgId, role])
      .and(user => user.is_active)
      .toArray()
  }

  async search(orgId: string, query: string): Promise<User[]> {
    await ensureDatabaseInitialized()
    const lower = query.toLowerCase()
    return await this.db.users
      .filter(user =>
        user.is_active && (
          user.name.toLowerCase().includes(lower) ||
          user.email.toLowerCase().includes(lower)
        )
      )
      .toArray()
  }

  async update(id: string, data: UserUpdate): Promise<User> {
    await ensureDatabaseInitialized()
    
    const existing = await this.db.users.get(id)
    if (!existing) {
      throw new Error(`User with id ${id} not found`)
    }

    const updated: User = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    }

    await this.db.users.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await ensureDatabaseInitialized()
    const count = await this.db.users.where('id').equals(id).delete()
    if (count === 0) {
      throw new Error(`User with id ${id} not found`)
    }
  }

  async softDelete(id: string): Promise<boolean> {
    await ensureDatabaseInitialized()
    const existing = await this.db.users.get(id)
    if (!existing) return false

    const updated: User = {
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    }

    await this.db.users.put(updated)
    return true
  }

  async updateLastLogin(id: string): Promise<boolean> {
    await ensureDatabaseInitialized()
    const existing = await this.db.users.get(id)
    if (!existing) return false

    const updated: User = {
      ...existing,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await this.db.users.put(updated)
    return true
  }


  async findWithPagination(page: number, limit: number): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    await ensureDatabaseInitialized()
    const allUsers = await this.db.users.toArray()
    const total = allUsers.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const data = allUsers.slice(startIndex, endIndex)
    
    return { data, total, page, limit }
  }

  async createMany(inputs: UserCreate[]): Promise<User[]> {
    await ensureDatabaseInitialized()
    const users: User[] = []
    
    for (const input of inputs) {
      const user = await this.create(input)
      users.push(user)
    }
    
    return users
  }

  async updateMany(updates: Array<{ id: string; data: UserUpdate }>): Promise<User[]> {
    await ensureDatabaseInitialized()
    const results: User[] = []
    
    for (const update of updates) {
      const user = await this.update(update.id, update.data)
      results.push(user)
    }
    
    return results
  }

  async deleteMany(ids: string[]): Promise<void> {
    await ensureDatabaseInitialized()
    await this.db.users.bulkDelete(ids)
  }

  async count(): Promise<number> {
    await ensureDatabaseInitialized()
    return await this.db.users.count()
  }

  async exists(id: string): Promise<boolean> {
    await ensureDatabaseInitialized()
    const user = await this.db.users.get(id)
    return user !== undefined
  }

  // 組織別の統計情報
  async getStatsByOrg(orgId: string): Promise<{
    total: number
    active: number
    masters: number
    users: number
  }> {
    await ensureDatabaseInitialized()
    
    const users = await this.db.users
      .where('org_id')
      .equals(orgId)
      .toArray()

    const active = users.filter(u => u.is_active)
    const masters = active.filter(u => u.role === 'ADMIN')
    const regularUsers = active.filter(u => u.role === 'USER')

    return {
      total: users.length,
      active: active.length,
      masters: masters.length,
      users: regularUsers.length,
    }
  }
}

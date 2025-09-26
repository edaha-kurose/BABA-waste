// ============================================================================
// 組織管理 Repository (Dexie実装)
// 作成日: 2025-09-16
// 目的: IndexedDBを使用した組織データの管理
// ============================================================================

import { db } from '@/utils/dexie-db'
import { handleDexieError } from '@/utils/dexie-db'
import type { Organization, UserOrgRole } from '@contracts/v0/schema'
import type { OrgScopedRepository, PaginationParams, PaginatedResult } from '@/utils/repository'
import { createPaginationResult, ValidationError, NotFoundError, DuplicateError } from '@/utils/repository'

// ============================================================================
// 型定義
// ============================================================================

export interface CreateOrganizationInput {
  name: string
}

export interface UpdateOrganizationInput {
  name?: string
}

export interface OrganizationFilter {
  name?: string
  created_at?: string
}

// ============================================================================
// 組織Repository実装
// ============================================================================

export class DexieOrganizationRepository implements OrgScopedRepository<Organization, CreateOrganizationInput, UpdateOrganizationInput, OrganizationFilter> {
  // 基本CRUD操作
  async findById(id: string): Promise<Organization | null> {
    try {
      const organization = await db.organizations.get(id)
      return organization || null
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async findMany(filter: OrganizationFilter = {}): Promise<Organization[]> {
    try {
      let query = db.organizations.toCollection()
      
      if (filter.name) {
        query = query.filter(org => org.name.toLowerCase().includes(filter.name!.toLowerCase()))
      }
      
      if (filter.created_at) {
        query = query.filter(org => org.created_at.startsWith(filter.created_at!))
      }
      
      return await query.toArray()
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async create(input: CreateOrganizationInput): Promise<Organization> {
    try {
      // バリデーション
      if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('組織名は必須です', 'name')
      }
      
      // 重複チェック
      const existing = await db.organizations
        .where('name')
        .equals(input.name.trim())
        .first()
      
      if (existing) {
        throw new DuplicateError('Organization', 'name', input.name)
      }
      
      const organization: Organization = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        created_at: new Date().toISOString(),
      }
      
      await db.organizations.add(organization)
      return organization
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DuplicateError) {
        throw error
      }
      throw handleDexieError(error)
    }
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    try {
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError('Organization', id)
      }
      
      // バリデーション
      if (input.name !== undefined) {
        if (!input.name || input.name.trim().length === 0) {
          throw new ValidationError('組織名は必須です', 'name')
        }
        
        // 重複チェック（自分以外）
        const duplicate = await db.organizations
          .where('name')
          .equals(input.name.trim())
          .and(org => org.id !== id)
          .first()
        
        if (duplicate) {
          throw new DuplicateError('Organization', 'name', input.name)
        }
      }
      
      const updated: Organization = {
        ...existing,
        ...input,
        name: input.name?.trim() || existing.name,
      }
      
      await db.organizations.update(id, updated)
      return updated
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof DuplicateError) {
        throw error
      }
      throw handleDexieError(error)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError('Organization', id)
      }
      
      await db.organizations.delete(id)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw handleDexieError(error)
    }
  }

  // 検索・ページネーション
  async search(query: string, filter: OrganizationFilter = {}): Promise<Organization[]> {
    try {
      let results = await this.findMany(filter)
      
      if (query.trim()) {
        const searchTerm = query.toLowerCase()
        results = results.filter(org => 
          org.name.toLowerCase().includes(searchTerm)
        )
      }
      
      return results
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async findWithPagination(
    page: number,
    limit: number,
    filter: OrganizationFilter = {}
  ): Promise<PaginatedResult<Organization>> {
    try {
      const allResults = await this.findMany(filter)
      const total = allResults.length
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const data = allResults.slice(startIndex, endIndex)
      
      return createPaginationResult(data, total, page, limit)
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  // バッチ操作
  async createMany(inputs: CreateOrganizationInput[]): Promise<Organization[]> {
    try {
      const organizations: Organization[] = []
      
      for (const input of inputs) {
        const organization = await this.create(input)
        organizations.push(organization)
      }
      
      return organizations
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async updateMany(updates: Array<{ id: string; data: UpdateOrganizationInput }>): Promise<Organization[]> {
    try {
      const results: Organization[] = []
      
      for (const update of updates) {
        const organization = await this.update(update.id, update.data)
        results.push(organization)
      }
      
      return results
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    try {
      await db.organizations.bulkDelete(ids)
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  // 集計・統計
  async count(filter: OrganizationFilter = {}): Promise<number> {
    try {
      const results = await this.findMany(filter)
      return results.length
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const organization = await this.findById(id)
      return organization !== null
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  // 組織スコープ付きの操作
  async findByOrgId(orgId: string, filter: OrganizationFilter = {}): Promise<Organization[]> {
    try {
      // 組織テーブルでは、orgIdは組織自体のIDなので、IDで検索
      const organization = await this.findById(orgId)
      return organization ? [organization] : []
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async createForOrg(orgId: string, input: CreateOrganizationInput): Promise<Organization> {
    try {
      // 組織の作成は通常のcreateと同じ
      return await this.create(input)
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async updateForOrg(orgId: string, id: string, input: UpdateOrganizationInput): Promise<Organization> {
    try {
      // 組織の更新は通常のupdateと同じ
      return await this.update(id, input)
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async deleteForOrg(orgId: string, id: string): Promise<void> {
    try {
      // 組織の削除は通常のdeleteと同じ
      await this.delete(id)
    } catch (error) {
      throw handleDexieError(error)
    }
  }
}

// ============================================================================
// ユーザー組織ロールRepository実装
// ============================================================================

export interface CreateUserOrgRoleInput {
  user_id: string
  org_id: string
  role: 'ADMIN' | 'EMITTER' | 'TRANSPORTER' | 'DISPOSER'
}

export interface UpdateUserOrgRoleInput {
  role?: 'ADMIN' | 'EMITTER' | 'TRANSPORTER' | 'DISPOSER'
}

export interface UserOrgRoleFilter {
  user_id?: string
  org_id?: string
  role?: string
}

export class DexieUserOrgRoleRepository implements OrgScopedRepository<UserOrgRole, CreateUserOrgRoleInput, UpdateUserOrgRoleInput, UserOrgRoleFilter> {
  // 基本CRUD操作
  async findById(id: string): Promise<UserOrgRole | null> {
    try {
      const userOrgRole = await db.userOrgRoles.get(id)
      return userOrgRole || null
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async findMany(filter: UserOrgRoleFilter = {}): Promise<UserOrgRole[]> {
    try {
      let query = db.userOrgRoles.toCollection()
      
      if (filter.user_id) {
        query = query.filter(role => role.user_id === filter.user_id)
      }
      
      if (filter.org_id) {
        query = query.filter(role => role.org_id === filter.org_id)
      }
      
      if (filter.role) {
        query = query.filter(role => role.role === filter.role)
      }
      
      return await query.toArray()
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async create(input: CreateUserOrgRoleInput): Promise<UserOrgRole> {
    try {
      // バリデーション
      if (!input.user_id) {
        throw new ValidationError('ユーザーIDは必須です', 'user_id')
      }
      if (!input.org_id) {
        throw new ValidationError('組織IDは必須です', 'org_id')
      }
      if (!input.role) {
        throw new ValidationError('ロールは必須です', 'role')
      }
      
      // 重複チェック
      const existing = await db.userOrgRoles
        .where('[user_id+org_id+role]')
        .equals([input.user_id, input.org_id, input.role])
        .first()
      
      if (existing) {
        throw new DuplicateError('UserOrgRole', 'user_id+org_id+role', `${input.user_id}+${input.org_id}+${input.role}`)
      }
      
      const userOrgRole: UserOrgRole = {
        id: crypto.randomUUID(),
        user_id: input.user_id,
        org_id: input.org_id,
        role: input.role,
      }
      
      await db.userOrgRoles.add(userOrgRole)
      return userOrgRole
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DuplicateError) {
        throw error
      }
      throw handleDexieError(error)
    }
  }

  async update(id: string, input: UpdateUserOrgRoleInput): Promise<UserOrgRole> {
    try {
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError('UserOrgRole', id)
      }
      
      // バリデーション
      if (input.role !== undefined) {
        if (!input.role) {
          throw new ValidationError('ロールは必須です', 'role')
        }
        
        // 重複チェック（自分以外）
        const duplicate = await db.userOrgRoles
          .where('[user_id+org_id+role]')
          .equals([existing.user_id, existing.org_id, input.role])
          .and(role => role.id !== id)
          .first()
        
        if (duplicate) {
          throw new DuplicateError('UserOrgRole', 'user_id+org_id+role', `${existing.user_id}+${existing.org_id}+${input.role}`)
        }
      }
      
      const updated: UserOrgRole = {
        ...existing,
        ...input,
      }
      
      await db.userOrgRoles.update(id, updated)
      return updated
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof DuplicateError) {
        throw error
      }
      throw handleDexieError(error)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError('UserOrgRole', id)
      }
      
      await db.userOrgRoles.delete(id)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw handleDexieError(error)
    }
  }

  // 検索・ページネーション
  async search(query: string, filter: UserOrgRoleFilter = {}): Promise<UserOrgRole[]> {
    try {
      let results = await this.findMany(filter)
      
      if (query.trim()) {
        const searchTerm = query.toLowerCase()
        results = results.filter(role => 
          role.role.toLowerCase().includes(searchTerm)
        )
      }
      
      return results
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async findWithPagination(
    page: number,
    limit: number,
    filter: UserOrgRoleFilter = {}
  ): Promise<PaginatedResult<UserOrgRole>> {
    try {
      const allResults = await this.findMany(filter)
      const total = allResults.length
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const data = allResults.slice(startIndex, endIndex)
      
      return createPaginationResult(data, total, page, limit)
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  // バッチ操作
  async createMany(inputs: CreateUserOrgRoleInput[]): Promise<UserOrgRole[]> {
    try {
      const userOrgRoles: UserOrgRole[] = []
      
      for (const input of inputs) {
        const userOrgRole = await this.create(input)
        userOrgRoles.push(userOrgRole)
      }
      
      return userOrgRoles
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async updateMany(updates: Array<{ id: string; data: UpdateUserOrgRoleInput }>): Promise<UserOrgRole[]> {
    try {
      const results: UserOrgRole[] = []
      
      for (const update of updates) {
        const userOrgRole = await this.update(update.id, update.data)
        results.push(userOrgRole)
      }
      
      return results
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    try {
      await db.userOrgRoles.bulkDelete(ids)
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  // 集計・統計
  async count(filter: UserOrgRoleFilter = {}): Promise<number> {
    try {
      const results = await this.findMany(filter)
      return results.length
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const userOrgRole = await this.findById(id)
      return userOrgRole !== null
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  // 組織スコープ付きの操作
  async findByOrgId(orgId: string, filter: UserOrgRoleFilter = {}): Promise<UserOrgRole[]> {
    try {
      return await this.findMany({ ...filter, org_id: orgId })
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async createForOrg(orgId: string, input: CreateUserOrgRoleInput): Promise<UserOrgRole> {
    try {
      return await this.create({ ...input, org_id: orgId })
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async updateForOrg(orgId: string, id: string, input: UpdateUserOrgRoleInput): Promise<UserOrgRole> {
    try {
      return await this.update(id, input)
    } catch (error) {
      throw handleDexieError(error)
    }
  }

  async deleteForOrg(orgId: string, id: string): Promise<void> {
    try {
      await this.delete(id)
    } catch (error) {
      throw handleDexieError(error)
    }
  }
}

// ============================================================================
// エクスポート
// ============================================================================

export const dexieOrganizationRepository = new DexieOrganizationRepository()
export const dexieUserOrgRoleRepository = new DexieUserOrgRoleRepository()




// ============================================================================
// 組織管理 Repository (Supabase実装)
// 作成日: 2025-09-16
// 目的: Supabaseを使用した組織データの管理
// ============================================================================

import { supabase, handleSupabaseError } from '@/utils/supabase'
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

// ============================================================================
// 組織Repository実装
// ============================================================================

export class SupabaseOrganizationRepository implements OrgScopedRepository<Organization, CreateOrganizationInput, UpdateOrganizationInput, OrganizationFilter> {
  // 基本CRUD操作
  async findById(id: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw handleSupabaseError(error)
      }
      
      return data
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async findMany(filter: OrganizationFilter = {}): Promise<Organization[]> {
    try {
      let query = supabase.from('organizations').select('*')
      
      if (filter.name) {
        query = query.ilike('name', `%${filter.name}%`)
      }
      
      if (filter.created_at) {
        query = query.gte('created_at', filter.created_at)
      }
      
      const { data, error } = await query
      
      if (error) throw handleSupabaseError(error)
      
      return data || []
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async create(input: CreateOrganizationInput): Promise<Organization> {
    try {
      // バリデーション
      if (!input.name || input.name.trim().length === 0) {
        throw new ValidationError('組織名は必須です', 'name')
      }
      
      // 重複チェック
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', input.name.trim())
        .single()
      
      if (existing) {
        throw new DuplicateError('Organization', 'name', input.name)
      }
      
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: input.name.trim(),
        })
        .select()
        .single()
      
      if (error) throw handleSupabaseError(error)
      
      return data
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DuplicateError) {
        throw error
      }
      throw handleSupabaseError(error)
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
        const { data: duplicate } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', input.name.trim())
          .neq('id', id)
          .single()
        
        if (duplicate) {
          throw new DuplicateError('Organization', 'name', input.name)
        }
      }
      
      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: input.name?.trim(),
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw handleSupabaseError(error)
      
      return data
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof DuplicateError) {
        throw error
      }
      throw handleSupabaseError(error)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError('Organization', id)
      }
      
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)
      
      if (error) throw handleSupabaseError(error)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw handleSupabaseError(error)
    }
  }

  // 検索・ページネーション
  async search(query: string, filter: OrganizationFilter = {}): Promise<Organization[]> {
    try {
      let searchQuery = supabase.from('organizations').select('*')
      
      if (query.trim()) {
        searchQuery = searchQuery.or(`name.ilike.%${query}%`)
      }
      
      // フィルターを適用
      if (filter.name) {
        searchQuery = searchQuery.ilike('name', `%${filter.name}%`)
      }
      
      if (filter.created_at) {
        searchQuery = searchQuery.gte('created_at', filter.created_at)
      }
      
      const { data, error } = await searchQuery
      
      if (error) throw handleSupabaseError(error)
      
      return data || []
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async findWithPagination(
    page: number,
    limit: number,
    filter: OrganizationFilter = {}
  ): Promise<PaginatedResult<Organization>> {
    try {
      const offset = (page - 1) * limit
      
      // 総件数を取得
      let countQuery = supabase.from('organizations').select('*', { count: 'exact', head: true })
      if (filter.name) {
        countQuery = countQuery.ilike('name', `%${filter.name}%`)
      }
      if (filter.created_at) {
        countQuery = countQuery.gte('created_at', filter.created_at)
      }
      
      const { count, error: countError } = await countQuery
      if (countError) throw handleSupabaseError(countError)
      
      // データを取得
      let dataQuery = supabase.from('organizations').select('*')
      if (filter.name) {
        dataQuery = dataQuery.ilike('name', `%${filter.name}%`)
      }
      if (filter.created_at) {
        dataQuery = dataQuery.gte('created_at', filter.created_at)
      }
      
      const { data, error } = await dataQuery
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })
      
      if (error) throw handleSupabaseError(error)
      
      return createPaginationResult(data || [], count || 0, page, limit)
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  // バッチ操作
  async createMany(inputs: CreateOrganizationInput[]): Promise<Organization[]> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert(inputs.map(input => ({
          name: input.name.trim(),
        })))
        .select()
      
      if (error) throw handleSupabaseError(error)
      
      return data || []
    } catch (error) {
      throw handleSupabaseError(error)
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
      throw handleSupabaseError(error)
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .in('id', ids)
      
      if (error) throw handleSupabaseError(error)
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  // 集計・統計
  async count(filter: OrganizationFilter = {}): Promise<number> {
    try {
      let query = supabase.from('organizations').select('*', { count: 'exact', head: true })
      
      if (filter.name) {
        query = query.ilike('name', `%${filter.name}%`)
      }
      
      if (filter.created_at) {
        query = query.gte('created_at', filter.created_at)
      }
      
      const { count, error } = await query
      
      if (error) throw handleSupabaseError(error)
      
      return count || 0
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const organization = await this.findById(id)
      return organization !== null
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  // 組織スコープ付きの操作
  async findByOrgId(orgId: string, filter: OrganizationFilter = {}): Promise<Organization[]> {
    try {
      // 組織テーブルでは、orgIdは組織自体のIDなので、IDで検索
      const organization = await this.findById(orgId)
      return organization ? [organization] : []
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async createForOrg(orgId: string, input: CreateOrganizationInput): Promise<Organization> {
    try {
      // 組織の作成は通常のcreateと同じ
      return await this.create(input)
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async updateForOrg(orgId: string, id: string, input: UpdateOrganizationInput): Promise<Organization> {
    try {
      // 組織の更新は通常のupdateと同じ
      return await this.update(id, input)
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async deleteForOrg(orgId: string, id: string): Promise<void> {
    try {
      // 組織の削除は通常のdeleteと同じ
      await this.delete(id)
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }
}

// ============================================================================
// ユーザー組織ロールRepository実装
// ============================================================================

export class SupabaseUserOrgRoleRepository implements OrgScopedRepository<UserOrgRole, CreateUserOrgRoleInput, UpdateUserOrgRoleInput, UserOrgRoleFilter> {
  // 基本CRUD操作
  async findById(id: string): Promise<UserOrgRole | null> {
    try {
      const { data, error } = await supabase
        .from('user_org_roles')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw handleSupabaseError(error)
      }
      
      return data
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async findMany(filter: UserOrgRoleFilter = {}): Promise<UserOrgRole[]> {
    try {
      let query = supabase.from('user_org_roles').select('*')
      
      if (filter.user_id) {
        query = query.eq('user_id', filter.user_id)
      }
      
      if (filter.org_id) {
        query = query.eq('org_id', filter.org_id)
      }
      
      if (filter.role) {
        query = query.eq('role', filter.role)
      }
      
      const { data, error } = await query
      
      if (error) throw handleSupabaseError(error)
      
      return data || []
    } catch (error) {
      throw handleSupabaseError(error)
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
      const { data: existing } = await supabase
        .from('user_org_roles')
        .select('id')
        .eq('user_id', input.user_id)
        .eq('org_id', input.org_id)
        .eq('role', input.role)
        .single()
      
      if (existing) {
        throw new DuplicateError('UserOrgRole', 'user_id+org_id+role', `${input.user_id}+${input.org_id}+${input.role}`)
      }
      
      const { data, error } = await supabase
        .from('user_org_roles')
        .insert({
          user_id: input.user_id,
          org_id: input.org_id,
          role: input.role,
        })
        .select()
        .single()
      
      if (error) throw handleSupabaseError(error)
      
      return data
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DuplicateError) {
        throw error
      }
      throw handleSupabaseError(error)
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
        const { data: duplicate } = await supabase
          .from('user_org_roles')
          .select('id')
          .eq('user_id', existing.user_id)
          .eq('org_id', existing.org_id)
          .eq('role', input.role)
          .neq('id', id)
          .single()
        
        if (duplicate) {
          throw new DuplicateError('UserOrgRole', 'user_id+org_id+role', `${existing.user_id}+${existing.org_id}+${input.role}`)
        }
      }
      
      const { data, error } = await supabase
        .from('user_org_roles')
        .update({
          role: input.role,
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw handleSupabaseError(error)
      
      return data
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof DuplicateError) {
        throw error
      }
      throw handleSupabaseError(error)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError('UserOrgRole', id)
      }
      
      const { error } = await supabase
        .from('user_org_roles')
        .delete()
        .eq('id', id)
      
      if (error) throw handleSupabaseError(error)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw handleSupabaseError(error)
    }
  }

  // 検索・ページネーション
  async search(query: string, filter: UserOrgRoleFilter = {}): Promise<UserOrgRole[]> {
    try {
      let searchQuery = supabase.from('user_org_roles').select('*')
      
      if (query.trim()) {
        searchQuery = searchQuery.or(`role.ilike.%${query}%`)
      }
      
      // フィルターを適用
      if (filter.user_id) {
        searchQuery = searchQuery.eq('user_id', filter.user_id)
      }
      
      if (filter.org_id) {
        searchQuery = searchQuery.eq('org_id', filter.org_id)
      }
      
      if (filter.role) {
        searchQuery = searchQuery.eq('role', filter.role)
      }
      
      const { data, error } = await searchQuery
      
      if (error) throw handleSupabaseError(error)
      
      return data || []
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async findWithPagination(
    page: number,
    limit: number,
    filter: UserOrgRoleFilter = {}
  ): Promise<PaginatedResult<UserOrgRole>> {
    try {
      const offset = (page - 1) * limit
      
      // 総件数を取得
      let countQuery = supabase.from('user_org_roles').select('*', { count: 'exact', head: true })
      if (filter.user_id) {
        countQuery = countQuery.eq('user_id', filter.user_id)
      }
      if (filter.org_id) {
        countQuery = countQuery.eq('org_id', filter.org_id)
      }
      if (filter.role) {
        countQuery = countQuery.eq('role', filter.role)
      }
      
      const { count, error: countError } = await countQuery
      if (countError) throw handleSupabaseError(countError)
      
      // データを取得
      let dataQuery = supabase.from('user_org_roles').select('*')
      if (filter.user_id) {
        dataQuery = dataQuery.eq('user_id', filter.user_id)
      }
      if (filter.org_id) {
        dataQuery = dataQuery.eq('org_id', filter.org_id)
      }
      if (filter.role) {
        dataQuery = dataQuery.eq('role', filter.role)
      }
      
      const { data, error } = await dataQuery
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })
      
      if (error) throw handleSupabaseError(error)
      
      return createPaginationResult(data || [], count || 0, page, limit)
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  // バッチ操作
  async createMany(inputs: CreateUserOrgRoleInput[]): Promise<UserOrgRole[]> {
    try {
      const { data, error } = await supabase
        .from('user_org_roles')
        .insert(inputs)
        .select()
      
      if (error) throw handleSupabaseError(error)
      
      return data || []
    } catch (error) {
      throw handleSupabaseError(error)
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
      throw handleSupabaseError(error)
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_org_roles')
        .delete()
        .in('id', ids)
      
      if (error) throw handleSupabaseError(error)
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  // 集計・統計
  async count(filter: UserOrgRoleFilter = {}): Promise<number> {
    try {
      let query = supabase.from('user_org_roles').select('*', { count: 'exact', head: true })
      
      if (filter.user_id) {
        query = query.eq('user_id', filter.user_id)
      }
      
      if (filter.org_id) {
        query = query.eq('org_id', filter.org_id)
      }
      
      if (filter.role) {
        query = query.eq('role', filter.role)
      }
      
      const { count, error } = await query
      
      if (error) throw handleSupabaseError(error)
      
      return count || 0
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const userOrgRole = await this.findById(id)
      return userOrgRole !== null
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  // 組織スコープ付きの操作
  async findByOrgId(orgId: string, filter: UserOrgRoleFilter = {}): Promise<UserOrgRole[]> {
    try {
      return await this.findMany({ ...filter, org_id: orgId })
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async createForOrg(orgId: string, input: CreateUserOrgRoleInput): Promise<UserOrgRole> {
    try {
      return await this.create({ ...input, org_id: orgId })
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async updateForOrg(orgId: string, id: string, input: UpdateUserOrgRoleInput): Promise<UserOrgRole> {
    try {
      return await this.update(id, input)
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }

  async deleteForOrg(orgId: string, id: string): Promise<void> {
    try {
      await this.delete(id)
    } catch (error) {
      throw handleSupabaseError(error)
    }
  }
}

// ============================================================================
// エクスポート
// ============================================================================

export const supabaseOrganizationRepository = new SupabaseOrganizationRepository()
export const supabaseUserOrgRoleRepository = new SupabaseUserOrgRoleRepository()




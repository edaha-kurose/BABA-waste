// ============================================================================
// ユーザーRepository (SQL実装)
// 作成日: 2025-09-16
// 目的: ユーザーのデータアクセス
// ============================================================================

import { Repository } from '@/utils/repository'
import { User, UserCreate, UserUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlUserRepository implements Repository<User, UserCreate, UserUpdate> {
  async create(data: UserCreate): Promise<User> {
    const now = new Date().toISOString()
    const user: User = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
    }
    
    const { data: result, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`)
    }

    return result
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find user: ${error.message}`)
    }

    return data
  }

  async findMany(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name')

    if (error) {
      throw new Error(`Failed to find users: ${error.message}`)
    }

    return data || []
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find user by email: ${error.message}`)
    }

    return data
  }

  async findByOrgId(orgId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`Failed to find users by org: ${error.message}`)
    }

    return data || []
  }

  async findByRole(orgId: string, role: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('org_id', orgId)
      .eq('role', role)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`Failed to find users by role: ${error.message}`)
    }

    return data || []
  }

  async search(query: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name')

    if (error) {
      throw new Error(`Failed to search users: ${error.message}`)
    }

    return data || []
  }

  async update(id: string, data: UserUpdate): Promise<User> {
    const updated = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { data: result, error } = await supabase
      .from('users')
      .update(updated)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`User with id ${id} not found`)
      }
      throw new Error(`Failed to update user: ${error.message}`)
    }

    return result
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`)
    }
  }

  async softDelete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to soft delete user: ${error.message}`)
    }

    return true
  }

  async updateLastLogin(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ 
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to update last login: ${error.message}`)
    }

    return true
  }


  async findWithPagination(page: number, limit: number): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const startIndex = (page - 1) * limit
    
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .range(startIndex, startIndex + limit - 1)
      .order('name')

    if (error) {
      throw new Error(`Failed to find users with pagination: ${error.message}`)
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
    }
  }

  async createMany(inputs: UserCreate[]): Promise<User[]> {
    const users: User[] = []
    
    for (const input of inputs) {
      const user = await this.create(input)
      users.push(user)
    }
    
    return users
  }

  async updateMany(updates: Array<{ id: string; data: UserUpdate }>): Promise<User[]> {
    const results: User[] = []
    
    for (const update of updates) {
      const user = await this.update(update.id, update.data)
      results.push(user)
    }
    
    return results
  }

  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .in('id', ids)

    if (error) {
      throw new Error(`Failed to delete users: ${error.message}`)
    }
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw new Error(`Failed to count users: ${error.message}`)
    }

    return count || 0
  }

  async exists(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return false
      throw new Error(`Failed to check if user exists: ${error.message}`)
    }

    return data !== null
  }

  // 組織別の統計情報
  async getStatsByOrg(orgId: string): Promise<{
    total: number
    active: number
    masters: number
    users: number
  }> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('org_id', orgId)

    if (error) {
      throw new Error(`Failed to get stats by org: ${error.message}`)
    }

    const users = data || []
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

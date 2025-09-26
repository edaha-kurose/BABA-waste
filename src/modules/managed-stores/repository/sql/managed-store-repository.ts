import { Repository } from '@/utils/repository'
import { supabase } from '@/utils/supabase'
import type { ManagedStore, ManagedStoreCreate, ManagedStoreUpdate } from '@contracts/v0/schema'

export class SqlManagedStoreRepository implements Repository<ManagedStore, ManagedStoreCreate, ManagedStoreUpdate> {
  async create(data: ManagedStoreCreate): Promise<ManagedStore> {
    const { data: result, error } = await supabase
      .from('managed_stores')
      .insert([data])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create managed store: ${error.message}`)
    }

    return result
  }

  async findById(id: string): Promise<ManagedStore | null> {
    const { data, error } = await supabase
      .from('managed_stores')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to find managed store: ${error.message}`)
    }

    return data
  }

  async findMany(): Promise<ManagedStore[]> {
    const { data, error } = await supabase
      .from('managed_stores')
      .select('*')
      .order('store_code')

    if (error) {
      throw new Error(`Failed to fetch managed stores: ${error.message}`)
    }

    return data || []
  }

  async update(id: string, data: ManagedStoreUpdate): Promise<ManagedStore> {
    const { data: result, error } = await supabase
      .from('managed_stores')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update managed store: ${error.message}`)
    }

    return result
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('managed_stores')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete managed store: ${error.message}`)
    }
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('managed_stores')
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw new Error(`Failed to count managed stores: ${error.message}`)
    }

    return count || 0
  }

  async search(query: string): Promise<ManagedStore[]> {
    const { data, error } = await supabase
      .from('managed_stores')
      .select('*')
      .or(`store_code.ilike.%${query}%,store_name.ilike.%${query}%,area_name.ilike.%${query}%`)
      .order('store_code')

    if (error) {
      throw new Error(`Failed to search managed stores: ${error.message}`)
    }

    return data || []
  }

  async paginate(page: number, limit: number): Promise<{ data: ManagedStore[]; total: number }> {
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('managed_stores')
      .select('*', { count: 'exact' })
      .order('store_code')
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to paginate managed stores: ${error.message}`)
    }

    return { data: data || [], total: count || 0 }
  }

  async batchCreate(items: ManagedStoreCreate[]): Promise<ManagedStore[]> {
    const { data, error } = await supabase
      .from('managed_stores')
      .insert(items)
      .select()

    if (error) {
      throw new Error(`Failed to batch create managed stores: ${error.message}`)
    }

    return data || []
  }

  async batchUpdate(updates: { id: string; data: ManagedStoreUpdate }[]): Promise<ManagedStore[]> {
    const updatePromises = updates.map(({ id, data }) => this.update(id, data))
    return await Promise.all(updatePromises)
  }

  async batchDelete(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('managed_stores')
      .delete()
      .in('id', ids)

    if (error) {
      throw new Error(`Failed to batch delete managed stores: ${error.message}`)
    }
  }

  // 店舗コードで検索
  async findByStoreCode(storeCode: string): Promise<ManagedStore | null> {
    const { data, error } = await supabase
      .from('managed_stores')
      .select('*')
      .eq('store_code', storeCode)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to find managed store by code: ${error.message}`)
    }

    return data
  }

  // エリア長コードで検索
  async findByAreaManagerCode(areaManagerCode: string): Promise<ManagedStore[]> {
    const { data, error } = await supabase
      .from('managed_stores')
      .select('*')
      .eq('area_manager_code', areaManagerCode)
      .order('store_code')

    if (error) {
      throw new Error(`Failed to find managed stores by area manager code: ${error.message}`)
    }

    return data || []
  }
}

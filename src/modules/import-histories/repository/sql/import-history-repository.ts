import { Repository } from '@/utils/repository'
import { supabase } from '@/utils/supabase'
import type { ImportHistory, ImportHistoryCreate, ImportHistoryUpdate } from '@contracts/v0/schema'

export class SqlImportHistoryRepository implements Repository<ImportHistory, ImportHistoryCreate, ImportHistoryUpdate> {
  async create(data: ImportHistoryCreate): Promise<ImportHistory> {
    const { data: result, error } = await supabase
      .from('import_histories')
      .insert([data])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create import history: ${error.message}`)
    }

    return result
  }

  async findById(id: string): Promise<ImportHistory | null> {
    const { data, error } = await supabase
      .from('import_histories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to find import history: ${error.message}`)
    }

    return data
  }

  async findMany(): Promise<ImportHistory[]> {
    const { data, error } = await supabase
      .from('import_histories')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch import histories: ${error.message}`)
    }

    return data || []
  }

  async update(id: string, data: ImportHistoryUpdate): Promise<ImportHistory> {
    const { data: result, error } = await supabase
      .from('import_histories')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update import history: ${error.message}`)
    }

    return result
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('import_histories')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete import history: ${error.message}`)
    }
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from('import_histories')
      .select('*', { count: 'exact', head: true })

    if (error) {
      throw new Error(`Failed to count import histories: ${error.message}`)
    }

    return count || 0
  }

  async search(query: string): Promise<ImportHistory[]> {
    const { data, error } = await supabase
      .from('import_histories')
      .select('*')
      .or(`file_name.ilike.%${query}%,import_type.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search import histories: ${error.message}`)
    }

    return data || []
  }

  async paginate(page: number, limit: number): Promise<{ data: ImportHistory[]; total: number }> {
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('import_histories')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to paginate import histories: ${error.message}`)
    }

    return { data: data || [], total: count || 0 }
  }

  async batchCreate(items: ImportHistoryCreate[]): Promise<ImportHistory[]> {
    const { data, error } = await supabase
      .from('import_histories')
      .insert(items)
      .select()

    if (error) {
      throw new Error(`Failed to batch create import histories: ${error.message}`)
    }

    return data || []
  }

  async batchUpdate(updates: { id: string; data: ImportHistoryUpdate }[]): Promise<ImportHistory[]> {
    const updatePromises = updates.map(({ id, data }) => this.update(id, data))
    return await Promise.all(updatePromises)
  }

  async batchDelete(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('import_histories')
      .delete()
      .in('id', ids)

    if (error) {
      throw new Error(`Failed to batch delete import histories: ${error.message}`)
    }
  }
}

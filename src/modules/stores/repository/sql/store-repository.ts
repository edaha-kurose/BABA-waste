import { Repository } from '@/utils/repository'
import { Store, StoreCreate, StoreUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlStoreRepository implements Repository<Store, StoreCreate, StoreUpdate> {
  async create(data: StoreCreate): Promise<Store> {
    const { data: result, error } = await supabase
      .from('stores')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async findById(id: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findAll(): Promise<Store[]> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findMany(): Promise<Store[]> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async update(id: string, data: StoreUpdate): Promise<Store | null> {
    const { data: result, error } = await supabase
      .from('stores')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) return null
    return result
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('stores')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete store: ${error.message}`)
    }
  }
}

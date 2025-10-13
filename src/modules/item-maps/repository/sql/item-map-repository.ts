import { Repository } from '@/utils/repository'
import { ItemMap, ItemMapCreate, ItemMapUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlItemMapRepository implements Repository<ItemMap, ItemMapCreate, ItemMapUpdate> {
  async create(data: ItemMapCreate): Promise<ItemMap> {
    const { data: result, error } = await supabase
      .from('item_maps')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async findById(id: string): Promise<ItemMap | null> {
    const { data, error } = await supabase
      .from('item_maps')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findAll(): Promise<ItemMap[]> {
    const { data, error } = await supabase
      .from('item_maps')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findMany(): Promise<ItemMap[]> {
    const { data, error } = await supabase
      .from('item_maps')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async update(id: string, data: Partial<Omit<ItemMap, 'id' | 'created_at' | 'created_by'>>): Promise<ItemMap | null> {
    const { data: result, error } = await supabase
      .from('item_maps')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return null
    return result
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('item_maps')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete item map: ${error.message}`)
    }
  }
}

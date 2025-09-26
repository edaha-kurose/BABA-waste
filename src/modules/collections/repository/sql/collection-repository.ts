import { Repository } from '@/utils/repository'
import { Collection, CollectionCreate, CollectionUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlCollectionRepository implements Repository<Collection, CollectionCreate, CollectionUpdate> {
  async create(data: CollectionCreate): Promise<Collection> {
    const { data: result, error } = await supabase
      .from('collections')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async findById(id: string): Promise<Collection | null> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findAll(): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findMany(): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findByCollectionRequestId(collectionRequestId: string): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('collection_request_id', collectionRequestId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findByStatus(status: string): Promise<Collection[]> {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async update(id: string, data: Partial<Omit<Collection, 'id' | 'created_at' | 'created_by'>>): Promise<Collection | null> {
    const { data: result, error } = await supabase
      .from('collections')
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

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('collections')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      })
      .eq('id', id)

    return !error
  }
}

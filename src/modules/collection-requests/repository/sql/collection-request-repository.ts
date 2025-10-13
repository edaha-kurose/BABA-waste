import { Repository } from '@/utils/repository'
import { CollectionRequest, CollectionRequestCreate, CollectionRequestUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlCollectionRequestRepository implements Repository<CollectionRequest, CollectionRequestCreate, CollectionRequestUpdate> {
  async create(data: CollectionRequestCreate): Promise<CollectionRequest> {
    const { data: result, error } = await supabase
      .from('collection_requests')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async findById(id: string): Promise<CollectionRequest | null> {
    const { data, error } = await supabase
      .from('collection_requests')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findAll(): Promise<CollectionRequest[]> {
    const { data, error } = await supabase
      .from('collection_requests')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findMany(): Promise<CollectionRequest[]> {
    const { data, error } = await supabase
      .from('collection_requests')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findByStoreId(storeId: string): Promise<CollectionRequest[]> {
    const { data, error } = await supabase
      .from('collection_requests')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findByCollectorId(collectorId: string): Promise<CollectionRequest[]> {
    const { data, error } = await supabase
      .from('collection_requests')
      .select('*')
      .eq('collector_id', collectorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findByStatus(status: string): Promise<CollectionRequest[]> {
    const { data, error } = await supabase
      .from('collection_requests')
      .select('*')
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async update(id: string, data: CollectionRequestUpdate): Promise<CollectionRequest | null> {
    const { data: result, error } = await supabase
      .from('collection_requests')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: 'system',
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
      .from('collection_requests')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete collection request: ${error.message}`)
    }
  }
}

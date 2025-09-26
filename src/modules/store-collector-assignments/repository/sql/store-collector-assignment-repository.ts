import { Repository } from '@/utils/repository'
import { StoreCollectorAssignment, StoreCollectorAssignmentCreate, StoreCollectorAssignmentUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlStoreCollectorAssignmentRepository implements Repository<StoreCollectorAssignment, StoreCollectorAssignmentCreate, StoreCollectorAssignmentUpdate> {
  async create(data: StoreCollectorAssignmentCreate): Promise<StoreCollectorAssignment> {
    const { data: result, error } = await supabase
      .from('store_collector_assignments')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async findById(id: string): Promise<StoreCollectorAssignment | null> {
    const { data, error } = await supabase
      .from('store_collector_assignments')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findAll(): Promise<StoreCollectorAssignment[]> {
    const { data, error } = await supabase
      .from('store_collector_assignments')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findMany(): Promise<StoreCollectorAssignment[]> {
    const { data, error } = await supabase
      .from('store_collector_assignments')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findByStoreId(storeId: string): Promise<StoreCollectorAssignment[]> {
    const { data, error } = await supabase
      .from('store_collector_assignments')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('priority', { ascending: true })

    if (error) return []
    return data || []
  }

  async findByCollectorId(collectorId: string): Promise<StoreCollectorAssignment[]> {
    const { data, error } = await supabase
      .from('store_collector_assignments')
      .select('*')
      .eq('collector_id', collectorId)
      .is('deleted_at', null)
      .order('priority', { ascending: true })

    if (error) return []
    return data || []
  }

  async update(id: string, data: Partial<Omit<StoreCollectorAssignment, 'id' | 'created_at' | 'created_by'>>): Promise<StoreCollectorAssignment | null> {
    const { data: result, error } = await supabase
      .from('store_collector_assignments')
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
      .from('store_collector_assignments')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      })
      .eq('id', id)

    return !error
  }
}

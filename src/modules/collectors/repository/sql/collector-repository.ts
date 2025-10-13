import { Repository } from '@/utils/repository'
import { Collector, CollectorCreate, CollectorUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlCollectorRepository implements Repository<Collector, CollectorCreate, CollectorUpdate> {
  async create(data: CollectorCreate): Promise<Collector> {
    const { data: result, error } = await supabase
      .from('collectors')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async findById(id: string): Promise<Collector | null> {
    const { data, error } = await supabase
      .from('collectors')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findAll(): Promise<Collector[]> {
    const { data, error } = await supabase
      .from('collectors')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findMany(): Promise<Collector[]> {
    const { data, error } = await supabase
      .from('collectors')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async update(id: string, data: CollectorUpdate): Promise<Collector | null> {
    const { data: result, error } = await supabase
      .from('collectors')
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
      .from('collectors')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete collector: ${error.message}`)
    }
  }
}

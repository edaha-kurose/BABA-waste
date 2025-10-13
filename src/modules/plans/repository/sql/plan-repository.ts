import { Repository } from '@/utils/repository'
import { Plan, PlanCreate, PlanUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlPlanRepository implements Repository<Plan, PlanCreate, PlanUpdate> {
  async create(data: PlanCreate): Promise<Plan> {
    const { data: result, error } = await supabase
      .from('plans')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async findById(id: string): Promise<Plan | null> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findAll(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findMany(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async update(id: string, data: Partial<Omit<Plan, 'id' | 'created_at' | 'created_by'>>): Promise<Plan | null> {
    const { data: result, error } = await supabase
      .from('plans')
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
      .from('plans')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete plan: ${error.message}`)
    }
  }
}

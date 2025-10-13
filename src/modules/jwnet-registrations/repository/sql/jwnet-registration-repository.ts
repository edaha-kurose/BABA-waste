import { Repository } from '@/utils/repository'
import { JwnetRegistration, JwnetRegistrationCreate, JwnetRegistrationUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlJwnetRegistrationRepository implements Repository<JwnetRegistration, JwnetRegistrationCreate, JwnetRegistrationUpdate> {
  async create(data: JwnetRegistrationCreate): Promise<JwnetRegistration> {
    const { data: result, error } = await supabase
      .from('jwnet_registrations')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async findById(id: string): Promise<JwnetRegistration | null> {
    const { data, error } = await supabase
      .from('jwnet_registrations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findAll(): Promise<JwnetRegistration[]> {
    const { data, error } = await supabase
      .from('jwnet_registrations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findMany(): Promise<JwnetRegistration[]> {
    const { data, error } = await supabase
      .from('jwnet_registrations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findByCollectionId(collectionId: string): Promise<JwnetRegistration | null> {
    const { data, error } = await supabase
      .from('jwnet_registrations')
      .select('*')
      .eq('collection_id', collectionId)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findByStatus(status: string): Promise<JwnetRegistration[]> {
    const { data, error } = await supabase
      .from('jwnet_registrations')
      .select('*')
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async update(id: string, data: Partial<Omit<JwnetRegistration, 'id' | 'created_at' | 'created_by'>>): Promise<JwnetRegistration | null> {
    const { data: result, error } = await supabase
      .from('jwnet_registrations')
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
      .from('jwnet_registrations')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete JWNET registration: ${error.message}`)
    }
  }
}

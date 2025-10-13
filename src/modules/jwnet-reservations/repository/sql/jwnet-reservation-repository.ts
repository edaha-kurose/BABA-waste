import { Repository } from '@/utils/repository'
import { JwnetReservation, JwnetReservationCreate, JwnetReservationUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlJwnetReservationRepository implements Repository<JwnetReservation, JwnetReservationCreate, JwnetReservationUpdate> {
  async create(data: JwnetReservationCreate): Promise<JwnetReservation> {
    const { data: result, error } = await supabase
      .from('jwnet_reservations')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async findById(id: string): Promise<JwnetReservation | null> {
    const { data, error } = await supabase
      .from('jwnet_reservations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findAll(): Promise<JwnetReservation[]> {
    const { data, error } = await supabase
      .from('jwnet_reservations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findMany(): Promise<JwnetReservation[]> {
    const { data, error } = await supabase
      .from('jwnet_reservations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async findByCollectionRequestId(collectionRequestId: string): Promise<JwnetReservation | null> {
    const { data, error } = await supabase
      .from('jwnet_reservations')
      .select('*')
      .eq('collection_request_id', collectionRequestId)
      .is('deleted_at', null)
      .single()

    if (error) return null
    return data
  }

  async findByStatus(status: string): Promise<JwnetReservation[]> {
    const { data, error } = await supabase
      .from('jwnet_reservations')
      .select('*')
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return []
    return data || []
  }

  async update(id: string, data: Partial<Omit<JwnetReservation, 'id' | 'created_at' | 'created_by'>>): Promise<JwnetReservation | null> {
    const { data: result, error } = await supabase
      .from('jwnet_reservations')
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
      .from('jwnet_reservations')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete JWNET reservation: ${error.message}`)
    }
  }
}

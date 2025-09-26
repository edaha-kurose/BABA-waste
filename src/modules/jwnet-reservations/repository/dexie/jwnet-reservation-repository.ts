import { Repository } from '@/utils/repository'
import { JwnetReservation, JwnetReservationCreate, JwnetReservationUpdate } from '@contracts/v0/schema'
import { db } from '@/utils/dexie-db'

export class DexieJwnetReservationRepository implements Repository<JwnetReservation, JwnetReservationCreate, JwnetReservationUpdate> {
  private db = db

  async create(data: JwnetReservationCreate): Promise<JwnetReservation> {
    const now = new Date().toISOString()
    const reservation: JwnetReservation = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: 'system',
      updated_by: 'system',
      deleted_at: null,
    }
    
    await this.db.jwnetReservations.add(reservation)
    return reservation
  }

  async findById(id: string): Promise<JwnetReservation | null> {
    return await this.db.jwnetReservations.get(id) || null
  }

  async findAll(): Promise<JwnetReservation[]> {
    return await this.db.jwnetReservations.toArray()
  }

  async findMany(): Promise<JwnetReservation[]> {
    return await this.db.jwnetReservations.toArray()
  }

  async findByCollectionRequestId(collectionRequestId: string): Promise<JwnetReservation | null> {
    return await this.db.jwnetReservations
      .where('collection_request_id')
      .equals(collectionRequestId)
      .and(reservation => !reservation.deleted_at)
      .first() || null
  }

  async findByStatus(status: string): Promise<JwnetReservation[]> {
    return await this.db.jwnetReservations
      .where('status')
      .equals(status)
      .and(reservation => !reservation.deleted_at)
      .toArray()
  }

  async update(id: string, data: Partial<Omit<JwnetReservation, 'id' | 'created_at' | 'created_by'>>): Promise<JwnetReservation | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const updated: JwnetReservation = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.jwnetReservations.put(updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false

    const updated: JwnetReservation = {
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.jwnetReservations.put(updated)
    return true
  }
}

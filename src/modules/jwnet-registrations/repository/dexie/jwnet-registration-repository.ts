import { Repository } from '@/utils/repository'
import { JwnetRegistration, JwnetRegistrationCreate, JwnetRegistrationUpdate } from '@contracts/v0/schema'
import { db } from '@/utils/dexie-db'

export class DexieJwnetRegistrationRepository implements Repository<JwnetRegistration, JwnetRegistrationCreate, JwnetRegistrationUpdate> {
  private db = db

  async create(data: JwnetRegistrationCreate): Promise<JwnetRegistration> {
    const now = new Date().toISOString()
    const registration: JwnetRegistration = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: 'system',
      updated_by: 'system',
      deleted_at: null,
    }
    
    await this.db.jwnetRegistrations.add(registration)
    return registration
  }

  async findById(id: string): Promise<JwnetRegistration | null> {
    return await this.db.jwnetRegistrations.get(id) || null
  }

  async findAll(): Promise<JwnetRegistration[]> {
    return await this.db.jwnetRegistrations.toArray()
  }

  async findMany(): Promise<JwnetRegistration[]> {
    return await this.db.jwnetRegistrations.toArray()
  }

  async findByCollectionId(collectionId: string): Promise<JwnetRegistration | null> {
    return await this.db.jwnetRegistrations
      .where('collection_id')
      .equals(collectionId)
      .and(registration => !registration.deleted_at)
      .first() || null
  }

  async findByStatus(status: string): Promise<JwnetRegistration[]> {
    return await this.db.jwnetRegistrations
      .where('status')
      .equals(status)
      .and(registration => !registration.deleted_at)
      .toArray()
  }

  async update(id: string, data: Partial<Omit<JwnetRegistration, 'id' | 'created_at' | 'created_by'>>): Promise<JwnetRegistration | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const updated: JwnetRegistration = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.jwnetRegistrations.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`JwnetRegistration with id ${id} not found`)
    }

    const updated: JwnetRegistration = {
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.jwnetRegistrations.put(updated)
  }
}

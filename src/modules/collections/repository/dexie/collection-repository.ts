import { Repository } from '@/utils/repository'
import { Collection, CollectionCreate, CollectionUpdate } from '@contracts/v0/schema'
import { db } from '@/utils/dexie-db'

export class DexieCollectionRepository implements Repository<Collection, CollectionCreate, CollectionUpdate> {
  private db = db

  async create(data: CollectionCreate): Promise<Collection> {
    const now = new Date().toISOString()
    const collection: Collection = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: 'system',
      updated_by: 'system',
      deleted_at: null,
    }
    
    await this.db.collections.add(collection)
    return collection
  }

  async findById(id: string): Promise<Collection | null> {
    return await this.db.collections.get(id) || null
  }

  async findAll(): Promise<Collection[]> {
    return await this.db.collections.toArray()
  }

  async findMany(): Promise<Collection[]> {
    return await this.db.collections.toArray()
  }

  async findByCollectionRequestId(collectionRequestId: string): Promise<Collection[]> {
    return await this.db.collections
      .where('collection_request_id')
      .equals(collectionRequestId)
      .and(collection => !collection.deleted_at)
      .toArray()
  }

  async findByStatus(status: string): Promise<Collection[]> {
    return await this.db.collections
      .where('status')
      .equals(status)
      .and(collection => !collection.deleted_at)
      .toArray()
  }

  async update(id: string, data: Partial<Omit<Collection, 'id' | 'created_at' | 'created_by'>>): Promise<Collection | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const updated: Collection = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.collections.put(updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false

    const updated: Collection = {
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.collections.put(updated)
    return true
  }
}

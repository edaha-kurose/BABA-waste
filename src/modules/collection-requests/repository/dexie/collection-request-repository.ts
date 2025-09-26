import { Repository } from '@/utils/repository'
import { CollectionRequest, CollectionRequestCreate, CollectionRequestUpdate } from '@contracts/v0/schema'
import { db } from '@/utils/dexie-db'

export class DexieCollectionRequestRepository implements Repository<CollectionRequest, CollectionRequestCreate, CollectionRequestUpdate> {
  private db = db

  async create(data: Omit<CollectionRequest, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'deleted_at'>): Promise<CollectionRequest> {
    const now = new Date().toISOString()
    const request: CollectionRequest = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: 'system',
      updated_by: 'system',
      deleted_at: null,
    }
    
    await this.db.collectionRequests.add(request)
    return request
  }

  async findById(id: string): Promise<CollectionRequest | null> {
    return await this.db.collectionRequests.get(id) || null
  }

  async findAll(): Promise<CollectionRequest[]> {
    return await this.db.collectionRequests.toArray()
  }

  async findMany(): Promise<CollectionRequest[]> {
    return await this.db.collectionRequests.toArray()
  }

  async findByStoreId(storeId: string): Promise<CollectionRequest[]> {
    return await this.db.collectionRequests
      .where('store_id')
      .equals(storeId)
      .and(request => !request.deleted_at)
      .toArray()
  }

  async findByCollectorId(collectorId: string): Promise<CollectionRequest[]> {
    return await this.db.collectionRequests
      .where('collector_id')
      .equals(collectorId)
      .and(request => !request.deleted_at)
      .toArray()
  }

  async findByStatus(status: string): Promise<CollectionRequest[]> {
    return await this.db.collectionRequests
      .where('status')
      .equals(status)
      .and(request => !request.deleted_at)
      .toArray()
  }

  async update(id: string, data: Partial<Omit<CollectionRequest, 'id' | 'created_at' | 'created_by'>>): Promise<CollectionRequest | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const updated: CollectionRequest = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.collectionRequests.put(updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false

    const updated: CollectionRequest = {
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.collectionRequests.put(updated)
    return true
  }
}

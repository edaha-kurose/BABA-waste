import { Repository } from '@/utils/repository'
import { Store, StoreCreate, StoreUpdate } from '@contracts/v0/schema'
import { db, ensureDatabaseInitialized } from '@/utils/dexie-db'

export class DexieStoreRepository implements Repository<Store, StoreCreate, StoreUpdate> {
  private db = db

  async create(data: StoreCreate): Promise<Store> {
    await ensureDatabaseInitialized()
    
    const now = new Date().toISOString()
    const store: Store = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: 'system',
      updated_by: 'system',
      deleted_at: null,
    }
    
    await this.db.stores.add(store)
    return store
  }

  async findById(id: string): Promise<Store | null> {
    await ensureDatabaseInitialized()
    return await this.db.stores.get(id) || null
  }

  async findMany(): Promise<Store[]> {
    await ensureDatabaseInitialized()
    return await this.db.stores.toArray()
  }

  async update(id: string, data: StoreUpdate): Promise<Store> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`Store with id ${id} not found`)
    }

    const updated: Store = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.stores.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id)
    if (!existing) {
      throw new Error(`Store with id ${id} not found`)
    }

    const updated: Store = {
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.stores.put(updated)
  }

  // Repository インターフェースの必須メソッド
  async search(query: string): Promise<Store[]> {
    await ensureDatabaseInitialized()
    return await this.db.stores
      .where('name')
      .startsWithIgnoreCase(query)
      .or('store_code')
      .startsWithIgnoreCase(query)
      .toArray()
  }

  async findWithPagination(page: number, limit: number): Promise<{ data: Store[]; total: number; page: number; limit: number }> {
    await ensureDatabaseInitialized()
    const allStores = await this.db.stores.toArray()
    const total = allStores.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const data = allStores.slice(startIndex, endIndex)
    
    return { data, total, page, limit }
  }

  async createMany(inputs: StoreCreate[]): Promise<Store[]> {
    const stores: Store[] = []
    
    for (const input of inputs) {
      const store = await this.create(input)
      stores.push(store)
    }
    
    return stores
  }

  async updateMany(updates: Array<{ id: string; data: StoreUpdate }>): Promise<Store[]> {
    const results: Store[] = []
    
    for (const update of updates) {
      const store = await this.update(update.id, update.data)
      results.push(store)
    }
    
    return results
  }

  async deleteMany(ids: string[]): Promise<void> {
    await ensureDatabaseInitialized()
    for (const id of ids) {
      await this.delete(id)
    }
  }

  async count(): Promise<number> {
    await ensureDatabaseInitialized()
    return await this.db.stores.count()
  }

  async exists(id: string): Promise<boolean> {
    await ensureDatabaseInitialized()
    const store = await this.db.stores.get(id)
    return store !== undefined
  }
}

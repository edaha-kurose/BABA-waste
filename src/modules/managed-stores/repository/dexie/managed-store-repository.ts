import { Repository } from '@/utils/repository'
import { ensureDatabaseInitialized } from '@/utils/dexie-db'
import type { ManagedStore, ManagedStoreCreate, ManagedStoreUpdate } from '@contracts/v0/schema'

export class DexieManagedStoreRepository implements Repository<ManagedStore, ManagedStoreCreate, ManagedStoreUpdate> {
  private async getDb() {
    await ensureDatabaseInitialized()
    const { db } = await import('@/utils/dexie-db')
    return db
  }

  async create(data: ManagedStoreCreate): Promise<ManagedStore> {
    const db = await this.getDb()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    
    const managedStore: ManagedStore = {
      id,
      org_id: data.org_id,
      store_code: data.store_code,
      area_manager_code: data.area_manager_code,
      store_name: data.store_name,
      area_name: data.area_name,
      phone: data.phone,
      postal_code: data.postal_code,
      address1: data.address1,
      address2: data.address2,
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now,
      created_by: data.created_by || 'system',
      updated_by: data.updated_by || 'system',
      deleted_at: null,
    }

    await db.managedStores.add(managedStore)
    return managedStore
  }

  async findById(id: string): Promise<ManagedStore | null> {
    const db = await this.getDb()
    return await db.managedStores.get(id) || null
  }

  async findMany(): Promise<ManagedStore[]> {
    const db = await this.getDb()
    return await db.managedStores.orderBy('store_code').toArray()
  }

  async update(id: string, data: ManagedStoreUpdate): Promise<ManagedStore> {
    const db = await this.getDb()
    const now = new Date().toISOString()
    
    const updateData = {
      ...data,
      updated_at: now,
      updated_by: data.updated_by || 'system',
    }

    await db.managedStores.update(id, updateData)
    const updated = await db.managedStores.get(id)
    if (!updated) {
      throw new Error('Managed store not found')
    }
    return updated
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb()
    await db.managedStores.delete(id)
  }

  async count(): Promise<number> {
    const db = await this.getDb()
    return await db.managedStores.count()
  }

  async search(query: string): Promise<ManagedStore[]> {
    const db = await this.getDb()
    return await db.managedStores
      .filter(store => 
        store.store_code.toLowerCase().includes(query.toLowerCase()) ||
        store.store_name.toLowerCase().includes(query.toLowerCase()) ||
        store.area_name.toLowerCase().includes(query.toLowerCase())
      )
      .toArray()
  }

  async paginate(page: number, limit: number): Promise<{ data: ManagedStore[]; total: number }> {
    const db = await this.getDb()
    const offset = (page - 1) * limit
    const data = await db.managedStores
      .orderBy('store_code')
      .offset(offset)
      .limit(limit)
      .toArray()
    const total = await db.managedStores.count()
    return { data, total }
  }

  async batchCreate(items: ManagedStoreCreate[]): Promise<ManagedStore[]> {
    const db = await this.getDb()
    const now = new Date().toISOString()
    
    const managedStores = items.map(data => ({
      id: crypto.randomUUID(),
      org_id: data.org_id,
      store_code: data.store_code,
      area_manager_code: data.area_manager_code,
      store_name: data.store_name,
      area_name: data.area_name,
      phone: data.phone,
      postal_code: data.postal_code,
      address1: data.address1,
      address2: data.address2,
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now,
      created_by: data.created_by || 'system',
      updated_by: data.updated_by || 'system',
      deleted_at: null,
    }))

    await db.managedStores.bulkAdd(managedStores)
    return managedStores
  }

  async batchUpdate(updates: { id: string; data: ManagedStoreUpdate }[]): Promise<ManagedStore[]> {
    const db = await this.getDb()
    const now = new Date().toISOString()
    
    const updatePromises = updates.map(async ({ id, data }) => {
      const updateData = {
        ...data,
        updated_at: now,
        updated_by: data.updated_by || 'system',
      }
      await db.managedStores.update(id, updateData)
      return await db.managedStores.get(id)
    })

    const results = await Promise.all(updatePromises)
    return results.filter(Boolean) as ManagedStore[]
  }

  async batchDelete(ids: string[]): Promise<void> {
    const db = await this.getDb()
    await db.managedStores.bulkDelete(ids)
  }

  // 店舗コードで検索
  async findByStoreCode(storeCode: string): Promise<ManagedStore | null> {
    const db = await this.getDb()
    return await db.managedStores.where('store_code').equals(storeCode).first() || null
  }

  // エリア長コードで検索
  async findByAreaManagerCode(areaManagerCode: string): Promise<ManagedStore[]> {
    const db = await this.getDb()
    return await db.managedStores.where('area_manager_code').equals(areaManagerCode).toArray()
  }
}

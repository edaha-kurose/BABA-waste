import { Repository } from '@/utils/repository'
import { ItemMap, ItemMapCreate, ItemMapUpdate } from '@contracts/v0/schema'
import { db } from '@/utils/dexie-db'

export class DexieItemMapRepository implements Repository<ItemMap, ItemMapCreate, ItemMapUpdate> {
  private db = db

  async create(data: ItemMapCreate): Promise<ItemMap> {
    const now = new Date().toISOString()
    const itemMap: ItemMap = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: 'system',
      updated_by: 'system',
      deleted_at: null,
    }
    
    await this.db.itemMaps.add(itemMap)
    return itemMap
  }

  async findById(id: string): Promise<ItemMap | null> {
    return await this.db.itemMaps.get(id) || null
  }

  async findAll(): Promise<ItemMap[]> {
    return await this.db.itemMaps.toArray()
  }

  async findMany(): Promise<ItemMap[]> {
    return await this.db.itemMaps.toArray()
  }

  async update(id: string, data: Partial<Omit<ItemMap, 'id' | 'created_at' | 'created_by'>>): Promise<ItemMap | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const updated: ItemMap = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.itemMaps.put(updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false

    const updated: ItemMap = {
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.itemMaps.put(updated)
    return true
  }
}

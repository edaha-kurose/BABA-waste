import { Repository } from '@/utils/repository'
import { Collector, CollectorCreate, CollectorUpdate } from '@contracts/v0/schema'
import { db } from '@/utils/dexie-db'

export class DexieCollectorRepository implements Repository<Collector, CollectorCreate, CollectorUpdate> {
  private db = db

  async create(data: CollectorCreate): Promise<Collector> {
    const now = new Date().toISOString()
    const collector: Collector = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: 'system',
      updated_by: 'system',
      deleted_at: null,
    }
    
    await this.db.collectors.add(collector)
    return collector
  }

  async findById(id: string): Promise<Collector | null> {
    return await this.db.collectors.get(id)
  }

  async findAll(): Promise<Collector[]> {
    return await this.db.collectors.where({ deleted_at: null }).reverse().sortBy('created_at')
  }

  async findMany(): Promise<Collector[]> {
    return await this.db.collectors.where({ deleted_at: null }).reverse().sortBy('created_at')
  }

  async update(id: string, data: CollectorUpdate): Promise<Collector | null> {
    const existing = await this.db.collectors.get(id)
    if (!existing) return null

    const updated: Collector = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    }
    await this.db.collectors.put(updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.db.collectors.get(id)
    if (!existing) return false

    const updated: Collector = {
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await this.db.collectors.put(updated)
    return true
  }
}

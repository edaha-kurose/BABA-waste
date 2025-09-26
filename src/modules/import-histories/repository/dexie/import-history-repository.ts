import { Repository } from '@/utils/repository'
import { ensureDatabaseInitialized } from '@/utils/dexie-db'
import type { ImportHistory, ImportHistoryCreate, ImportHistoryUpdate } from '@contracts/v0/schema'

export class DexieImportHistoryRepository implements Repository<ImportHistory, ImportHistoryCreate, ImportHistoryUpdate> {
  private async getDb() {
    await ensureDatabaseInitialized()
    const { db } = await import('@/utils/dexie-db')
    return db
  }

  async create(data: ImportHistoryCreate): Promise<ImportHistory> {
    const db = await this.getDb()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    
    const importHistory: ImportHistory = {
      id,
      org_id: data.org_id,
      import_type: data.import_type,
      file_name: data.file_name,
      file_size: data.file_size,
      total_records: data.total_records,
      success_records: data.success_records,
      error_records: data.error_records,
      duplicate_records: data.duplicate_records,
      new_stores_created: data.new_stores_created,
      new_collectors_created: data.new_collectors_created,
      store_changes: data.store_changes,
      collector_changes: data.collector_changes,
      warnings: data.warnings,
      errors: data.errors,
      import_status: data.import_status,
      started_at: data.started_at,
      completed_at: data.completed_at,
      processing_time_ms: data.processing_time_ms,
      created_at: now,
      updated_at: now,
      created_by: data.created_by || 'system',
      updated_by: data.updated_by || 'system',
      deleted_at: null,
    }

    await db.importHistories.add(importHistory)
    return importHistory
  }

  async findById(id: string): Promise<ImportHistory | null> {
    const db = await this.getDb()
    return await db.importHistories.get(id) || null
  }

  async findMany(): Promise<ImportHistory[]> {
    const db = await this.getDb()
    return await db.importHistories.orderBy('created_at').reverse().toArray()
  }

  async update(id: string, data: ImportHistoryUpdate): Promise<ImportHistory> {
    const db = await this.getDb()
    const now = new Date().toISOString()
    
    const updateData = {
      ...data,
      updated_at: now,
      updated_by: data.updated_by || 'system',
    }

    await db.importHistories.update(id, updateData)
    const updated = await db.importHistories.get(id)
    if (!updated) {
      throw new Error('Import history not found')
    }
    return updated
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb()
    await db.importHistories.delete(id)
  }

  async count(): Promise<number> {
    const db = await this.getDb()
    return await db.importHistories.count()
  }

  async search(query: string): Promise<ImportHistory[]> {
    const db = await this.getDb()
    return await db.importHistories
      .filter(history => 
        history.file_name.toLowerCase().includes(query.toLowerCase()) ||
        history.import_type.toLowerCase().includes(query.toLowerCase())
      )
      .toArray()
  }

  async paginate(page: number, limit: number): Promise<{ data: ImportHistory[]; total: number }> {
    const db = await this.getDb()
    const offset = (page - 1) * limit
    const data = await db.importHistories
      .orderBy('created_at')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray()
    const total = await db.importHistories.count()
    return { data, total }
  }

  async batchCreate(items: ImportHistoryCreate[]): Promise<ImportHistory[]> {
    const db = await this.getDb()
    const now = new Date().toISOString()
    
    const importHistories = items.map(data => ({
      id: crypto.randomUUID(),
      org_id: data.org_id,
      import_type: data.import_type,
      file_name: data.file_name,
      file_size: data.file_size,
      total_records: data.total_records,
      success_records: data.success_records,
      error_records: data.error_records,
      duplicate_records: data.duplicate_records,
      new_stores_created: data.new_stores_created,
      new_collectors_created: data.new_collectors_created,
      store_changes: data.store_changes,
      collector_changes: data.collector_changes,
      warnings: data.warnings,
      errors: data.errors,
      import_status: data.import_status,
      started_at: data.started_at,
      completed_at: data.completed_at,
      processing_time_ms: data.processing_time_ms,
      created_at: now,
      updated_at: now,
      created_by: data.created_by || 'system',
      updated_by: data.updated_by || 'system',
      deleted_at: null,
    }))

    await db.importHistories.bulkAdd(importHistories)
    return importHistories
  }

  async batchUpdate(updates: { id: string; data: ImportHistoryUpdate }[]): Promise<ImportHistory[]> {
    const db = await this.getDb()
    const now = new Date().toISOString()
    
    const updatePromises = updates.map(async ({ id, data }) => {
      const updateData = {
        ...data,
        updated_at: now,
        updated_by: data.updated_by || 'system',
      }
      await db.importHistories.update(id, updateData)
      return await db.importHistories.get(id)
    })

    const results = await Promise.all(updatePromises)
    return results.filter(Boolean) as ImportHistory[]
  }

  async batchDelete(ids: string[]): Promise<void> {
    const db = await this.getDb()
    await db.importHistories.bulkDelete(ids)
  }
}

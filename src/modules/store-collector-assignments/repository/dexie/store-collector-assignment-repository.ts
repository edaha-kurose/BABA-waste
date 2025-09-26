import { Repository } from '@/utils/repository'
import { StoreCollectorAssignment, StoreCollectorAssignmentCreate, StoreCollectorAssignmentUpdate } from '@contracts/v0/schema'
import { db, ensureDatabaseInitialized } from '@/utils/dexie-db'

export class DexieStoreCollectorAssignmentRepository implements Repository<StoreCollectorAssignment, StoreCollectorAssignmentCreate, StoreCollectorAssignmentUpdate> {
  private db = db

  async create(data: StoreCollectorAssignmentCreate): Promise<StoreCollectorAssignment> {
    await ensureDatabaseInitialized()
    
    const now = new Date().toISOString()
    const assignment: StoreCollectorAssignment = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
      created_by: 'system',
      updated_by: 'system',
      deleted_at: null,
    }
    
    await this.db.storeCollectorAssignments.add(assignment)
    return assignment
  }

  async findById(id: string): Promise<StoreCollectorAssignment | null> {
    await ensureDatabaseInitialized()
    return await this.db.storeCollectorAssignments.get(id) || null
  }

  async findAll(): Promise<StoreCollectorAssignment[]> {
    await ensureDatabaseInitialized()
    return await this.db.storeCollectorAssignments.toArray()
  }

  async findMany(): Promise<StoreCollectorAssignment[]> {
    await ensureDatabaseInitialized()
    return await this.db.storeCollectorAssignments.toArray()
  }

  async findByStoreId(storeId: string): Promise<StoreCollectorAssignment[]> {
    await ensureDatabaseInitialized()
    return await this.db.storeCollectorAssignments
      .where('store_id')
      .equals(storeId)
      .and(assignment => !assignment.deleted_at)
      .toArray()
  }

  async findByCollectorId(collectorId: string): Promise<StoreCollectorAssignment[]> {
    await ensureDatabaseInitialized()
    return await this.db.storeCollectorAssignments
      .where('collector_id')
      .equals(collectorId)
      .and(assignment => !assignment.deleted_at)
      .toArray()
  }

  async update(id: string, data: Partial<Omit<StoreCollectorAssignment, 'id' | 'created_at' | 'created_by'>>): Promise<StoreCollectorAssignment | null> {
    const existing = await this.findById(id)
    if (!existing) return null

    const updated: StoreCollectorAssignment = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.storeCollectorAssignments.put(updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id)
    if (!existing) return false

    const updated: StoreCollectorAssignment = {
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    }

    await this.db.storeCollectorAssignments.put(updated)
    return true
  }
}

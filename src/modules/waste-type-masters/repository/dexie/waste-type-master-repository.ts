// ============================================================================
// 廃棄物種別マスターRepository (Dexie実装)
// 作成日: 2025-09-16
// 目的: 廃棄物種別マスターのデータアクセス
// ============================================================================

import { Repository } from '@/utils/repository'
import { WasteTypeMaster, WasteTypeMasterCreate, WasteTypeMasterUpdate } from '@contracts/v0/schema'
import { db, ensureDatabaseInitialized } from '@/utils/dexie-db'

export class DexieWasteTypeMasterRepository implements Repository<WasteTypeMaster, WasteTypeMasterCreate, WasteTypeMasterUpdate> {
  private db = db

  async create(data: WasteTypeMasterCreate): Promise<WasteTypeMaster> {
    await ensureDatabaseInitialized()
    
    const now = new Date().toISOString()
    const wasteTypeMaster: WasteTypeMaster = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
    }
    
    await this.db.wasteTypeMasters.add(wasteTypeMaster)
    return wasteTypeMaster
  }

  async findById(id: string): Promise<WasteTypeMaster | null> {
    await ensureDatabaseInitialized()
    return await this.db.wasteTypeMasters.get(id) || null
  }

  async findAll(): Promise<WasteTypeMaster[]> {
    await ensureDatabaseInitialized()
    return await this.db.wasteTypeMasters.toArray()
  }

  async findMany(): Promise<WasteTypeMaster[]> {
    await ensureDatabaseInitialized()
    return await this.db.wasteTypeMasters.toArray()
  }

  async findByCollectorId(collectorId: string): Promise<WasteTypeMaster[]> {
    await ensureDatabaseInitialized()
    return await this.db.wasteTypeMasters
      .where('collector_id')
      .equals(collectorId)
      .and(wasteTypeMaster => wasteTypeMaster.is_active)
      .toArray()
  }

  async findByWasteTypeCode(collectorId: string, wasteTypeCode: string): Promise<WasteTypeMaster | null> {
    await ensureDatabaseInitialized()
    return await this.db.wasteTypeMasters
      .where(['collector_id', 'waste_type_code'])
      .equals([collectorId, wasteTypeCode])
      .first() || null
  }

  async findByJwnetWasteCode(collectorId: string, jwnetWasteCode: string): Promise<WasteTypeMaster | null> {
    await ensureDatabaseInitialized()
    return await this.db.wasteTypeMasters
      .where('collector_id')
      .equals(collectorId)
      .and(wasteTypeMaster => 
        wasteTypeMaster.jwnet_waste_code === jwnetWasteCode && 
        wasteTypeMaster.is_active
      )
      .first() || null
  }

  async search(collectorId: string, query: string): Promise<WasteTypeMaster[]> {
    await ensureDatabaseInitialized()
    return await this.db.wasteTypeMasters
      .where('collector_id')
      .equals(collectorId)
      .and(wasteTypeMaster => 
        wasteTypeMaster.is_active && (
          wasteTypeMaster.waste_type_code.toLowerCase().includes(query.toLowerCase()) ||
          wasteTypeMaster.waste_type_name.toLowerCase().includes(query.toLowerCase()) ||
          wasteTypeMaster.waste_category.toLowerCase().includes(query.toLowerCase()) ||
          wasteTypeMaster.jwnet_waste_code.toLowerCase().includes(query.toLowerCase())
        )
      )
      .toArray()
  }

  async findByCategory(collectorId: string, category: string): Promise<WasteTypeMaster[]> {
    await ensureDatabaseInitialized()
    return await this.db.wasteTypeMasters
      .where('collector_id')
      .equals(collectorId)
      .and(wasteTypeMaster => 
        wasteTypeMaster.waste_category === category && 
        wasteTypeMaster.is_active
      )
      .toArray()
  }

  async findByClassification(collectorId: string, classification: string): Promise<WasteTypeMaster[]> {
    await ensureDatabaseInitialized()
    return await this.db.wasteTypeMasters
      .where('collector_id')
      .equals(collectorId)
      .and(wasteTypeMaster => 
        wasteTypeMaster.waste_classification === classification && 
        wasteTypeMaster.is_active
      )
      .toArray()
  }

  async update(id: string, data: Partial<WasteTypeMaster>): Promise<WasteTypeMaster | null> {
    await ensureDatabaseInitialized()
    
    const existing = await this.db.wasteTypeMasters.get(id)
    if (!existing) return null

    const updated: WasteTypeMaster = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    }

    await this.db.wasteTypeMasters.put(updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    await ensureDatabaseInitialized()
    const count = await this.db.wasteTypeMasters.where('id').equals(id).delete()
    return count > 0
  }

  async softDelete(id: string): Promise<boolean> {
    await ensureDatabaseInitialized()
    const existing = await this.db.wasteTypeMasters.get(id)
    if (!existing) return false

    const updated: WasteTypeMaster = {
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    }

    await this.db.wasteTypeMasters.put(updated)
    return true
  }

  // 収集業者別の統計情報
  async getStatsByCollector(collectorId: string): Promise<{
    total: number
    active: number
    categories: string[]
    classifications: string[]
  }> {
    await ensureDatabaseInitialized()
    
    const wasteTypeMasters = await this.db.wasteTypeMasters
      .where('collector_id')
      .equals(collectorId)
      .toArray()

    const active = wasteTypeMasters.filter(w => w.is_active)
    const categories = Array.from(new Set(active.map(w => w.waste_category)))
    const classifications = Array.from(new Set(active.map(w => w.waste_classification)))

    return {
      total: wasteTypeMasters.length,
      active: active.length,
      categories,
      classifications,
    }
  }
}

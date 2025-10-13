// ============================================================================
// JWNET廃棄物コードRepository (Dexie実装)
// 作成日: 2025-09-16
// 目的: JWNET廃棄物コードのデータアクセス
// ============================================================================

import { Repository } from '@/utils/repository'
import { JwnetWasteCode, JwnetWasteCodeCreate, JwnetWasteCodeUpdate } from '@contracts/v0/schema'
import { db, ensureDatabaseInitialized } from '@/utils/dexie-db'

export class DexieJwnetWasteCodeRepository implements Repository<JwnetWasteCode, JwnetWasteCodeCreate, JwnetWasteCodeUpdate> {
  private db = db

  async create(data: JwnetWasteCodeCreate): Promise<JwnetWasteCode> {
    await ensureDatabaseInitialized()
    
    const now = new Date().toISOString()
    const wasteCode: JwnetWasteCode = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
    }
    
    await this.db.jwnetWasteCodes.add(wasteCode)
    return wasteCode
  }

  async findById(id: string): Promise<JwnetWasteCode | null> {
    await ensureDatabaseInitialized()
    return await this.db.jwnetWasteCodes.get(id) || null
  }

  async findAll(): Promise<JwnetWasteCode[]> {
    await ensureDatabaseInitialized()
    return await this.db.jwnetWasteCodes.toArray()
  }

  async findMany(): Promise<JwnetWasteCode[]> {
    await ensureDatabaseInitialized()
    return await this.db.jwnetWasteCodes.toArray()
  }

  async findByWasteCode(wasteCode: string): Promise<JwnetWasteCode | null> {
    await ensureDatabaseInitialized()
    return await this.db.jwnetWasteCodes
      .where('waste_code')
      .equals(wasteCode)
      .first() || null
  }

  async findByCategory(category: string): Promise<JwnetWasteCode[]> {
    await ensureDatabaseInitialized()
    return await this.db.jwnetWasteCodes
      .where('waste_category')
      .equals(category)
      .and(wasteCode => wasteCode.is_active)
      .toArray()
  }

  async search(query: string): Promise<JwnetWasteCode[]> {
    await ensureDatabaseInitialized()
    return await this.db.jwnetWasteCodes
      .filter(wasteCode => 
        wasteCode.is_active && (
          wasteCode.waste_code.toLowerCase().includes(query.toLowerCase()) ||
          wasteCode.waste_name.toLowerCase().includes(query.toLowerCase()) ||
          wasteCode.waste_category.toLowerCase().includes(query.toLowerCase())
        )
      )
      .toArray()
  }

  async update(id: string, data: Partial<JwnetWasteCode>): Promise<JwnetWasteCode | null> {
    await ensureDatabaseInitialized()
    
    const existing = await this.db.jwnetWasteCodes.get(id)
    if (!existing) return null

    const updated: JwnetWasteCode = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    }

    await this.db.jwnetWasteCodes.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await ensureDatabaseInitialized()
    const count = await this.db.jwnetWasteCodes.where('id').equals(id).delete()
    if (count === 0) {
      throw new Error(`JwnetWasteCode with id ${id} not found`)
    }
  }

  async softDelete(id: string): Promise<boolean> {
    await ensureDatabaseInitialized()
    const existing = await this.db.jwnetWasteCodes.get(id)
    if (!existing) return false

    const updated: JwnetWasteCode = {
      ...existing,
      is_active: false,
      updated_at: new Date().toISOString(),
    }

    await this.db.jwnetWasteCodes.put(updated)
    return true
  }
}

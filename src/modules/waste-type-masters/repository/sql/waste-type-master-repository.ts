// ============================================================================
// 廃棄物種別マスターRepository (SQL実装)
// 作成日: 2025-09-16
// 目的: 廃棄物種別マスターのデータアクセス
// ============================================================================

import { Repository } from '@/utils/repository'
import { WasteTypeMaster, WasteTypeMasterCreate, WasteTypeMasterUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlWasteTypeMasterRepository implements Repository<WasteTypeMaster, WasteTypeMasterCreate, WasteTypeMasterUpdate> {
  async create(data: WasteTypeMasterCreate): Promise<WasteTypeMaster> {
    const now = new Date().toISOString()
    const wasteTypeMaster: WasteTypeMaster = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
    }
    
    const { data: result, error } = await supabase
      .from('waste_type_masters')
      .insert(wasteTypeMaster)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create waste type master: ${error.message}`)
    }

    return result
  }

  async findById(id: string): Promise<WasteTypeMaster | null> {
    const { data, error } = await supabase
      .from('waste_type_masters')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find waste type master: ${error.message}`)
    }

    return data
  }

  async findAll(): Promise<WasteTypeMaster[]> {
    const { data, error } = await supabase
      .from('waste_type_masters')
      .select('*')
      .order('waste_type_code')

    if (error) {
      throw new Error(`Failed to find waste type masters: ${error.message}`)
    }

    return data || []
  }

  async findMany(): Promise<WasteTypeMaster[]> {
    const { data, error } = await supabase
      .from('waste_type_masters')
      .select('*')
      .order('waste_type_code')

    if (error) {
      throw new Error(`Failed to find waste type masters: ${error.message}`)
    }

    return data || []
  }

  async findByCollectorId(collectorId: string): Promise<WasteTypeMaster[]> {
    const { data, error } = await supabase
      .from('waste_type_masters')
      .select('*')
      .eq('collector_id', collectorId)
      .eq('is_active', true)
      .order('waste_type_code')

    if (error) {
      throw new Error(`Failed to find waste type masters by collector: ${error.message}`)
    }

    return data || []
  }

  async findByWasteTypeCode(collectorId: string, wasteTypeCode: string): Promise<WasteTypeMaster | null> {
    const { data, error } = await supabase
      .from('waste_type_masters')
      .select('*')
      .eq('collector_id', collectorId)
      .eq('waste_type_code', wasteTypeCode)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find waste type master by code: ${error.message}`)
    }

    return data
  }

  async findByJwnetWasteCode(collectorId: string, jwnetWasteCode: string): Promise<WasteTypeMaster | null> {
    const { data, error } = await supabase
      .from('waste_type_masters')
      .select('*')
      .eq('collector_id', collectorId)
      .eq('jwnet_waste_code', jwnetWasteCode)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find waste type master by JWNET code: ${error.message}`)
    }

    return data
  }

  async search(collectorId: string, query: string): Promise<WasteTypeMaster[]> {
    const { data, error } = await supabase
      .from('waste_type_masters')
      .select('*')
      .eq('collector_id', collectorId)
      .eq('is_active', true)
      .or(`waste_type_code.ilike.%${query}%,waste_type_name.ilike.%${query}%,waste_category.ilike.%${query}%,jwnet_waste_code.ilike.%${query}%`)
      .order('waste_type_code')

    if (error) {
      throw new Error(`Failed to search waste type masters: ${error.message}`)
    }

    return data || []
  }

  async findByCategory(collectorId: string, category: string): Promise<WasteTypeMaster[]> {
    const { data, error } = await supabase
      .from('waste_type_masters')
      .select('*')
      .eq('collector_id', collectorId)
      .eq('waste_category', category)
      .eq('is_active', true)
      .order('waste_type_code')

    if (error) {
      throw new Error(`Failed to find waste type masters by category: ${error.message}`)
    }

    return data || []
  }

  async findByClassification(collectorId: string, classification: string): Promise<WasteTypeMaster[]> {
    const { data, error } = await supabase
      .from('waste_type_masters')
      .select('*')
      .eq('collector_id', classification)
      .eq('waste_classification', classification)
      .eq('is_active', true)
      .order('waste_type_code')

    if (error) {
      throw new Error(`Failed to find waste type masters by classification: ${error.message}`)
    }

    return data || []
  }

  async update(id: string, data: Partial<WasteTypeMaster>): Promise<WasteTypeMaster | null> {
    const updated = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { data: result, error } = await supabase
      .from('waste_type_masters')
      .update(updated)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to update waste type master: ${error.message}`)
    }

    return result
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('waste_type_masters')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete waste type master: ${error.message}`)
    }
  }

  async softDelete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('waste_type_masters')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to soft delete waste type master: ${error.message}`)
    }

    return true
  }

  // 収集業者別の統計情報
  async getStatsByCollector(collectorId: string): Promise<{
    total: number
    active: number
    categories: string[]
    classifications: string[]
  }> {
    const { data, error } = await supabase
      .from('waste_type_masters')
      .select('*')
      .eq('collector_id', collectorId)

    if (error) {
      throw new Error(`Failed to get stats by collector: ${error.message}`)
    }

    const wasteTypeMasters = data || []
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

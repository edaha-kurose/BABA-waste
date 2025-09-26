// ============================================================================
// JWNET廃棄物コードRepository (SQL実装)
// 作成日: 2025-09-16
// 目的: JWNET廃棄物コードのデータアクセス
// ============================================================================

import { Repository } from '@/utils/repository'
import { JwnetWasteCode, JwnetWasteCodeCreate, JwnetWasteCodeUpdate } from '@contracts/v0/schema'
import { supabase } from '@/utils/supabase'

export class SqlJwnetWasteCodeRepository implements Repository<JwnetWasteCode, JwnetWasteCodeCreate, JwnetWasteCodeUpdate> {
  async create(data: JwnetWasteCodeCreate): Promise<JwnetWasteCode> {
    const now = new Date().toISOString()
    const wasteCode: JwnetWasteCode = {
      id: crypto.randomUUID(),
      ...data,
      created_at: now,
      updated_at: now,
    }
    
    const { data: result, error } = await supabase
      .from('jwnet_waste_codes')
      .insert(wasteCode)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create JWNET waste code: ${error.message}`)
    }

    return result
  }

  async findById(id: string): Promise<JwnetWasteCode | null> {
    const { data, error } = await supabase
      .from('jwnet_waste_codes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find JWNET waste code: ${error.message}`)
    }

    return data
  }

  async findAll(): Promise<JwnetWasteCode[]> {
    const { data, error } = await supabase
      .from('jwnet_waste_codes')
      .select('*')
      .order('waste_code')

    if (error) {
      throw new Error(`Failed to find JWNET waste codes: ${error.message}`)
    }

    return data || []
  }

  async findMany(): Promise<JwnetWasteCode[]> {
    const { data, error } = await supabase
      .from('jwnet_waste_codes')
      .select('*')
      .order('waste_code')

    if (error) {
      throw new Error(`Failed to find JWNET waste codes: ${error.message}`)
    }

    return data || []
  }

  async findByWasteCode(wasteCode: string): Promise<JwnetWasteCode | null> {
    const { data, error } = await supabase
      .from('jwnet_waste_codes')
      .select('*')
      .eq('waste_code', wasteCode)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to find JWNET waste code: ${error.message}`)
    }

    return data
  }

  async findByCategory(category: string): Promise<JwnetWasteCode[]> {
    const { data, error } = await supabase
      .from('jwnet_waste_codes')
      .select('*')
      .eq('waste_category', category)
      .eq('is_active', true)
      .order('waste_code')

    if (error) {
      throw new Error(`Failed to find JWNET waste codes by category: ${error.message}`)
    }

    return data || []
  }

  async search(query: string): Promise<JwnetWasteCode[]> {
    const { data, error } = await supabase
      .from('jwnet_waste_codes')
      .select('*')
      .eq('is_active', true)
      .or(`waste_code.ilike.%${query}%,waste_name.ilike.%${query}%,waste_category.ilike.%${query}%`)
      .order('waste_code')

    if (error) {
      throw new Error(`Failed to search JWNET waste codes: ${error.message}`)
    }

    return data || []
  }

  async update(id: string, data: Partial<JwnetWasteCode>): Promise<JwnetWasteCode | null> {
    const updated = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { data: result, error } = await supabase
      .from('jwnet_waste_codes')
      .update(updated)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to update JWNET waste code: ${error.message}`)
    }

    return result
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('jwnet_waste_codes')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete JWNET waste code: ${error.message}`)
    }

    return true
  }

  async softDelete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('jwnet_waste_codes')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to soft delete JWNET waste code: ${error.message}`)
    }

    return true
  }
}

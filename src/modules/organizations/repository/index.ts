// ============================================================================
// 組織管理 Repository 統一インターフェース
// 作成日: 2025-09-16
// 目的: DexieとSupabaseの実装を統一して提供
// ============================================================================

import { dexieOrganizationRepository, dexieUserOrgRoleRepository } from './dexie/organization-repository'
import { supabaseOrganizationRepository, supabaseUserOrgRoleRepository } from './sql/organization-repository'
import type { Organization, UserOrgRole } from '@contracts/v0/schema'
import type { OrgScopedRepository } from '@/utils/repository'

// ============================================================================
// 環境変数による実装切り替え
// ============================================================================

const DATA_BACKEND_MODE = import.meta.env.VITE_DATA_BACKEND_MODE || 'dual'
const DATA_BACKEND_OVERRIDES = import.meta.env.VITE_DATA_BACKEND_OVERRIDES || ''

// 実装を選択する関数
function selectRepository<T>(
  dexieRepo: T,
  supabaseRepo: T,
  moduleName: string
): T {
  const overrides = DATA_BACKEND_OVERRIDES.split(',').reduce((acc, override) => {
    const [key, value] = override.split(':')
    if (key && value) {
      acc[key.trim()] = value.trim()
    }
    return acc
  }, {} as Record<string, string>)

  const moduleOverride = overrides[moduleName]
  
  if (moduleOverride === 'supabase') {
    return supabaseRepo
  } else if (moduleOverride === 'dexie') {
    return dexieRepo
  } else if (DATA_BACKEND_MODE === 'supabase') {
    return supabaseRepo
  } else if (DATA_BACKEND_MODE === 'dexie') {
    return dexieRepo
  } else {
    // dual mode: デフォルトはDexieを使用
    return dexieRepo
  }
}

// ============================================================================
// 統一Repository
// ============================================================================

export const organizationRepository = selectRepository(
  dexieOrganizationRepository,
  supabaseOrganizationRepository,
  'organizations'
) as OrgScopedRepository<Organization, any, any, any>

export const userOrgRoleRepository = selectRepository(
  dexieUserOrgRoleRepository,
  supabaseUserOrgRoleRepository,
  'user_org_roles'
) as OrgScopedRepository<UserOrgRole, any, any, any>

// ============================================================================
// デュアルラン対応のヘルパー関数
// ============================================================================

export async function syncOrganizationsToSupabase(): Promise<void> {
  if (DATA_BACKEND_MODE === 'dual') {
    try {
      // Dexieからデータを取得
      const dexieData = await dexieOrganizationRepository.findMany()
      
      // Supabaseに同期
      if (dexieData.length > 0) {
        await supabaseOrganizationRepository.createMany(
          dexieData.map(org => ({ name: org.name }))
        )
      }
    } catch (error) {
      console.error('Failed to sync organizations to Supabase:', error)
      // エラーはログに記録するが、UIをブロックしない
    }
  }
}

export async function syncUserOrgRolesToSupabase(): Promise<void> {
  if (DATA_BACKEND_MODE === 'dual') {
    try {
      // Dexieからデータを取得
      const dexieData = await dexieUserOrgRoleRepository.findMany()
      
      // Supabaseに同期
      if (dexieData.length > 0) {
        await supabaseUserOrgRoleRepository.createMany(
          dexieData.map(role => ({
            user_id: role.user_id,
            org_id: role.org_id,
            role: (role.role === 'COLLECTOR' ? 'EMITTER' : role.role) as 'ADMIN' | 'EMITTER' | 'TRANSPORTER' | 'DISPOSER',
          }))
        )
      }
    } catch (error) {
      console.error('Failed to sync user org roles to Supabase:', error)
      // エラーはログに記録するが、UIをブロックしない
    }
  }
}

// ============================================================================
// 検算・整合性チェック
// ============================================================================

export async function validateOrganizationData(): Promise<{
  dexieCount: number
  supabaseCount: number
  isConsistent: boolean
  errors: string[]
}> {
  const errors: string[] = []
  
  try {
    const dexieCount = await dexieOrganizationRepository.count()
    const supabaseCount = await supabaseOrganizationRepository.count()
    
    const isConsistent = dexieCount === supabaseCount
    
    if (!isConsistent) {
      errors.push(`組織データの件数不一致: Dexie=${dexieCount}, Supabase=${supabaseCount}`)
    }
    
    return {
      dexieCount,
      supabaseCount,
      isConsistent,
      errors,
    }
  } catch (error) {
    errors.push(`検算エラー: ${error}`)
    return {
      dexieCount: 0,
      supabaseCount: 0,
      isConsistent: false,
      errors,
    }
  }
}

export async function validateUserOrgRoleData(): Promise<{
  dexieCount: number
  supabaseCount: number
  isConsistent: boolean
  errors: string[]
}> {
  const errors: string[] = []
  
  try {
    const dexieCount = await dexieUserOrgRoleRepository.count()
    const supabaseCount = await supabaseUserOrgRoleRepository.count()
    
    const isConsistent = dexieCount === supabaseCount
    
    if (!isConsistent) {
      errors.push(`ユーザー組織ロールデータの件数不一致: Dexie=${dexieCount}, Supabase=${supabaseCount}`)
    }
    
    return {
      dexieCount,
      supabaseCount,
      isConsistent,
      errors,
    }
  } catch (error) {
    errors.push(`検算エラー: ${error}`)
    return {
      dexieCount: 0,
      supabaseCount: 0,
      isConsistent: false,
      errors,
    }
  }
}

// ============================================================================
// エクスポート
// ============================================================================

export {
  dexieOrganizationRepository,
  dexieUserOrgRoleRepository,
  supabaseOrganizationRepository,
  supabaseUserOrgRoleRepository,
}

export type {
  Organization,
  UserOrgRole,
}




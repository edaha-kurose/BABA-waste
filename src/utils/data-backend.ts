// ============================================================================
// データバックエンド選択ユーティリティ
// 作成日: 2025-09-16
// 目的: Repository実装の統一選択とDual-Run切替の集約
// ============================================================================

import { getAppConfig } from '@/config/app-config'
import { StoreRepository as StoreRepo } from '@/modules/stores/repository'
import { UserRepository as UserRepo } from '@/modules/users/repository'
import { StoreCollectorAssignmentRepository as AssignRepo } from '@/modules/store-collector-assignments/repository'
import { CollectionRequestRepository as RequestRepo } from '@/modules/collection-requests/repository'
import { WasteTypeMasterRepository as WasteTypeRepo } from '@/modules/waste-type-masters/repository'
import { JwnetWasteCodeRepository as JwnetCodeRepo } from '@/modules/jwnet-waste-codes/repository'
import { JwnetRegistrationRepository as JwnetRegRepo } from '@/modules/jwnet-registrations/repository'
import { JwnetReservationRepository as JwnetResRepo } from '@/modules/jwnet-reservations/repository'
import { PlanRepository as PlanRepo } from '@/modules/plans/repository'
import { ItemMapRepository as ItemMapRepo } from '@/modules/item-maps/repository'
import { CollectionRepository as CollectionRepo } from '@/modules/collections/repository'
import { OrganizationRepository as OrgRepo } from '@/modules/organizations/repository'
import { ImportHistoryRepository as ImportHistoryRepo } from '@/modules/import-histories/repository'
import { ManagedStoreRepository as ManagedStoreRepo } from '@/modules/managed-stores/repository'
import { DisposalSiteRepository as DisposalSiteRepo } from '@/modules/disposal-sites/repository'

export type RepoKind = 
  | 'stores' 
  | 'users' 
  | 'assignments' 
  | 'requests'
  | 'waste-types'
  | 'jwnet-codes'
  | 'jwnet-registrations'
  | 'jwnet-reservations'
  | 'plans'
  | 'item-maps'
  | 'collections'
  | 'organizations'
  | 'import-histories'
  | 'managed-stores'
  | 'disposal-sites'

// Repository実装の統一選択
export function getRepository(kind: RepoKind) {
  // 将来的にfeatureFlagsやoverridesを見て実体切替する場合の集約ポイント
  // 現状は各index.tsでmodeを解決済みのため、そのまま委譲
  switch (kind) {
    case 'stores':
      return StoreRepo
    case 'users':
      return UserRepo
    case 'assignments':
      return AssignRepo
    case 'requests':
      return RequestRepo
    case 'waste-types':
      return WasteTypeRepo
    case 'jwnet-codes':
      return JwnetCodeRepo
    case 'jwnet-registrations':
      return JwnetRegRepo
    case 'jwnet-reservations':
      return JwnetResRepo
    case 'plans':
      return PlanRepo
    case 'item-maps':
      return ItemMapRepo
    case 'collections':
      return CollectionRepo
    case 'organizations':
      return OrgRepo
    case 'import-histories':
      return ImportHistoryRepo
    case 'managed-stores':
      return ManagedStoreRepo
    case 'disposal-sites':
      return DisposalSiteRepo
    default:
      throw new Error(`Unknown repository kind: ${kind}`)
  }
}

// 組織ID取得の統一
export function getOrgId(): string {
  return getAppConfig().orgId
}

// データバックエンドモード取得
export function getDataBackendMode(): 'dexie' | 'supabase' | 'dual' {
  return getAppConfig().featureFlags.dataBackendMode
}

// 特定機能のバックエンド上書き取得
export function getBackendOverride(feature: string): 'dexie' | 'supabase' | null {
  const config = getAppConfig()
  const overrides = config.featureFlags.dataBackendOverrides || {}
  return overrides[feature] || null
}

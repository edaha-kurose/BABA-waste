// ============================================================================
// 店舗-収集業者割り当てRepository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択（統一化）
// ============================================================================

import { DexieStoreCollectorAssignmentRepository } from './dexie/store-collector-assignment-repository'
import { SqlStoreCollectorAssignmentRepository } from './sql/store-collector-assignment-repository'
import { Repository } from '@/utils/repository'
import { StoreCollectorAssignment, StoreCollectorAssignmentCreate, StoreCollectorAssignmentUpdate } from '@contracts/v0/schema'
import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

export const StoreCollectorAssignmentRepository: Repository<StoreCollectorAssignment, StoreCollectorAssignmentCreate, StoreCollectorAssignmentUpdate> = useSupabase
  ? new SqlStoreCollectorAssignmentRepository()
  : new DexieStoreCollectorAssignmentRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const storeCollectorAssignmentRepository = StoreCollectorAssignmentRepository

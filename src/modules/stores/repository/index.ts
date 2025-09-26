// ============================================================================
// 店舗Repository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択（統一化）
// ============================================================================

import { DexieStoreRepository } from './dexie/store-repository'
import { SqlStoreRepository } from './sql/store-repository'
import { Repository } from '@/utils/repository'
import { Store, StoreCreate, StoreUpdate } from '@contracts/v0/schema'
import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

export const StoreRepository: Repository<Store, StoreCreate, StoreUpdate> = useSupabase
  ? new SqlStoreRepository()
  : new DexieStoreRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const storeRepository = StoreRepository

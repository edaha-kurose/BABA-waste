// ============================================================================
// 回収Repository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択（統一化）
// ============================================================================

import { DexieCollectionRepository } from './dexie/collection-repository'
import { SqlCollectionRepository } from './sql/collection-repository'
import { Repository } from '@/utils/repository'
import { Collection, CollectionCreate, CollectionUpdate } from '@contracts/v0/schema'
import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

export const CollectionRepository: Repository<Collection, CollectionCreate, CollectionUpdate> = useSupabase
  ? new SqlCollectionRepository()
  : new DexieCollectionRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const collectionRepository = CollectionRepository

// ============================================================================
// 廃棄依頼Repository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択（統一化）
// ============================================================================

import { DexieCollectionRequestRepository } from './dexie/collection-request-repository'
import { SqlCollectionRequestRepository } from './sql/collection-request-repository'
import { Repository } from '@/utils/repository'
import { CollectionRequest, CollectionRequestCreate, CollectionRequestUpdate } from '@contracts/v0/schema'
import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

export const CollectionRequestRepository: Repository<CollectionRequest, CollectionRequestCreate, CollectionRequestUpdate> = useSupabase
  ? new SqlCollectionRequestRepository()
  : new DexieCollectionRequestRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const collectionRequestRepository = CollectionRequestRepository

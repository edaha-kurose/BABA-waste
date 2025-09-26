// ============================================================================
// アイテムマップRepository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択（統一化）
// ============================================================================

import { DexieItemMapRepository } from './dexie/item-map-repository'
import { SqlItemMapRepository } from './sql/item-map-repository'
import { Repository } from '@/utils/repository'
import { ItemMap, ItemMapCreate, ItemMapUpdate } from '@contracts/v0/schema'
import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

export const ItemMapRepository: Repository<ItemMap, ItemMapCreate, ItemMapUpdate> = useSupabase
  ? new SqlItemMapRepository()
  : new DexieItemMapRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const itemMapRepository = ItemMapRepository

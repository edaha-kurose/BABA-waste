// ============================================================================
// 廃棄物種別マスターRepository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択（統一化）
// ============================================================================

import { DexieWasteTypeMasterRepository } from './dexie/waste-type-master-repository'
import { SqlWasteTypeMasterRepository } from './sql/waste-type-master-repository'
import { Repository } from '@/utils/repository'
import { WasteTypeMaster, WasteTypeMasterCreate, WasteTypeMasterUpdate } from '@contracts/v0/schema'

import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

export const WasteTypeMasterRepository: Repository<WasteTypeMaster, WasteTypeMasterCreate, WasteTypeMasterUpdate> = useSupabase
  ? new SqlWasteTypeMasterRepository()
  : new DexieWasteTypeMasterRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const wasteTypeMasterRepository = WasteTypeMasterRepository

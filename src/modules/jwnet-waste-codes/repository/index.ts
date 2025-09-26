// ============================================================================
// JWNET廃棄物コードRepository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択
// ============================================================================

import { DexieJwnetWasteCodeRepository } from './dexie/jwnet-waste-code-repository'
import { SqlJwnetWasteCodeRepository } from './sql/jwnet-waste-code-repository'
import { Repository } from '@/utils/repository'
import { JwnetWasteCode, JwnetWasteCodeCreate, JwnetWasteCodeUpdate } from '@contracts/v0/schema'

import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

// Repository実装を選択
export const JwnetWasteCodeRepository: Repository<JwnetWasteCode, JwnetWasteCodeCreate, JwnetWasteCodeUpdate> = useSupabase
  ? new SqlJwnetWasteCodeRepository()
  : new DexieJwnetWasteCodeRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const jwnetWasteCodeRepository = JwnetWasteCodeRepository

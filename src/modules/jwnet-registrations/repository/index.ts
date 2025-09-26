// ============================================================================
// JWNET登録Repository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択（統一化）
// ============================================================================

import { DexieJwnetRegistrationRepository } from './dexie/jwnet-registration-repository'
import { SqlJwnetRegistrationRepository } from './sql/jwnet-registration-repository'
import { Repository } from '@/utils/repository'
import { JwnetRegistration, JwnetRegistrationCreate, JwnetRegistrationUpdate } from '@contracts/v0/schema'
import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

export const JwnetRegistrationRepository: Repository<JwnetRegistration, JwnetRegistrationCreate, JwnetRegistrationUpdate> = useSupabase
  ? new SqlJwnetRegistrationRepository()
  : new DexieJwnetRegistrationRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const jwnetRegistrationRepository = JwnetRegistrationRepository

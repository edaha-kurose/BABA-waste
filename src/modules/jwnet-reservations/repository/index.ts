// ============================================================================
// JWNET予約Repository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択（統一化）
// ============================================================================

import { DexieJwnetReservationRepository } from './dexie/jwnet-reservation-repository'
import { SqlJwnetReservationRepository } from './sql/jwnet-reservation-repository'
import { Repository } from '@/utils/repository'
import { JwnetReservation, JwnetReservationCreate, JwnetReservationUpdate } from '@contracts/v0/schema'
import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

export const JwnetReservationRepository: Repository<JwnetReservation, JwnetReservationCreate, JwnetReservationUpdate> = useSupabase
  ? new SqlJwnetReservationRepository()
  : new DexieJwnetReservationRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const jwnetReservationRepository = JwnetReservationRepository

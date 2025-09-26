// ============================================================================
// ユーザーRepository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択（統一化）
// ============================================================================

import { DexieUserRepository } from './dexie/user-repository'
import { SqlUserRepository } from './sql/user-repository'
import { Repository } from '@/utils/repository'
import { User, UserCreate, UserUpdate } from '@contracts/v0/schema'
import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

export const UserRepository: Repository<User, UserCreate, UserUpdate> = useSupabase
  ? new SqlUserRepository()
  : new DexieUserRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const userRepository = UserRepository

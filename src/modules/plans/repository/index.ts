// ============================================================================
// 計画Repository ファクトリー
// 作成日: 2025-09-16
// 目的: 環境に応じたRepository実装の選択（統一化）
// ============================================================================

import { DexiePlanRepository } from './dexie/plan-repository'
import { SqlPlanRepository } from './sql/plan-repository'
import { Repository } from '@/utils/repository'
import { Plan, PlanCreate, PlanUpdate } from '@contracts/v0/schema'
import { getDataBackendMode } from '@/utils/data-backend'

// データバックエンドモードに応じてRepository実装を選択
const backendMode = getDataBackendMode()
const useSupabase = backendMode === 'supabase'

export const PlanRepository: Repository<Plan, PlanCreate, PlanUpdate> = useSupabase
  ? new SqlPlanRepository()
  : new DexiePlanRepository()

// 小文字のエクスポートも追加（後方互換性のため）
export const planRepository = PlanRepository

// ============================================================================
// 重複チェックユーティリティ
// 作成日: 2025-09-16
// 目的: 予定データの重複チェック機能
// ============================================================================

import { Plan } from '@contracts/v0/schema'
import dayjs from 'dayjs'

// 重複チェック結果の型定義
export interface DuplicateCheckResult {
  isDuplicate: boolean
  duplicatePlans: Plan[]
  duplicateReasons: string[]
}

// 重複チェックの設定
export interface DuplicateCheckConfig {
  checkSameMonth: boolean
  checkSameStore: boolean
  checkSameItem: boolean
  checkSameQuantity: boolean
  toleranceDays: number // 同じ月の判定のための日数許容範囲
}

// デフォルト設定
export const DEFAULT_DUPLICATE_CHECK_CONFIG: DuplicateCheckConfig = {
  checkSameMonth: true,
  checkSameStore: true,
  checkSameItem: true,
  checkSameQuantity: false, // 数量は重複チェック対象外（同じ品目でも数量が異なる場合がある）
  toleranceDays: 0, // 同じ月の判定は厳密に行う
}

/**
 * 予定データの重複をチェックする
 * @param newPlan 新しく追加しようとする予定データ
 * @param existingPlans 既存の予定データ配列
 * @param config 重複チェック設定
 * @returns 重複チェック結果
 */
export function checkPlanDuplicate(
  newPlan: Omit<Plan, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'deleted_at'>,
  existingPlans: Plan[],
  config: DuplicateCheckConfig = DEFAULT_DUPLICATE_CHECK_CONFIG
): DuplicateCheckResult {
  const duplicatePlans: Plan[] = []
  const duplicateReasons: string[] = []

  // 既存の予定データをフィルタリング（削除されていないもののみ）
  const activePlans = existingPlans.filter(plan => !plan.deleted_at)

  for (const existingPlan of activePlans) {
    let isDuplicate = true
    const reasons: string[] = []

    // 同じ店舗かチェック
    if (config.checkSameStore && existingPlan.store_id !== newPlan.store_id) {
      isDuplicate = false
    } else if (config.checkSameStore) {
      reasons.push('同じ店舗')
    }

    // 同じ品目かチェック
    if (config.checkSameItem && existingPlan.item_name !== newPlan.item_name) {
      isDuplicate = false
    } else if (config.checkSameItem) {
      reasons.push('同じ品目')
    }

    // 同じ月かチェック
    if (config.checkSameMonth) {
      const newPlanDate = dayjs(newPlan.planned_pickup_date)
      const existingPlanDate = dayjs(existingPlan.planned_pickup_date)
      
      // 同じ年・月かチェック
      const isSameMonth = newPlanDate.year() === existingPlanDate.year() && 
                         newPlanDate.month() === existingPlanDate.month()
      
      if (!isSameMonth) {
        isDuplicate = false
      } else {
        reasons.push('同じ月')
      }
    }

    // 同じ数量かチェック（オプション）
    if (config.checkSameQuantity && existingPlan.planned_quantity !== newPlan.planned_quantity) {
      isDuplicate = false
    } else if (config.checkSameQuantity) {
      reasons.push('同じ数量')
    }

    // 重複が見つかった場合
    if (isDuplicate) {
      duplicatePlans.push(existingPlan)
      duplicateReasons.push(...reasons)
    }
  }

  return {
    isDuplicate: duplicatePlans.length > 0,
    duplicatePlans,
    duplicateReasons: [...new Set(duplicateReasons)] // 重複を除去
  }
}

/**
 * 複数の予定データの重複をチェックする
 * @param newPlans 新しく追加しようとする予定データ配列
 * @param existingPlans 既存の予定データ配列
 * @param config 重複チェック設定
 * @returns 重複チェック結果の配列
 */
export function checkMultiplePlansDuplicate(
  newPlans: Array<Omit<Plan, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'deleted_at'>>,
  existingPlans: Plan[],
  config: DuplicateCheckConfig = DEFAULT_DUPLICATE_CHECK_CONFIG
): Array<{ plan: typeof newPlans[0], result: DuplicateCheckResult }> {
  return newPlans.map(plan => ({
    plan,
    result: checkPlanDuplicate(plan, existingPlans, config)
  }))
}

/**
 * 重複チェック結果をユーザーフレンドリーなメッセージに変換
 * @param result 重複チェック結果
 * @param planIndex 予定データのインデックス（複数チェック時）
 * @returns 表示用メッセージ
 */
export function formatDuplicateMessage(
  result: DuplicateCheckResult,
  planIndex?: number
): string {
  if (!result.isDuplicate) {
    return ''
  }

  const prefix = planIndex !== undefined ? `予定${planIndex + 1}: ` : ''
  const reasons = result.duplicateReasons.join('・')
  const duplicateCount = result.duplicatePlans.length

  return `${prefix}重複が検出されました（${reasons}） - ${duplicateCount}件の既存データと重複`
}

/**
 * 重複チェック結果のサマリーを生成
 * @param results 重複チェック結果の配列
 * @returns サマリー情報
 */
export function generateDuplicateSummary(
  results: Array<{ plan: any, result: DuplicateCheckResult }>
): {
  totalPlans: number
  duplicatePlans: number
  validPlans: number
  duplicateReasons: string[]
} {
  const duplicatePlans = results.filter(r => r.result.isDuplicate)
  const allReasons = duplicatePlans.flatMap(r => r.result.duplicateReasons)
  const uniqueReasons = [...new Set(allReasons)]

  return {
    totalPlans: results.length,
    duplicatePlans: duplicatePlans.length,
    validPlans: results.length - duplicatePlans.length,
    duplicateReasons: uniqueReasons
  }
}




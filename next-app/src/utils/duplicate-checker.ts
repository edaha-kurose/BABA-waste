/**
 * 重複チェックユーティリティ
 * 
 * 予定データの重複を検出
 * ✅ 同じ月・店舗・品目の重複チェック
 * ✅ 設定可能なチェックオプション
 * ✅ ユーザーフレンドリーなメッセージ生成
 */

import dayjs from 'dayjs'

// 重複チェック結果の型定義
export interface DuplicateCheckResult {
  isDuplicate: boolean
  duplicatePlans: Array<{
    id: string
    storeId: string
    itemMapId: string
    plannedDate: Date
    plannedQty: number
  }>
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

// 予定データの型（IDなし）
export interface PlanData {
  storeId: string
  itemMapId: string
  plannedDate: Date | string
  plannedQty: number
}

// 既存の予定データの型（IDあり）
export interface ExistingPlan extends PlanData {
  id: string
}

/**
 * 予定データの重複をチェックする
 */
export function checkPlanDuplicate(
  newPlan: PlanData,
  existingPlans: ExistingPlan[],
  config: DuplicateCheckConfig = DEFAULT_DUPLICATE_CHECK_CONFIG
): DuplicateCheckResult {
  const duplicatePlans: ExistingPlan[] = []
  const duplicateReasons: string[] = []

  for (const existingPlan of existingPlans) {
    let isDuplicate = true
    const reasons: string[] = []

    // 同じ店舗かチェック
    if (config.checkSameStore && existingPlan.storeId !== newPlan.storeId) {
      isDuplicate = false
    } else if (config.checkSameStore) {
      reasons.push('同じ店舗')
    }

    // 同じ品目かチェック
    if (config.checkSameItem && existingPlan.itemMapId !== newPlan.itemMapId) {
      isDuplicate = false
    } else if (config.checkSameItem) {
      reasons.push('同じ品目')
    }

    // 同じ月かチェック
    if (config.checkSameMonth) {
      const newPlanDate = dayjs(newPlan.plannedDate)
      const existingPlanDate = dayjs(existingPlan.plannedDate)

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
    if (config.checkSameQuantity && existingPlan.plannedQty !== newPlan.plannedQty) {
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
    duplicatePlans: duplicatePlans as any,
    duplicateReasons: Array.from(new Set(duplicateReasons)), // 重複を除去
  }
}

/**
 * 複数の予定データの重複をチェックする
 */
export function checkMultiplePlansDuplicate(
  newPlans: PlanData[],
  existingPlans: ExistingPlan[],
  config: DuplicateCheckConfig = DEFAULT_DUPLICATE_CHECK_CONFIG
): Array<{ plan: PlanData; result: DuplicateCheckResult }> {
  return newPlans.map((plan) => ({
    plan,
    result: checkPlanDuplicate(plan, existingPlans, config),
  }))
}

/**
 * 重複チェック結果をユーザーフレンドリーなメッセージに変換
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
 */
export function generateDuplicateSummary(
  results: Array<{ plan: PlanData; result: DuplicateCheckResult }>
): {
  totalPlans: number
  duplicatePlans: number
  validPlans: number
  duplicateReasons: string[]
} {
  const duplicatePlans = results.filter((r) => r.result.isDuplicate)
  const allReasons = duplicatePlans.flatMap((r) => r.result.duplicateReasons)
  const uniqueReasons = Array.from(new Set(allReasons))

  return {
    totalPlans: results.length,
    duplicatePlans: duplicatePlans.length,
    validPlans: results.length - duplicatePlans.length,
    duplicateReasons: uniqueReasons,
  }
}



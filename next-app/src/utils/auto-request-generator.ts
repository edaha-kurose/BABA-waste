/**
 * 自動依頼生成ユーティリティ
 * 
 * 予定データから自動的に廃棄依頼を生成
 * ✅ Prisma経由のみ（SSOT準拠）
 * ✅ 重複チェック機能
 * ✅ エラーハンドリング
 */

import { prisma } from '@/lib/prisma'

export interface AutoRequestResult {
  success: boolean
  generated: number
  skipped: number
  errors: Array<{
    planId: string
    message: string
  }>
  warnings: Array<{
    planId: string
    message: string
  }>
}

/**
 * 予定データから自動的に廃棄依頼を生成
 */
export async function generateCollectionRequestsFromPlans(
  planIds: string[],
  orgId: string,
  userId?: string
): Promise<AutoRequestResult> {
  const result: AutoRequestResult = {
    success: true,
    generated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  }

  try {
    // 予定データを取得
    const plans = await prisma.plans.findMany({
      where: {
        id: { in: planIds },
        org_id: orgId,
        // Note: deleted_at filtering handled by RLS
      },
      include: {
        stores: true,
        item_maps: true,
      },
    })

    if (plans.length === 0) {
      result.warnings.push({
        planId: '',
        message: '対象の予定データが見つかりませんでした',
      })
      return result
    }

    for (const plan of plans) {
      try {
        // 既存の依頼があるかチェック
        const existingRequest = await prisma.collection_requests.findFirst({
          where: {
            org_id: orgId,
            store_id: plan.store_id,
            status: { notIn: ['CANCELLED', 'COMPLETED'] },
            // Note: deleted_at filtering handled by RLS
          },
        })

        if (existingRequest) {
          result.skipped++
          result.warnings.push({
            planId: plan.id,
            message: `店舗「${plan.stores?.store_code}」には既にアクティブな依頼が存在します`,
          })
          continue
        }

        // 店舗の割り当て済み収集業者を取得
        const assignments = await prisma.store_collector_assignments.findMany({
          where: {
            store_id: plan.store_id,
            is_active: true,
            // Note: deleted_at filtering handled by RLS
          },
          orderBy: {
            priority: 'asc', // 優先度が低い番号ほど優先
          },
          select: {
            id: true,
            collector_id: true,
            priority: true,
          },
        })

        if (assignments.length === 0) {
          result.skipped++
          result.warnings.push({
            planId: plan.id,
            message: `店舗「${plan.stores?.store_code}」に割り当てられた収集業者がありません`,
          })
          continue
        }

        // 最優先の収集業者に依頼を作成
        const primaryAssignment = assignments[0]

        await prisma.collection_requests.create({
          data: {
            org_id: orgId,
            store_id: plan.store_id,
            collector_id: primaryAssignment.collector_id,
            status: 'PENDING',
            requested_at: new Date(),
            notes: `自動生成: ${plan.item_maps?.item_label || '品目不明'} (${plan.planned_qty}${plan.unit})`,
            created_by: userId || undefined,
            updated_by: userId || undefined,
          },
        })

        result.generated++

        // バックアップ収集業者の情報
        if (assignments.length > 1) {
          result.warnings.push({
            planId: plan.id,
            message: `店舗「${plan.stores?.store_code}」には${assignments.length}社の収集業者が割り当てられています（優先度1を選択）`,
          })
        }
      } catch (planError) {
        result.errors.push({
          planId: plan.id,
          message: `処理エラー: ${planError instanceof Error ? planError.message : '不明なエラー'}`,
        })
      }
    }

    result.success = result.errors.length === 0
  } catch (error) {
    result.success = false
    result.errors.push({
      planId: '',
      message: `自動依頼生成エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
    })
  }

  return result
}

/**
 * 特定の店舗の予定から依頼を生成
 */
export async function generateCollectionRequestsForStore(
  storeId: string,
  orgId: string,
  userId?: string
): Promise<AutoRequestResult> {
  // 店舗の予定を取得
  const plans = await prisma.plans.findMany({
    where: {
      org_id: orgId,
      store_id: storeId,
      // Note: deleted_at filtering handled by RLS
    },
    select: {
      id: true,
    },
  })

  const planIds = plans.map(p => p.id)
  return generateCollectionRequestsFromPlans(planIds, orgId, userId)
}

/**
 * 特定の収集業者が担当する店舗の予定から依頼を生成
 */
export async function generateCollectionRequestsForCollector(
  collectorId: string,
  orgId: string,
  userId?: string
): Promise<AutoRequestResult> {
  // 収集業者が担当する店舗を取得
  const assignments = await prisma.store_collector_assignments.findMany({
    where: {
      collector_id: collectorId,
      is_active: true,
      // Note: deleted_at filtering handled by RLS
    },
    select: {
      store_id: true,
    },
  })

  const storeIds = assignments.map(a => a.store_id)

  // それらの店舗の予定を取得
  const plans = await prisma.plans.findMany({
    where: {
      org_id: orgId,
      store_id: { in: storeIds },
      // Note: deleted_at filtering handled by RLS
    },
    select: {
      id: true,
    },
  })

  const planIds = plans.map(p => p.id)
  return generateCollectionRequestsFromPlans(planIds, orgId, userId)
}



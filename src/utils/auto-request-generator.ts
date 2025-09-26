// ============================================================================
// 自動依頼生成ユーティリティ
// 作成日: 2025-09-16
// 目的: 予定データから自動的に廃棄依頼を生成
// ============================================================================

import { Plan } from '@contracts/v0/schema'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreCollectorAssignmentRepository } from '@/modules/store-collector-assignments/repository'
import { CollectionRequest } from '@contracts/v0/schema'

export interface AutoRequestResult {
  success: boolean
  generated: number
  errors: string[]
  warnings: string[]
}

/**
 * 予定データから自動的に廃棄依頼を生成
 */
export async function generateCollectionRequestsFromPlans(
  plans: Plan[],
  orgId: string = 'demo-org-id'
): Promise<AutoRequestResult> {
  const result: AutoRequestResult = {
    success: true,
    generated: 0,
    errors: [],
    warnings: []
  }

  try {
    // 各予定に対して依頼を生成
    for (const plan of plans) {
      try {
        // 店舗の割り当て済み収集業者を取得
        const assignments = await StoreCollectorAssignmentRepository.findByStoreId(plan.store_id)
        
        if (assignments.length === 0) {
          result.warnings.push(`店舗 ${plan.store_id} に割り当てられた収集業者がありません`)
          continue
        }

        // 優先度順でソート（優先度が低いほど優先）
        const sortedAssignments = assignments
          .filter(a => a.is_active)
          .sort((a, b) => a.priority - b.priority)

        // 最優先の収集業者に依頼を送信
        const primaryAssignment = sortedAssignments[0]
        
        const requestData = {
          org_id: orgId,
          store_id: plan.store_id,
          collector_id: primaryAssignment.collector_id,
          plan_id: plan.id,
          request_date: new Date().toISOString(),
          status: 'PENDING' as const,
          requested_pickup_date: plan.planned_pickup_date,
          notes: `自動生成: ${plan.item_name} (${plan.planned_quantity}${plan.unit})`
        }

        // 既存の依頼があるかチェック
        const existingRequests = await CollectionRequestRepository.findByStoreId(plan.store_id)
        const existingRequest = existingRequests.find(r => 
          r.plan_id === plan.id && 
          r.status !== 'CANCELLED' && 
          r.status !== 'COMPLETED'
        )

        if (existingRequest) {
          result.warnings.push(`予定 ${plan.id} の依頼は既に存在します`)
          continue
        }

        // 依頼を作成
        await CollectionRequestRepository.create(requestData)
        result.generated++

        // バックアップ収集業者にも通知（オプション）
        if (sortedAssignments.length > 1) {
          result.warnings.push(`店舗 ${plan.store_id} には ${sortedAssignments.length} 社の収集業者が割り当てられています`)
        }

      } catch (planError) {
        result.errors.push(`予定 ${plan.id} の処理中にエラー: ${planError instanceof Error ? planError.message : '不明なエラー'}`)
      }
    }

  } catch (error) {
    result.success = false
    result.errors.push(`自動依頼生成中にエラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
  }

  return result
}

/**
 * 特定の店舗の予定から依頼を生成
 */
export async function generateCollectionRequestsForStore(
  storeId: string,
  plans: Plan[],
  orgId: string = 'demo-org-id'
): Promise<AutoRequestResult> {
  const storePlans = plans.filter(plan => plan.store_id === storeId)
  return generateCollectionRequestsFromPlans(storePlans, orgId)
}

/**
 * 特定の収集業者の依頼を一括生成
 */
export async function generateCollectionRequestsForCollector(
  collectorId: string,
  plans: Plan[],
  orgId: string = 'demo-org-id'
): Promise<AutoRequestResult> {
  // 収集業者が担当する店舗の予定をフィルタ
  const assignments = await StoreCollectorAssignmentRepository.findByCollectorId(collectorId)
  const assignedStoreIds = assignments.map(a => a.store_id)
  const collectorPlans = plans.filter(plan => assignedStoreIds.includes(plan.store_id))
  
  return generateCollectionRequestsFromPlans(collectorPlans, orgId)
}




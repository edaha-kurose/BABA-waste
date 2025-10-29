/**
 * 収集業者自動割り当てサービス
 * 
 * 未割当の廃棄依頼に収集業者を自動割り当て
 * ✅ Prisma経由のみ（SSOT準拠）
 * ✅ 優先度に基づく自動選択
 * ✅ エラーハンドリング
 */

import { prisma } from '@/lib/prisma'

export interface AssignmentResult {
  success: boolean
  assignedCount: number
  errorCount: number
  errors: Array<{
    requestId: string
    storeCode: string
    message: string
  }>
  warnings: Array<{
    requestId: string
    message: string
  }>
}

/**
 * 未割当の廃棄依頼に収集業者を自動割り当て
 */
export async function assignCollectorsToUnassignedRequests(
  orgId: string,
  userId?: string
): Promise<AssignmentResult> {
  const result: AssignmentResult = {
    success: false,
    assignedCount: 0,
    errorCount: 0,
    errors: [],
    warnings: [],
  }

  try {
    // 収集業者が未割当の依頼を取得
    const unassignedRequests = await prisma.collection_requests.findMany({
      where: {
        org_id: orgId,
        collector_id: null,
        // Note: deleted_at filtering handled by RLS
      },
      include: {
        stores: true,
      },
    })

    if (unassignedRequests.length === 0) {
      result.success = true
      result.warnings.push({
        requestId: '',
        message: '未割当の廃棄依頼はありません',
      })
      return result
    }

    for (const request of unassignedRequests) {
      try {
        if (!request.stores) {
          result.errorCount++
          result.errors.push({
            requestId: request.id,
            storeCode: '不明',
            message: '店舗が見つかりません',
          })
          continue
        }

        // 店舗に割り当てられた収集業者を取得
        const assignments = await prisma.store_collector_assignments.findMany({
          where: {
            store_id: request.store_id,
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
          result.errorCount++
          result.errors.push({
            requestId: request.id,
            storeCode: (request as any).stores?.store_code || 'Unknown',
            message: '店舗に割り当てられた収集業者がありません',
          })
          continue
        }

        // 優先度1の収集業者を選択
        const priorityAssignment = assignments.find(a => a.priority === 1) || assignments[0]

        if (!priorityAssignment.collector_id) {
          result.errorCount++
          result.errors.push({
            requestId: request.id,
            storeCode: (request as any).stores?.store_code || 'Unknown',
            message: '選択された収集業者が見つかりません',
          })
          continue
        }

        // 廃棄依頼を更新
        await prisma.collection_requests.update({
          where: { id: request.id },
          data: {
            collector_id: priorityAssignment.collector_id,
            updated_by: userId || undefined,
            updated_at: new Date(),
          },
        })

        result.assignedCount++

        // バックアップ収集業者の情報
        if (assignments.length > 1) {
          result.warnings.push({
            requestId: request.id,
            message: `店舗「${(request as any).stores?.store_code || 'Unknown'}」には${assignments.length}社の収集業者が割り当てられています（優先度${priorityAssignment.priority}を選択）`,
          })
        }
      } catch (error) {
        result.errorCount++
        result.errors.push({
          requestId: request.id,
          storeCode: 'エラー',
          message: `割り当て処理エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        })
      }
    }

    result.success = result.errorCount === 0
  } catch (error) {
    result.errors.push({
      requestId: '',
      storeCode: '',
      message: `自動割り当てエラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
    })
  }

  return result
}

/**
 * 特定の店舗の廃棄依頼に収集業者を割り当て
 */
export async function assignCollectorsToStoreRequests(
  storeId: string,
  orgId: string,
  userId?: string
): Promise<AssignmentResult> {
  const result: AssignmentResult = {
    success: false,
    assignedCount: 0,
    errorCount: 0,
    errors: [],
    warnings: [],
  }

  try {
    // 指定店舗の未割当依頼を取得
    const storeRequests = await prisma.collection_requests.findMany({
      where: {
        org_id: orgId,
        store_id: storeId,
        collector_id: null,
        // Note: deleted_at filtering handled by RLS
      },
      include: {
        stores: true,
      },
    })

    if (storeRequests.length === 0) {
      result.success = true
      result.warnings.push({
        requestId: '',
        message: '指定店舗に未割当の廃棄依頼はありません',
      })
      return result
    }

    // 店舗の割り当て情報を取得
    const assignments = await prisma.store_collector_assignments.findMany({
      where: {
        store_id: storeId,
        is_active: true,
        // Note: deleted_at filtering handled by RLS
      },
      orderBy: {
        priority: 'asc',
      },
      select: {
        id: true,
        collector_id: true,
        priority: true,
      },
    })

    if (assignments.length === 0) {
      result.errorCount = storeRequests.length
      storeRequests.forEach((request) => {
        result.errors.push({
          requestId: request.id,
          storeCode: request.stores?.store_code || '不明',
          message: '店舗に割り当てられた収集業者がありません',
        })
      })
      return result
    }

    // 優先度1の収集業者を選択
    const priorityAssignment = assignments.find(a => a.priority === 1) || assignments[0]

    // 各依頼に収集業者を割り当て
    for (const request of storeRequests) {
      try {
        await prisma.collection_requests.update({
          where: { id: request.id },
          data: {
            collector_id: priorityAssignment.collector_id,
            updated_by: userId || undefined,
            updated_at: new Date(),
          },
        })

        result.assignedCount++
      } catch (error) {
        result.errorCount++
        result.errors.push({
          requestId: request.id,
          storeCode: 'エラー',
          message: `割り当て処理エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        })
      }
    }

    result.success = result.errorCount === 0
  } catch (error) {
    result.errors.push({
      requestId: '',
      storeCode: '',
      message: `自動割り当てエラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
    })
  }

  return result
}

/**
 * 割り当て状況を取得
 */
export async function getAssignmentStatus(orgId: string): Promise<{
  totalRequests: number
  assignedRequests: number
  unassignedRequests: number
  unassignedByStore: Array<{
    storeId: string
    storeCode: string
    storeName: string
    unassignedCount: number
  }>
}> {
  const allRequests = await prisma.collection_requests.findMany({
    where: {
      org_id: orgId,
      // Note: deleted_at filtering handled by RLS
    },
    include: {
      stores: true,
    },
  })

  const assignedRequests = allRequests.filter((r) => r.collector_id)
  const unassignedRequests = allRequests.filter((r) => !r.collector_id)

  // 店舗別の未割当数を集計
  const unassignedByStoreMap = new Map<string, { storeCode: string; storeName: string; count: number }>()

  unassignedRequests.forEach((request) => {
    const storeId = request.store_id
    const existing = unassignedByStoreMap.get(storeId)

    if (existing) {
      existing.count++
    } else {
      unassignedByStoreMap.set(storeId, {
        storeCode: request.stores?.store_code || '不明',
        storeName: request.stores?.name || '不明',
        count: 1,
      })
    }
  })

  const unassignedByStore = Array.from(unassignedByStoreMap.entries()).map(([storeId, data]) => ({
    storeId,
    storeCode: data.storeCode,
    storeName: data.storeName,
    unassignedCount: data.count,
  }))

  return {
    totalRequests: allRequests.length,
    assignedRequests: assignedRequests.length,
    unassignedRequests: unassignedRequests.length,
    unassignedByStore,
  }
}



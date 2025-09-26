import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreCollectorAssignmentRepository } from '@/modules/store-collector-assignments/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { UserRepository } from '@/modules/users/repository'
import type { CollectionRequest, StoreCollectorAssignment } from '@contracts/v0/schema'

// ============================================================================
// 収集業者自動割り当てサービス
// ============================================================================

export interface AssignmentResult {
  success: boolean
  message: string
  assignedCount: number
  errorCount: number
  errors: Array<{
    requestId: string
    storeCode: string
    message: string
  }>
}

export class CollectorAssignmentService {
  private requestRepository: CollectionRequestRepository
  private assignmentRepository: StoreCollectorAssignmentRepository
  private storeRepository: StoreRepository
  private userRepository: UserRepository

  constructor(
    requestRepository: CollectionRequestRepository,
    assignmentRepository: StoreCollectorAssignmentRepository,
    storeRepository: StoreRepository,
    userRepository: UserRepository
  ) {
    this.requestRepository = requestRepository
    this.assignmentRepository = assignmentRepository
    this.storeRepository = storeRepository
    this.userRepository = userRepository
  }

  // 未割当の廃棄依頼に収集業者を自動割り当て
  async assignCollectorsToUnassignedRequests(): Promise<AssignmentResult> {
    const result: AssignmentResult = {
      success: false,
      message: '',
      assignedCount: 0,
      errorCount: 0,
      errors: []
    }

    try {
      // 全廃棄依頼を取得
      const allRequests = await this.requestRepository.findMany()
      
      // 収集業者が未割当の依頼を抽出
      const unassignedRequests = allRequests.filter(request => !request.collector_id)
      
      if (unassignedRequests.length === 0) {
        result.success = true
        result.message = '未割当の廃棄依頼はありません'
        return result
      }

      // 店舗、収集業者、割り当てデータを取得
      const stores = await this.storeRepository.findMany()
      const users = await this.userRepository.findMany()
      const collectors = users.filter(user => user.role === 'COLLECTOR')
      const assignments = await this.assignmentRepository.findMany()

      // 店舗マッピングを作成
      const storeMap = new Map(stores.map(store => [store.id, store]))
      const storeAssignmentMap = new Map<string, StoreCollectorAssignment[]>()
      
      assignments.forEach(assignment => {
        if (!storeAssignmentMap.has(assignment.store_id)) {
          storeAssignmentMap.set(assignment.store_id, [])
        }
        storeAssignmentMap.get(assignment.store_id)!.push(assignment)
      })

      // 各未割当依頼に収集業者を割り当て
      for (const request of unassignedRequests) {
        try {
          const store = storeMap.get(request.store_id)
          if (!store) {
            result.errorCount++
            result.errors.push({
              requestId: request.id,
              storeCode: '不明',
              message: '店舗が見つかりません'
            })
            continue
          }

          // 店舗に割り当てられた収集業者を取得
          const storeAssignments = storeAssignmentMap.get(request.store_id) || []
          
          if (storeAssignments.length === 0) {
            result.errorCount++
            result.errors.push({
              requestId: request.id,
              storeCode: store.store_code,
              message: '店舗に割り当てられた収集業者がありません'
            })
            continue
          }

          // 優先度1の収集業者を選択
          const priorityAssignment = storeAssignments
            .filter(a => a.priority === 1)
            .sort((a, b) => a.priority - b.priority)[0]

          const selectedAssignment = priorityAssignment || storeAssignments[0]
          const selectedCollector = collectors.find(c => c.id === selectedAssignment.collector_id)

          if (!selectedCollector) {
            result.errorCount++
            result.errors.push({
              requestId: request.id,
              storeCode: store.store_code,
              message: '選択された収集業者が見つかりません'
            })
            continue
          }

          // 廃棄依頼を更新
          const updatedRequest: CollectionRequest = {
            ...request,
            collector_id: selectedAssignment.collector_id,
            updated_at: new Date().toISOString(),
            updated_by: 'system'
          }

          await this.requestRepository.update(updatedRequest)
          result.assignedCount++

        } catch (error) {
          result.errorCount++
          result.errors.push({
            requestId: request.id,
            storeCode: 'エラー',
            message: `割り当て処理中にエラーが発生しました: ${error}`
          })
        }
      }

      result.success = result.errorCount === 0
      result.message = result.success 
        ? `${result.assignedCount}件の廃棄依頼に収集業者を割り当てました`
        : `${result.assignedCount}件の割り当てが完了しましたが、${result.errorCount}件でエラーが発生しました`

    } catch (error) {
      result.message = `割り当て処理中にエラーが発生しました: ${error}`
    }

    return result
  }

  // 特定の店舗の廃棄依頼に収集業者を割り当て
  async assignCollectorsToStoreRequests(storeId: string): Promise<AssignmentResult> {
    const result: AssignmentResult = {
      success: false,
      message: '',
      assignedCount: 0,
      errorCount: 0,
      errors: []
    }

    try {
      // 指定店舗の未割当依頼を取得
      const allRequests = await this.requestRepository.findMany()
      const storeRequests = allRequests.filter(request => 
        request.store_id === storeId && !request.collector_id
      )

      if (storeRequests.length === 0) {
        result.success = true
        result.message = '指定店舗に未割当の廃棄依頼はありません'
        return result
      }

      // 店舗の割り当て情報を取得
      const assignments = await this.assignmentRepository.findMany()
      const storeAssignments = assignments.filter(a => a.store_id === storeId)
      
      if (storeAssignments.length === 0) {
        result.errorCount = storeRequests.length
        result.message = '指定店舗に割り当てられた収集業者がありません'
        storeRequests.forEach(request => {
          result.errors.push({
            requestId: request.id,
            storeCode: '不明',
            message: '店舗に割り当てられた収集業者がありません'
          })
        })
        return result
      }

      // 優先度1の収集業者を選択
      const priorityAssignment = storeAssignments
        .filter(a => a.priority === 1)
        .sort((a, b) => a.priority - b.priority)[0]

      const selectedAssignment = priorityAssignment || storeAssignments[0]

      // 各依頼に収集業者を割り当て
      for (const request of storeRequests) {
        try {
          const updatedRequest: CollectionRequest = {
            ...request,
            collector_id: selectedAssignment.collector_id,
            updated_at: new Date().toISOString(),
            updated_by: 'system'
          }

          await this.requestRepository.update(updatedRequest)
          result.assignedCount++

        } catch (error) {
          result.errorCount++
          result.errors.push({
            requestId: request.id,
            storeCode: 'エラー',
            message: `割り当て処理中にエラーが発生しました: ${error}`
          })
        }
      }

      result.success = result.errorCount === 0
      result.message = result.success 
        ? `${result.assignedCount}件の廃棄依頼に収集業者を割り当てました`
        : `${result.assignedCount}件の割り当てが完了しましたが、${result.errorCount}件でエラーが発生しました`

    } catch (error) {
      result.message = `割り当て処理中にエラーが発生しました: ${error}`
    }

    return result
  }

  // 割り当て状況を取得
  async getAssignmentStatus(): Promise<{
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
    const allRequests = await this.requestRepository.findMany()
    const stores = await this.storeRepository.findMany()
    const storeMap = new Map(stores.map(store => [store.id, store]))

    const assignedRequests = allRequests.filter(request => request.collector_id)
    const unassignedRequests = allRequests.filter(request => !request.collector_id)

    // 店舗別の未割当数を集計
    const unassignedByStore = new Map<string, number>()
    unassignedRequests.forEach(request => {
      const count = unassignedByStore.get(request.store_id) || 0
      unassignedByStore.set(request.store_id, count + 1)
    })

    const unassignedByStoreArray = Array.from(unassignedByStore.entries()).map(([storeId, count]) => {
      const store = storeMap.get(storeId)
      return {
        storeId,
        storeCode: store?.store_code || '不明',
        storeName: store?.name || '不明',
        unassignedCount: count
      }
    })

    return {
      totalRequests: allRequests.length,
      assignedRequests: assignedRequests.length,
      unassignedRequests: unassignedRequests.length,
      unassignedByStore: unassignedByStoreArray
    }
  }
}

export default CollectorAssignmentService




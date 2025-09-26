import { ImportHistoryRepository } from '@/modules/import-histories/repository'
import type { ImportHistory, ImportHistoryCreate } from '@contracts/v0/schema'

export interface ImportWarning {
  type: 'duplicate' | 'missing_data' | 'validation_error' | 'store_change' | 'collector_change'
  message: string
  record_index?: number
  field?: string
}

export interface ImportError {
  type: 'validation_error' | 'database_error' | 'file_error'
  message: string
  record_index?: number
  field?: string
}

export interface StoreChange {
  store_code: string
  store_name: string
  change_type: 'created' | 'updated' | 'deleted'
  old_data?: Record<string, any>
  new_data?: Record<string, any>
}

export interface CollectorChange {
  collector_name: string
  change_type: 'created' | 'updated' | 'deleted'
  old_data?: Record<string, any>
  new_data?: Record<string, any>
}

export interface ImportSession {
  id: string
  importType: 'csv' | 'excel'
  fileName: string
  fileSize: number
  startedAt: string
  totalRecords: number
  successRecords: number
  errorRecords: number
  duplicateRecords: number
  newStoresCreated: number
  newCollectorsCreated: number
  storeChanges: StoreChange[]
  collectorChanges: CollectorChange[]
  warnings: ImportWarning[]
  errors: ImportError[]
}

export class ImportHistoryManager {
  private session: ImportSession | null = null

  // 取り込みセッションを開始
  startImportSession(
    importType: 'csv' | 'excel',
    fileName: string,
    fileSize: number
  ): string {
    const sessionId = crypto.randomUUID()
    const now = new Date().toISOString()

    this.session = {
      id: sessionId,
      importType,
      fileName,
      fileSize,
      startedAt: now,
      totalRecords: 0,
      successRecords: 0,
      errorRecords: 0,
      duplicateRecords: 0,
      newStoresCreated: 0,
      newCollectorsCreated: 0,
      storeChanges: [],
      collectorChanges: [],
      warnings: [],
      errors: []
    }

    return sessionId
  }

  // レコード処理結果を記録
  recordProcessedRecord(success: boolean, isDuplicate: boolean = false) {
    if (!this.session) return

    this.session.totalRecords++
    if (success) {
      this.session.successRecords++
    } else {
      this.session.errorRecords++
    }
    if (isDuplicate) {
      this.session.duplicateRecords++
    }
  }

  // 店舗変更を記録
  recordStoreChange(change: StoreChange) {
    if (!this.session) return

    this.session.storeChanges.push(change)
    if (change.change_type === 'created') {
      this.session.newStoresCreated++
    }
  }

  // 収集業者変更を記録
  recordCollectorChange(change: CollectorChange) {
    if (!this.session) return

    this.session.collectorChanges.push(change)
    if (change.change_type === 'created') {
      this.session.newCollectorsCreated++
    }
  }

  // 警告を記録
  recordWarning(warning: ImportWarning) {
    if (!this.session) return
    this.session.warnings.push(warning)
  }

  // エラーを記録
  recordError(error: ImportError) {
    if (!this.session) return
    this.session.errors.push(error)
  }

  // 取り込みセッションを完了して履歴に保存
  async completeImportSession(orgId: string): Promise<ImportHistory> {
    if (!this.session) {
      throw new Error('No active import session')
    }

    const now = new Date().toISOString()
    const processingTime = new Date(now).getTime() - new Date(this.session.startedAt).getTime()

    // 取り込みステータスを決定
    let importStatus: 'success' | 'partial_success' | 'failed'
    if (this.session.errorRecords === 0) {
      importStatus = 'success'
    } else if (this.session.successRecords > 0) {
      importStatus = 'partial_success'
    } else {
      importStatus = 'failed'
    }

    const importHistoryData: ImportHistoryCreate = {
      org_id: orgId,
      import_type: this.session.importType,
      file_name: this.session.fileName,
      file_size: this.session.fileSize,
      total_records: this.session.totalRecords,
      success_records: this.session.successRecords,
      error_records: this.session.errorRecords,
      duplicate_records: this.session.duplicateRecords,
      new_stores_created: this.session.newStoresCreated,
      new_collectors_created: this.session.newCollectorsCreated,
      store_changes: this.session.storeChanges,
      collector_changes: this.session.collectorChanges,
      warnings: this.session.warnings,
      errors: this.session.errors,
      import_status: importStatus,
      started_at: this.session.startedAt,
      completed_at: now,
      processing_time_ms: processingTime,
      created_by: 'system',
      updated_by: 'system'
    }

    const importHistory = await ImportHistoryRepository.create(importHistoryData)
    
    // セッションをクリア
    this.session = null

    return importHistory
  }

  // 現在のセッション情報を取得
  getCurrentSession(): ImportSession | null {
    return this.session
  }

  // 取り込み履歴一覧を取得
  async getImportHistories(): Promise<ImportHistory[]> {
    return await ImportHistoryRepository.findMany()
  }

  // 取り込み履歴を取得
  async getImportHistory(id: string): Promise<ImportHistory | null> {
    return await ImportHistoryRepository.findById(id)
  }

  // 重複チェック
  checkForDuplicates(
    newRecords: any[],
    existingRecords: any[],
    keyFields: string[]
  ): { duplicates: any[]; warnings: ImportWarning[] } {
    const duplicates: any[] = []
    const warnings: ImportWarning[] = []

    for (let i = 0; i < newRecords.length; i++) {
      const newRecord = newRecords[i]
      
      for (const existingRecord of existingRecords) {
        const isDuplicate = keyFields.every(field => 
          newRecord[field] === existingRecord[field]
        )

        if (isDuplicate) {
          duplicates.push(newRecord)
          warnings.push({
            type: 'duplicate',
            message: `重複データが検出されました: ${keyFields.map(f => `${f}=${newRecord[f]}`).join(', ')}`,
            record_index: i,
            field: keyFields.join(', ')
          })
          break
        }
      }
    }

    return { duplicates, warnings }
  }

  // 店舗変更検出
  detectStoreChanges(
    newStores: any[],
    existingStores: any[]
  ): { changes: StoreChange[]; warnings: ImportWarning[] } {
    const changes: StoreChange[] = []
    const warnings: ImportWarning[] = []

    // 新規店舗の検出
    for (const newStore of newStores) {
      const existingStore = existingStores.find(s => s.store_code === newStore.store_code)
      
      if (!existingStore) {
        changes.push({
          store_code: newStore.store_code,
          store_name: newStore.name,
          change_type: 'created',
          new_data: newStore
        })
        
        warnings.push({
          type: 'store_change',
          message: `新規店舗が作成されます: ${newStore.store_code} - ${newStore.name}`,
          field: 'store_code'
        })
      } else {
        // 店舗情報の変更検出
        const hasChanges = Object.keys(newStore).some(key => 
          newStore[key] !== existingStore[key] && key !== 'id' && key !== 'created_at' && key !== 'updated_at'
        )

        if (hasChanges) {
          changes.push({
            store_code: newStore.store_code,
            store_name: newStore.name,
            change_type: 'updated',
            old_data: existingStore,
            new_data: newStore
          })

          warnings.push({
            type: 'store_change',
            message: `店舗情報が更新されます: ${newStore.store_code} - ${newStore.name}`,
            field: 'store_code'
          })
        }
      }
    }

    // 削除された店舗の検出（既存店舗が新しいデータにない場合）
    for (const existingStore of existingStores) {
      const newStore = newStores.find(s => s.store_code === existingStore.store_code)
      
      if (!newStore) {
        changes.push({
          store_code: existingStore.store_code,
          store_name: existingStore.name,
          change_type: 'deleted',
          old_data: existingStore
        })

        warnings.push({
          type: 'store_change',
          message: `店舗が削除されます: ${existingStore.store_code} - ${existingStore.name}`,
          field: 'store_code'
        })
      }
    }

    return { changes, warnings }
  }

  // 収集業者変更検出
  detectCollectorChanges(
    newCollectors: any[],
    existingCollectors: any[]
  ): { changes: CollectorChange[]; warnings: ImportWarning[] } {
    const changes: CollectorChange[] = []
    const warnings: ImportWarning[] = []

    // 新規収集業者の検出
    for (const newCollector of newCollectors) {
      const existingCollector = existingCollectors.find(c => c.name === newCollector.name)
      
      if (!existingCollector) {
        changes.push({
          collector_name: newCollector.name,
          change_type: 'created',
          new_data: newCollector
        })
        
        warnings.push({
          type: 'collector_change',
          message: `新規収集業者が作成されます: ${newCollector.name}`,
          field: 'name'
        })
      } else {
        // 収集業者情報の変更検出
        const hasChanges = Object.keys(newCollector).some(key => 
          newCollector[key] !== existingCollector[key] && key !== 'id' && key !== 'created_at' && key !== 'updated_at'
        )

        if (hasChanges) {
          changes.push({
            collector_name: newCollector.name,
            change_type: 'updated',
            old_data: existingCollector,
            new_data: newCollector
          })

          warnings.push({
            type: 'collector_change',
            message: `収集業者情報が更新されます: ${newCollector.name}`,
            field: 'name'
          })
        }
      }
    }

    return { changes, warnings }
  }
}

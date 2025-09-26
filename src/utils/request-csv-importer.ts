import * as XLSX from 'xlsx'
import { CollectionRequest, CollectionRequestCreate, CollectionRequestUpdate, Store, StoreCreate, StoreUpdate, User, UserCreate, UserUpdate } from '@contracts/v0/schema'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { UserRepository } from '@/modules/users/repository'
import { ImportHistoryManager } from '@/utils/import-history-manager'
import dayjs from 'dayjs'

// ============================================================================
// 廃棄依頼CSV取り込み機能
// ============================================================================

export interface RequestCsvRow {
  store_code: string // A列: 店舗番号
  collector_name: string // B列: 収集業者名
  item_name: string // C列: 廃棄物品目名
  planned_quantity: number // D列: 予定数量
  unit: string // E列: 単位
  planned_pickup_date: string // F列: 希望回収日
  area_or_city: string // G列: エリア・市区町村
  notes: string // H列: 備考
}

export interface RequestImportResult {
  success: boolean
  message: string
  stats: {
    total: number
    created: number
    errors: number
  }
  errors: Array<{
    row: number
    field: string
    message: string
  }>
  createdRequests: Array<{
    store_code: string
    collector_name: string
    item_name: string
    planned_quantity: number
    unit: string
  }>
}

export class RequestCsvImporter {
  private requestRepository: typeof CollectionRequestRepository
  private storeRepository: typeof StoreRepository
  private userRepository: typeof UserRepository
  private historyManager: ImportHistoryManager

  constructor(
    requestRepository: typeof CollectionRequestRepository,
    storeRepository: typeof StoreRepository,
    userRepository: typeof UserRepository
  ) {
    this.requestRepository = requestRepository
    this.storeRepository = storeRepository
    this.userRepository = userRepository
    this.historyManager = new ImportHistoryManager()
  }

  // CSVファイルを解析
  async parseCsvFile(file: File): Promise<RequestCsvRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          if (!data) {
            reject(new Error('ファイルの読み込みに失敗しました'))
            return
          }

          const workbook = XLSX.read(data as string, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // ヘッダー行をスキップしてデータを取得
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            range: 1 // 1行目をスキップ
          }) as any[][]

          const rows: RequestCsvRow[] = jsonData
            .filter(row => row.length >= 6 && row[0] && row[1] && row[2] && row[3] && row[4] && row[5]) // 必須列のチェック
            .map((row, index) => {
              const store_code = String(row[0] || '').trim()
              const collector_name = String(row[1] || '').trim()
              const item_name = String(row[2] || '').trim()
              const planned_quantity = parseFloat(row[3]) || 0
              const unit = String(row[4] || '').trim()
              const planned_pickup_date = String(row[5] || '').trim()
              const area_or_city = row[6] ? String(row[6]).trim() : ''
              const notes = row[7] ? String(row[7]).trim() : ''

              return {
                store_code,
                collector_name,
                item_name,
                planned_quantity,
                unit,
                planned_pickup_date,
                area_or_city,
                notes
              }
            })

          resolve(rows)
        } catch (error) {
          reject(new Error(`CSVファイルの解析に失敗しました: ${error}`))
        }
      }

      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'))
      }

      reader.readAsBinaryString(file)
    })
  }

  // 廃棄依頼データのバリデーション
  validateRequestData(row: RequestCsvRow, rowIndex: number): string[] {
    const errors: string[] = []

    // 店舗番号のバリデーション
    if (!row.store_code) {
      errors.push('店舗番号は必須です')
    }

    // 廃棄物品目名のバリデーション
    if (!row.item_name) {
      errors.push('廃棄物品目名は必須です')
    }

    // 予定数量のバリデーション
    if (!row.planned_quantity || row.planned_quantity <= 0) {
      errors.push('予定数量は0より大きい値である必要があります')
    }

    // 単位のバリデーション
    if (!row.unit) {
      errors.push('単位は必須です')
    } else if (!['kg', 'L', 'PCS', 'T'].includes(row.unit)) {
      errors.push('単位は kg, L, PCS, T のいずれかである必要があります')
    }

    // 希望回収日のバリデーション
    if (!row.planned_pickup_date) {
      errors.push('希望回収日は必須です')
    } else {
      const pickupDate = dayjs(row.planned_pickup_date)
      if (!pickupDate.isValid()) {
        errors.push('希望回収日は有効な日付である必要があります')
      }
    }

    return errors
  }

  // 店舗IDを取得
  private async getStoreId(storeCode: string): Promise<string | null> {
    const stores = await this.storeRepository.findMany()
    const store = stores.find(s => s.store_code === storeCode)
    return store?.id || null
  }

  // 収集業者IDを取得
  private async getCollectorId(collectorName: string): Promise<string | null> {
    const users = await this.userRepository.findMany()
    const collectors = users.filter(user => user.role === 'COLLECTOR')
    const collector = collectors.find(c => c.name === collectorName)
    return collector?.id || null
  }

  // 廃棄依頼データをインポート
  async importRequests(csvRows: RequestCsvRow[], orgId: string = 'default-org'): Promise<RequestImportResult> {
    // 取り込みセッションを開始
    const sessionId = this.historyManager.startImportSession('csv', 'import.csv', 0)
    
    const result: RequestImportResult = {
      success: false,
      message: '',
      stats: {
        total: csvRows.length,
        created: 0,
        errors: 0
      },
      errors: [],
      createdRequests: []
    }

    try {
      // バリデーション
      const validationErrors: Array<{ row: number; field: string; message: string }> = []
      
      csvRows.forEach((row, index) => {
        const errors = this.validateRequestData(row, index + 2) // +2はヘッダー行と0ベースのため
        errors.forEach(error => {
          validationErrors.push({
            row: index + 2,
            field: 'general',
            message: error
          })
        })
      })

      if (validationErrors.length > 0) {
        result.errors = validationErrors
        result.message = 'バリデーションエラーが発生しました'
        return result
      }

      // 店舗、収集業者、店舗-収集業者割り当てのマッピングを作成
      const stores = await this.storeRepository.findMany()
      const users = await this.userRepository.findMany()
      const collectors = users.filter(user => user.role === 'COLLECTOR')
      
      // 店舗-収集業者割り当てを取得
      const { StoreCollectorAssignmentRepository } = await import('@/modules/store-collector-assignments/repository')
      const assignments = await StoreCollectorAssignmentRepository.findMany()
      
      const storeMap: Map<string, Store> = new Map<string, Store>(stores.map((store) => [store.store_code, store] as [string, Store]))
      const collectorMap: Map<string, User> = new Map<string, User>(collectors.map((collector) => [collector.name, collector] as [string, User]))
      const storeAssignmentMap = new Map<string, string[]>() // store_id -> collector_ids[]
      
      assignments.forEach(assignment => {
        if (!storeAssignmentMap.has(assignment.store_id)) {
          storeAssignmentMap.set(assignment.store_id, [])
        }
        storeAssignmentMap.get(assignment.store_id)!.push(assignment.collector_id)
      })

      // 廃棄依頼を作成
      for (const csvRow of csvRows) {
        try {
          let store = storeMap.get(csvRow.store_code)
          
          // 店舗が見つからない場合は仮店舗を作成
          if (!store) {
            console.log(`店舗番号 "${csvRow.store_code}" が見つからないため、仮店舗を作成します`)
            
            const tempStoreData: StoreCreate = {
              org_id: orgId,
              store_code: csvRow.store_code,
              name: `仮店舗_${csvRow.store_code}`,
              area_name: csvRow.area_or_city || '未設定',
              area_manager_code: 'TEMP',
              is_active: true,
              is_temporary: true,
              temp_created_reason: 'CSV取り込み時に自動作成',
            }
            
            try {
              const createdStore = await this.storeRepository.create(tempStoreData)
              store = createdStore
              storeMap.set(csvRow.store_code, store)
              result.stats.created++
              console.log(`仮店舗を作成しました: ${csvRow.store_code}`)
            } catch (createError) {
              console.error('仮店舗作成エラー:', createError)
              result.stats.errors++
              result.errors.push({
                row: 0,
                field: 'store_code',
                message: `店舗番号 "${csvRow.store_code}" の仮店舗作成に失敗しました: ${createError}`
              })
              continue
            }
          }

          // 収集業者の自動選択ロジック
          let selectedCollectorId: string | null = null
          
          // 1. CSVで指定された収集業者名が存在する場合
          let specifiedCollector = csvRow.collector_name ? collectorMap.get(csvRow.collector_name) : undefined
          
          // 収集業者が存在しない場合は仮収集業者を作成
          if (!specifiedCollector && csvRow.collector_name) {
            console.log(`収集業者 "${csvRow.collector_name}" が見つからないため、仮収集業者を作成します`)
            
            const tempCollectorData: UserCreate = {
              org_id: orgId,
              name: csvRow.collector_name,
              email: `temp_${Date.now()}@example.com`,
              role: 'COLLECTOR',
              company_name: `仮収集業者_${csvRow.collector_name}`,
              contact_person: '未設定',
              phone: '未設定',
              address: '未設定',
              license_number: 'TEMP',
              jwnet_subscriber_id: 'TEMP',
              jwnet_public_confirmation_id: 'TEMP',
              is_active: true,
              is_temporary: true,
              temp_created_reason: 'CSV取り込み時に自動作成',
            }
            
            try {
              const createdCollector = await this.userRepository.create(tempCollectorData)
              specifiedCollector = createdCollector
              collectorMap.set(csvRow.collector_name, specifiedCollector)
              console.log(`仮収集業者を作成しました: ${csvRow.collector_name}`)
            } catch (createError) {
              console.error('仮収集業者作成エラー:', createError)
              // 仮収集業者作成に失敗しても処理を続行
            }
          }
          
          if (specifiedCollector) {
            // その収集業者が該当店舗に割り当てられているかチェック
            const storeCollectorIds = storeAssignmentMap.get(store.id) || []
            if (storeCollectorIds.includes(specifiedCollector.id)) {
              selectedCollectorId = specifiedCollector.id
            } else {
              // 店舗-収集業者割り当てを作成
              try {
                const { StoreCollectorAssignmentRepository } = await import('@/modules/store-collector-assignments/repository')
                await StoreCollectorAssignmentRepository.create({
                  org_id: orgId,
                  store_id: store.id,
                  collector_id: specifiedCollector.id,
                  priority: 1,
                  is_active: true,
                })
                selectedCollectorId = specifiedCollector.id
                storeAssignmentMap.set(store.id, [...(storeAssignmentMap.get(store.id) || []), specifiedCollector.id])
                console.log(`店舗-収集業者割り当てを作成しました: ${store.store_code} - ${specifiedCollector.name}`)
              } catch (assignmentError) {
                console.error('店舗-収集業者割り当て作成エラー:', assignmentError)
                // 割り当て作成に失敗しても処理を続行
              }
            }
          }
          
          // 2. 指定された収集業者が見つからない、または割り当てられていない場合
          if (!selectedCollectorId) {
            const storeCollectorIds = storeAssignmentMap.get(store.id) || []
            if (storeCollectorIds.length > 0) {
              // 優先度1の収集業者を選択
              const priorityAssignments = assignments
                .filter(a => a.store_id === store.id && a.priority === 1)
                .sort((a, b) => a.priority - b.priority)
              
              if (priorityAssignments.length > 0) {
                selectedCollectorId = priorityAssignments[0].collector_id
              } else {
                // 優先度1がない場合は最初の割り当て業者を選択
                selectedCollectorId = storeCollectorIds[0]
              }
            }
          }

          // 3. それでも収集業者が見つからない場合は、デフォルトの仮収集業者を作成
          if (!selectedCollectorId) {
            console.log(`店舗 "${csvRow.store_code}" に割り当てられた収集業者が見つからないため、デフォルト仮収集業者を作成します`)
            
            const defaultCollectorData: UserCreate = {
              org_id: orgId,
              name: `デフォルト収集業者_${csvRow.store_code}`,
              email: `temp_${Date.now()}@example.com`,
              role: 'COLLECTOR',
              company_name: `デフォルト収集業者_${csvRow.store_code}`,
              contact_person: '未設定',
              phone: '未設定',
              address: '未設定',
              license_number: 'TEMP',
              jwnet_subscriber_id: 'TEMP',
              jwnet_public_confirmation_id: 'TEMP',
              is_active: true,
              is_temporary: true,
              temp_created_reason: 'CSV取り込み時に自動作成（デフォルト）',
            }
            
            try {
              const createdCollector = await this.userRepository.create(defaultCollectorData)
              selectedCollectorId = createdCollector.id
              collectorMap.set(createdCollector.name, createdCollector)
              
              // 店舗-収集業者割り当てを作成
              const { StoreCollectorAssignmentRepository } = await import('@/modules/store-collector-assignments/repository')
              await StoreCollectorAssignmentRepository.create({
                org_id: orgId,
                store_id: store.id,
                collector_id: createdCollector.id,
                priority: 1,
                is_active: true,
              })
              storeAssignmentMap.set(store.id, [...(storeAssignmentMap.get(store.id) || []), createdCollector.id])
              console.log(`デフォルト仮収集業者を作成しました: ${createdCollector.name}`)
            } catch (createError) {
              console.error('デフォルト仮収集業者作成エラー:', createError)
              result.stats.errors++
              result.errors.push({
                row: 0,
                field: 'collector_name',
                message: `店舗 "${csvRow.store_code}" の収集業者作成に失敗しました: ${createError}`
              })
              continue
            }
          }

          const selectedCollector = selectedCollectorId ? collectors.find(c => c.id === selectedCollectorId) : undefined
          const requestData: CollectionRequestCreate = {
            org_id: orgId,
            store_id: store.id,
            collector_id: selectedCollectorId!,
            status: 'PENDING',
            requested_pickup_date: dayjs(csvRow.planned_pickup_date).toISOString(),
            notes: csvRow.notes || ''
          }

          await this.requestRepository.create(requestData)
          result.stats.created++
          result.createdRequests.push({
            store_code: csvRow.store_code,
            collector_name: selectedCollector?.name || '自動選択',
            item_name: csvRow.item_name,
            planned_quantity: csvRow.planned_quantity,
            unit: csvRow.unit
          })
        } catch (error) {
          result.stats.errors++
          result.errors.push({
            row: 0,
            field: 'general',
            message: `廃棄依頼の作成に失敗しました: ${error}`
          })
        }
      }

      result.success = result.stats.errors === 0
      result.message = result.success 
        ? `インポートが完了しました。作成: ${result.stats.created}件`
        : `インポート中にエラーが発生しました。エラー: ${result.stats.errors}件`

      // 取り込み履歴を保存
      try {
        await this.historyManager.completeImportSession(orgId)
      } catch (historyError) {
        console.error('履歴保存エラー:', historyError)
      }

    } catch (error) {
      result.message = `インポート処理中にエラーが発生しました: ${error}`
      
      // エラーを履歴に記録
      this.historyManager.recordError({
        type: 'database_error',
        message: `インポート処理中にエラーが発生しました: ${error}`,
        field: 'general'
      })
      
      // 取り込み履歴を保存
      try {
        await this.historyManager.completeImportSession(orgId)
      } catch (historyError) {
        console.error('履歴保存エラー:', historyError)
      }
    }

    return result
  }

  // CSVテンプレートを生成
  generateTemplate(): Blob {
    const templateData = [
      ['店舗番号', '収集業者名', '廃棄物品目名', '予定数量', '単位', '希望回収日', 'エリア・市区町村', '備考'],
      ['ST001', 'エコリサイクル株式会社', '紙類', '100', 'kg', '2024-01-15', '東京都', '備考例'],
      ['ST002', '', 'プラスチック', '50', 'kg', '2024-01-16', '大阪府', '収集業者名は空欄でも自動選択されます']
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '廃棄依頼データ')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }
}

export default RequestCsvImporter

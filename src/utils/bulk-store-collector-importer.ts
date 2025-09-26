import * as XLSX from 'xlsx'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { StoreRepository } from '@/modules/stores/repository'
import { UserRepository } from '@/modules/users/repository'
import { StoreCollectorAssignmentRepository } from '@/modules/store-collector-assignments/repository'
import type { 
  BulkImportStore, 
  BulkImportResult, 
  StoreCreate, 
  UserCreate, 
  StoreCollectorAssignmentCreate 
} from '@contracts/v0/schema'

export class BulkStoreCollectorImporter {
  private storeRepository: typeof StoreRepository
  private userRepository: typeof UserRepository
  private assignmentRepository: typeof StoreCollectorAssignmentRepository

  constructor() {
    this.storeRepository = StoreRepository
    this.userRepository = UserRepository
    this.assignmentRepository = StoreCollectorAssignmentRepository
  }

  /**
   * Excelファイルを解析して一斉登録データを取得
   */
  async parseExcelFile(file: File): Promise<BulkImportStore[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          if (jsonData.length < 2) {
            throw new Error('データが不足しています。ヘッダー行とデータ行が必要です。')
          }

          const headers = jsonData[0] as string[]
          const dataRows = jsonData.slice(1) as any[][]

          const results: BulkImportStore[] = []

          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i]
            if (row.length === 0 || row.every(cell => !cell)) continue

            try {
              const storeData = this.parseRowToStoreData(row, headers, i + 2) // +2 for 1-based indexing and header
              results.push(storeData)
            } catch (error) {
              console.warn(`行 ${i + 2} の解析に失敗:`, error)
              // エラーがあっても続行
            }
          }

          resolve(results)
        } catch (error) {
          reject(new Error(`Excelファイルの解析に失敗しました: ${error}`))
        }
      }

      reader.onerror = () => {
        reject(new Error('ファイルの読み込み中にエラーが発生しました'))
      }

      reader.readAsBinaryString(file)
    })
  }

  /**
   * 行データを店舗データに変換
   */
  private parseRowToStoreData(row: any[], headers: string[], rowIndex: number): BulkImportStore {
    const getValue = (headerName: string): string => {
      const index = headers.findIndex(h => h === headerName)
      return index >= 0 && row[index] ? String(row[index]).trim() : ''
    }

    const store_code = getValue('店舗番号')
    const area_manager_code = getValue('エリア長コード')
    const store_name = getValue('店舗名')
    const area_name = getValue('舗名')
    const phone = getValue('電話番号')
    const postal_code = getValue('郵便番号')
    const address1 = getValue('住所1')
    const address2 = getValue('住所2')
    const collector_name = getValue('収集業者名')
    const collector_company_name = getValue('収集業者会社名')
    const collector_phone = getValue('収集業者電話番号')
    const collector_email = getValue('収集業者メールアドレス')
    const collector_address = getValue('収集業者住所')
    const priority = parseInt(getValue('優先度')) || 1

    // 必須項目のバリデーション
    if (!store_code) throw new Error('店舗番号が必須です')
    if (!area_manager_code) throw new Error('エリア長コードが必須です')
    if (!store_name) throw new Error('店舗名が必須です')
    if (!collector_name) throw new Error('収集業者名が必須です')
    if (!collector_company_name) throw new Error('収集業者会社名が必須です')

    return {
      store_code,
      area_manager_code,
      store_name,
      area_name,
      phone: phone || undefined,
      postal_code: postal_code || undefined,
      address1: address1 || undefined,
      address2: address2 || undefined,
      collector_name,
      collector_company_name,
      collector_phone: collector_phone || undefined,
      collector_email: collector_email || undefined,
      collector_address: collector_address || undefined,
      priority: Math.max(1, Math.min(10, priority))
    }
  }

  /**
   * 一斉登録を実行
   */
  async executeBulkImport(
    importData: BulkImportStore[], 
    orgId: string = 'default-org'
  ): Promise<BulkImportResult> {
    console.log('BulkStoreCollectorImporter.executeBulkImport 開始:', importData.length, '件')
    
    const result: BulkImportResult = {
      success: true,
      total_records: importData.length,
      success_stores: 0,
      success_collectors: 0,
      success_assignments: 0,
      errors: [],
      warnings: []
    }

    // 既存データを取得
    const existingStores = await this.storeRepository.findMany()
    const allUsers = await this.userRepository.findMany()
    // roleがCOLLECTORのユーザーのみを収集業者として扱う
    const existingCollectors = allUsers.filter(u => u.role === 'COLLECTOR')
    const existingAssignments = await this.assignmentRepository.findMany()

    // 重複チェック用のマップ
    const storeCodeMap = new Map(existingStores.map(s => [s.store_code, s]))
    const collectorNameMap = new Map(existingCollectors.map(c => [c.name, c]))

    for (let i = 0; i < importData.length; i++) {
      const data = importData[i]
      
      try {
        // 店舗の登録（統合されたStoreテーブルに登録）
        let storeId: string
        if (storeCodeMap.has(data.store_code)) {
          // 既存店舗の場合は更新
          const existingStore = storeCodeMap.get(data.store_code)!
          console.log(`既存店舗を更新: ${data.store_code} -> ${data.store_name}`)
          const updateData = {
            area_manager_code: data.area_manager_code,
            name: data.store_name,
            area_name: data.area_name,
            phone: data.phone,
            postal_code: data.postal_code,
            address1: data.address1,
            address2: data.address2,
            is_managed: true, // 管理店舗マスターとしてマーク
          }
          await this.storeRepository.update(existingStore.id, updateData)
          storeId = existingStore.id
        } else {
          // 新規店舗の登録
          console.log(`新規店舗を登録: ${data.store_code} -> ${data.store_name}`)
          const storeData: StoreCreate = {
            org_id: orgId,
            store_code: data.store_code,
            area_manager_code: data.area_manager_code,
            name: data.store_name,
            area_name: data.area_name,
            phone: data.phone,
            postal_code: data.postal_code,
            address1: data.address1,
            address2: data.address2,
            is_temporary: false,
            is_managed: true, // 管理店舗マスターとしてマーク
          }
          const newStore = await this.storeRepository.create(storeData)
          storeId = newStore.id
          result.success_stores++
          console.log(`店舗登録完了: ${newStore.id} -> ${newStore.name}`)
        }

        // 収集業者の登録
        let collectorId: string
        if (collectorNameMap.has(data.collector_name)) {
          // 既存収集業者の場合は取得
          const existingCollector = collectorNameMap.get(data.collector_name)!
          collectorId = existingCollector.id
          
          // 警告を追加（重複収集業者）
          result.warnings.push({
            row_index: i,
            store_code: data.store_code,
            warning_type: 'duplicate_collector',
            message: `収集業者「${data.collector_name}」は既に登録されています`
          })
        } else {
          // 新規収集業者の登録（統合されたUserテーブルに登録）
          console.log(`新規収集業者を登録: ${data.collector_name}`)
          const collectorData: UserCreate = {
            org_id: orgId,
            email: data.collector_email || `${data.collector_name}@example.com`,
            name: data.collector_name,
            role: 'COLLECTOR',
            is_active: true,
            // 収集業者関連のフィールド
            company_name: data.collector_company_name,
            contact_person: data.collector_name,
            phone: data.collector_phone || '000-0000-0000',
            address: data.collector_address || '住所未設定',
            license_number: `LIC-${data.collector_name.replace(/\s+/g, '')}`,
            service_areas: [data.area_name],
            jwnet_subscriber_id: `SUB-${data.collector_name.replace(/\s+/g, '')}`,
            jwnet_public_confirmation_id: `PUB-${data.collector_name.replace(/\s+/g, '')}`,
            is_temporary: false,
            created_by: 'system',
          }
          const newCollector = await this.userRepository.create(collectorData)
          collectorId = newCollector.id
          collectorNameMap.set(data.collector_name, newCollector)
          result.success_collectors++
          console.log(`収集業者登録完了: ${newCollector.id} -> ${newCollector.name}`)
        }

        // 店舗-収集業者アサインメントの登録
        console.log(`アサインメントを登録: 店舗${storeId} -> 収集業者${collectorId}`)
        const assignmentData: StoreCollectorAssignmentCreate = {
          org_id: orgId,
          store_id: storeId,
          collector_id: collectorId,
          priority: data.priority,
          is_active: true,
        }
        await this.assignmentRepository.create(assignmentData)
        result.success_assignments++
        console.log(`アサインメント登録完了: 店舗${storeId} -> 収集業者${collectorId}`)

      } catch (error) {
        result.success = false
        result.errors.push({
          row_index: i,
          store_code: data.store_code,
          error_type: 'database_error',
          message: `登録エラー: ${error}`
        })
      }
    }

    console.log('BulkStoreCollectorImporter.executeBulkImport 完了:', result)
    return result
  }

  /**
   * テンプレートExcelファイルを生成
   */
  generateTemplate(): void {
    const headers = [
      '店舗番号',
      'エリア長コード', 
      '店舗名',
      '舗名',
      '電話番号',
      '郵便番号',
      '住所1',
      '住所2',
      '収集業者名',
      '収集業者会社名',
      '収集業者電話番号',
      '収集業者メールアドレス',
      '収集業者住所',
      '優先度'
    ]

    const sampleData = [
      [
        'ST001',
        '12345678',
        'サンプル店舗1',
        '東京都',
        '03-1234-5678',
        '100-0001',
        '東京都千代田区千代田',
        '1-1-1',
        '田中収集',
        '田中収集株式会社',
        '03-9876-5432',
        'tanaka@example.com',
        '東京都渋谷区渋谷1-1-1',
        1
      ],
      [
        'ST002',
        '87654321',
        'サンプル店舗2',
        '神奈川県',
        '045-123-4567',
        '220-0001',
        '神奈川県横浜市西区',
        '2-2-2',
        '佐藤収集',
        '佐藤収集有限会社',
        '045-987-6543',
        'sato@example.com',
        '神奈川県川崎市川崎区2-2-2',
        2
      ]
    ]

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '店舗・収集業者一斉登録')

    // ファイル名を生成
    const fileName = `店舗・収集業者一斉登録テンプレート_${dayjs().format('YYYY-MM-DD')}.xlsx`
    
    // ダウンロード
    XLSX.writeFile(workbook, fileName)
  }

  /**
   * データベースをリセット
   */
  async resetDatabase(): Promise<void> {
    try {
      // すべてのアサインメントを削除
      const assignments = await this.assignmentRepository.findMany()
      for (const assignment of assignments) {
        await this.assignmentRepository.delete(assignment.id)
      }

      // 管理店舗マスター（is_managed=true）のみを削除
      const managedStores = await this.storeRepository.findMany()
      for (const store of managedStores) {
        if (store.is_managed) {
          await this.storeRepository.delete(store.id)
        }
      }

      // 収集業者（role=COLLECTORのユーザー）を削除
      const allUsers = await this.userRepository.findMany()
      const collectors = allUsers.filter(u => u.role === 'COLLECTOR')
      for (const collector of collectors) {
        await this.userRepository.delete(collector.id)
      }

      console.log('データベースリセットが完了しました')
    } catch (error) {
      console.error('データベースリセットエラー:', error)
      throw error
    }
  }
}

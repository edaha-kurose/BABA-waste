import * as XLSX from 'xlsx'
import { Store, StoreCreateSchema } from '@contracts/v0/schema'
import { StoreRepository } from '@/modules/stores/repository'
import dayjs from 'dayjs'

// ============================================================================
// 店舗CSV取り込み機能
// ============================================================================

export interface StoreCsvRow {
  store_code: string // A列: 店舗番号（5桁数字）
  area_manager_code: string // B列: エリア長コード（8桁数字）
  name: string // C列: 店舗名
  area_name: string // D列: 舗名（エリア＝県単位表示）
  // E-H列: 廃棄対象品目（将来の拡張用）
  item_e?: string
  item_f?: string
  item_g?: string
  item_h?: string
  item_i?: string
  item_j?: string
  item_k?: string
  item_l?: string
}

export interface StoreImportResult {
  success: boolean
  message: string
  stats: {
    total: number
    new: number
    updated: number
    deleted: number
    errors: number
  }
  errors: Array<{
    row: number
    field: string
    message: string
  }>
  changes: Array<{
    type: 'new' | 'update' | 'delete'
    store_code: string
    name: string
    changes?: Record<string, any>
  }>
}

export interface StorePreviewData {
  newStores: Array<{
    csvRow: StoreCsvRow
    preview: Store
  }>
  updatedStores: Array<{
    csvRow: StoreCsvRow
    existingStore: Store
    preview: Store
    changes: Record<string, { old: any; new: any }>
  }>
  deletedStores: Array<{
    store: Store
    reason: string
  }>
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}

export class StoreCsvImporter {
  private storeRepository: StoreRepository

  constructor(storeRepository: StoreRepository) {
    this.storeRepository = storeRepository
  }

  // CSVファイルを解析
  async parseCsvFile(file: File): Promise<StoreCsvRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          if (!data) {
            reject(new Error('ファイルの読み込みに失敗しました'))
            return
          }

          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // ヘッダー行をスキップしてデータを取得
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            range: 1 // 1行目をスキップ
          }) as any[][]

          const rows: StoreCsvRow[] = jsonData
            .filter(row => row.length >= 4 && row[0] && row[1] && row[2] && row[3]) // 必須列のチェック
            .map((row, index) => {
              const store_code = String(row[0] || '').trim()
              const area_manager_code = String(row[1] || '').trim()
              const name = String(row[2] || '').trim()
              const area_name = String(row[3] || '').trim()

              return {
                store_code,
                area_manager_code,
                name,
                area_name,
                item_e: row[4] ? String(row[4]).trim() : undefined,
                item_f: row[5] ? String(row[5]).trim() : undefined,
                item_g: row[6] ? String(row[6]).trim() : undefined,
                item_h: row[7] ? String(row[7]).trim() : undefined,
                item_i: row[8] ? String(row[8]).trim() : undefined,
                item_j: row[9] ? String(row[9]).trim() : undefined,
                item_k: row[10] ? String(row[10]).trim() : undefined,
                item_l: row[11] ? String(row[11]).trim() : undefined,
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

  // 店舗データのバリデーション
  validateStoreData(row: StoreCsvRow, rowIndex: number): string[] {
    const errors: string[] = []

    // 店舗番号のバリデーション（5桁数字）
    if (!row.store_code) {
      errors.push('店舗番号は必須です')
    } else if (!/^\d{5}$/.test(row.store_code)) {
      errors.push('店舗番号は5桁の数字である必要があります')
    }

    // エリア長コードのバリデーション（8桁数字）
    if (!row.area_manager_code) {
      errors.push('エリア長コードは必須です')
    } else if (!/^\d{8}$/.test(row.area_manager_code)) {
      errors.push('エリア長コードは8桁の数字である必要があります')
    }

    // 店舗名のバリデーション
    if (!row.name) {
      errors.push('店舗名は必須です')
    } else if (row.name.length > 255) {
      errors.push('店舗名は255文字以内である必要があります')
    }

    // 舗名のバリデーション
    if (!row.area_name) {
      errors.push('舗名は必須です')
    } else if (row.area_name.length > 100) {
      errors.push('舗名は100文字以内である必要があります')
    }

    return errors
  }

  // プレビューデータを生成
  async generatePreview(
    csvRows: StoreCsvRow[],
    options: {
      updateExisting?: boolean
      deleteMissing?: boolean
      openingDate?: string
      closingDate?: string
    } = {}
  ): Promise<StorePreviewData> {
    const errors: Array<{ row: number; field: string; message: string }> = []
    
    // バリデーション
    csvRows.forEach((row, index) => {
      const validationErrors = this.validateStoreData(row, index + 2)
      validationErrors.forEach(error => {
        errors.push({
          row: index + 2,
          field: 'general',
          message: error
        })
      })
    })

    // 既存店舗データを取得
    const existingStores = await this.storeRepository.findMany()
    const existingStoresMap = new Map(existingStores.map(store => [store.store_code, store]))

    const newStores: Array<{ csvRow: StoreCsvRow; preview: Store }> = []
    const updatedStores: Array<{ csvRow: StoreCsvRow; existingStore: Store; preview: Store; changes: Record<string, { old: any; new: any }> }> = []
    const deletedStores: Array<{ store: Store; reason: string }> = []
    const csvStoreCodes = new Set(csvRows.map(row => row.store_code))

    // CSVデータを処理
    for (const csvRow of csvRows) {
      const existingStore = existingStoresMap.get(csvRow.store_code)
      
      if (!existingStore) {
        // 新規店舗のプレビュー
        const preview: Store = {
          id: `preview-${csvRow.store_code}`,
          org_id: 'preview-org',
          store_code: csvRow.store_code,
          area_manager_code: csvRow.area_manager_code,
          name: csvRow.name,
          area_name: csvRow.area_name,
          address: '',
          area: '',
          emitter_no: '',
          opening_date: options.openingDate,
          closing_date: undefined,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'preview',
          updated_by: 'preview',
          deleted_at: undefined
        }
        newStores.push({ csvRow, preview })
      } else {
        // 既存店舗の変更プレビュー
        const changes: Record<string, { old: any; new: any }> = {}
        const preview: Store = { ...existingStore }

        if (existingStore.area_manager_code !== csvRow.area_manager_code) {
          changes.area_manager_code = { old: existingStore.area_manager_code, new: csvRow.area_manager_code }
          preview.area_manager_code = csvRow.area_manager_code
        }
        if (existingStore.name !== csvRow.name) {
          changes.name = { old: existingStore.name, new: csvRow.name }
          preview.name = csvRow.name
        }
        if (existingStore.area_name !== csvRow.area_name) {
          changes.area_name = { old: existingStore.area_name, new: csvRow.area_name }
          preview.area_name = csvRow.area_name
        }

        if (Object.keys(changes).length > 0) {
          updatedStores.push({
            csvRow,
            existingStore,
            preview,
            changes
          })
        }
      }
    }

    // 削除対象店舗（CSVに存在しない店舗）
    if (options.deleteMissing) {
      const missingStores = existingStores.filter(store => !csvStoreCodes.has(store.store_code))
      missingStores.forEach(store => {
        deletedStores.push({
          store,
          reason: 'CSVファイルに存在しないため削除対象'
        })
      })
    }

    return {
      newStores,
      updatedStores,
      deletedStores,
      errors
    }
  }

  // 既存店舗データと比較して差分を検出
  async detectChanges(csvRows: StoreCsvRow[]): Promise<{
    newStores: StoreCsvRow[]
    updatedStores: Array<{ csvRow: StoreCsvRow; existingStore: Store; changes: Record<string, any> }>
    deletedStores: Store[]
  }> {
    // 既存の店舗データを取得
    const existingStores = await this.storeRepository.findMany()
    const existingStoresMap = new Map(existingStores.map(store => [store.store_code, store]))

    const newStores: StoreCsvRow[] = []
    const updatedStores: Array<{ csvRow: StoreCsvRow; existingStore: Store; changes: Record<string, any> }> = []
    const csvStoreCodes = new Set(csvRows.map(row => row.store_code))

    // CSVデータを処理
    for (const csvRow of csvRows) {
      const existingStore = existingStoresMap.get(csvRow.store_code)
      
      if (!existingStore) {
        // 新規店舗
        newStores.push(csvRow)
      } else {
        // 既存店舗の変更チェック
        const changes: Record<string, any> = {}
        
        if (existingStore.area_manager_code !== csvRow.area_manager_code) {
          changes.area_manager_code = csvRow.area_manager_code
        }
        if (existingStore.name !== csvRow.name) {
          changes.name = csvRow.name
        }
        if (existingStore.area_name !== csvRow.area_name) {
          changes.area_name = csvRow.area_name
        }

        if (Object.keys(changes).length > 0) {
          updatedStores.push({
            csvRow,
            existingStore,
            changes
          })
        }
      }
    }

    // 削除対象店舗（CSVに存在しない店舗）
    const deletedStores = existingStores.filter(store => !csvStoreCodes.has(store.store_code))

    return {
      newStores,
      updatedStores,
      deletedStores
    }
  }

  // 店舗データをインポート
  async importStores(
    csvRows: StoreCsvRow[],
    options: {
      updateExisting?: boolean
      deleteMissing?: boolean
      openingDate?: string
      closingDate?: string
    } = {}
  ): Promise<StoreImportResult> {
    const result: StoreImportResult = {
      success: false,
      message: '',
      stats: {
        total: csvRows.length,
        new: 0,
        updated: 0,
        deleted: 0,
        errors: 0
      },
      errors: [],
      changes: []
    }

    try {
      // バリデーション
      const validationErrors: Array<{ row: number; field: string; message: string }> = []
      
      csvRows.forEach((row, index) => {
        const errors = this.validateStoreData(row, index + 2) // +2はヘッダー行と0ベースのため
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

      // 差分検出
      const changes = await this.detectChanges(csvRows)

      // 新規店舗の作成
      for (const newStore of changes.newStores) {
        try {
          const storeData = {
            store_code: newStore.store_code,
            area_manager_code: newStore.area_manager_code,
            name: newStore.name,
            area_name: newStore.area_name,
            opening_date: options.openingDate,
            is_active: true
          }

          await this.storeRepository.create(storeData)
          result.stats.new++
          result.changes.push({
            type: 'new',
            store_code: newStore.store_code,
            name: newStore.name
          })
        } catch (error) {
          result.stats.errors++
          result.errors.push({
            row: 0,
            field: 'store_code',
            message: `新規店舗の作成に失敗しました: ${error}`
          })
        }
      }

      // 既存店舗の更新
      if (options.updateExisting) {
        for (const update of changes.updatedStores) {
          try {
            const updateData = {
              ...update.changes,
              updated_at: new Date().toISOString()
            }

            await this.storeRepository.update(update.existingStore.id, updateData)
            result.stats.updated++
            result.changes.push({
              type: 'update',
              store_code: update.csvRow.store_code,
              name: update.csvRow.name,
              changes: update.changes
            })
          } catch (error) {
            result.stats.errors++
            result.errors.push({
              row: 0,
              field: 'store_code',
              message: `店舗の更新に失敗しました: ${error}`
            })
          }
        }
      }

      // 削除対象店舗の処理
      if (options.deleteMissing) {
        for (const deletedStore of changes.deletedStores) {
          try {
            await this.storeRepository.delete(deletedStore.id)
            result.stats.deleted++
            result.changes.push({
              type: 'delete',
              store_code: deletedStore.store_code,
              name: deletedStore.name
            })
          } catch (error) {
            result.stats.errors++
            result.errors.push({
              row: 0,
              field: 'store_code',
              message: `店舗の削除に失敗しました: ${error}`
            })
          }
        }
      }

      result.success = result.stats.errors === 0
      result.message = result.success 
        ? `インポートが完了しました。新規: ${result.stats.new}件, 更新: ${result.stats.updated}件, 削除: ${result.stats.deleted}件`
        : `インポート中にエラーが発生しました。エラー: ${result.stats.errors}件`

    } catch (error) {
      result.message = `インポート処理中にエラーが発生しました: ${error}`
    }

    return result
  }

  // CSVテンプレートを生成
  generateTemplate(): Blob {
    const templateData = [
      ['店舗番号', 'エリア長コード', '店舗名', '舗名', '廃棄品目E', '廃棄品目F', '廃棄品目G', '廃棄品目H', '廃棄品目I', '廃棄品目J', '廃棄品目K', '廃棄品目L'],
      ['12345', '12345678', 'サンプル店舗1', '東京都', '', '', '', '', '', '', '', ''],
      ['12346', '12345679', 'サンプル店舗2', '大阪府', '', '', '', '', '', '', '', '']
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '店舗データ')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }
}

export default StoreCsvImporter

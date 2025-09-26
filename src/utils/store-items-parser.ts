// ============================================================================
// 店舗物品管理エクセルファイル解析ユーティリティ
// 作成日: 2025-09-16
// 目的: 店舗物品管理形式のエクセルファイルを解析して予約データに変換
// ============================================================================

import * as XLSX from 'xlsx'
import type { Plan } from '@contracts/v0/schema'
import { 
  extractStoreDataFromExcel, 
  generateStoreRegistrationResult,
  type StoreRegistrationData 
} from './store-registration'

export interface StoreItemRow {
  [key: string]: any
}

export interface StoreItemParseResult {
  success: boolean
  data: Plan[]
  stores: StoreRegistrationData[]
  errors: string[]
  warnings: string[]
}

// 店舗物品管理エクセルファイルを解析して予約データに変換
export function parseStoreItemsExcelToPlans(file: File, pickupDate?: string): Promise<StoreItemParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    const errors: string[] = []
    const warnings: string[] = []

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          resolve({
            success: false,
            data: [],
            errors: ['ファイルの読み込みに失敗しました'],
            warnings: [],
            stores: []
          })
          return
        }

        // エクセルファイルを解析
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        if (!worksheet) {
          resolve({
            success: false,
            data: [],
            errors: ['ワークシートが見つかりません'],
            warnings: [],
            stores: []
          })
          return
        }

        // ワークシートをJSONに変換
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        
        if (jsonData.length < 2) {
          resolve({
            success: false,
            data: [],
            errors: ['データが不足しています（ヘッダー行を含めて2行以上必要）'],
            warnings: [],
            stores: []
          })
          return
        }

        // ヘッダー行を取得
        const headers = jsonData[0] as string[]
        const dataRows = jsonData.slice(1)

        // 必須カラムをチェック（列インデックスベース）
        const requiredColumnIndices = [0, 1, 2, 3] // A:店舗番号, B:エリア長コード, C:店舗名, D:舗名
        
        if (headers.length < 4) {
          resolve({
            success: false,
            data: [],
            errors: ['必須カラムが不足しています（A:店舗番号, B:エリア長コード, C:店舗名, D:舗名が必要）'],
            warnings: [],
            stores: []
          })
          return
        }

        // 回収日の設定
        const defaultPickupDate = pickupDate || new Date().toISOString().split('T')[0]

        // 店舗データを抽出
        const storeData = extractStoreDataFromExcel(jsonData)
        
        // データを変換
        const plans: Plan[] = []
        
        dataRows.forEach((row, index) => {
          try {
            if (row.every(cell => !cell)) return // 空行をスキップ

            const storePlans = convertStoreItemRowToPlans(row, headers, index + 2, defaultPickupDate)
            plans.push(...storePlans)
          } catch (error) {
            errors.push(`行 ${index + 2}: ${error instanceof Error ? error.message : '不明なエラー'}`)
          }
        })

        if (plans.length === 0) {
          resolve({
            success: false,
            data: [],
            stores: storeData,
            errors: ['有効なデータが見つかりませんでした'],
            warnings
          })
          return
        }

        resolve({
          success: true,
          data: plans,
          stores: storeData,
          errors,
          warnings
        })

      } catch (error) {
        resolve({
          success: false,
          data: [],
          stores: [],
          errors: [`ファイル解析エラー: ${error instanceof Error ? error.message : '不明なエラー'}`],
          warnings: []
        })
      }
    }

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        stores: [],
        errors: ['ファイルの読み込みに失敗しました'],
        warnings: []
      })
    }

    reader.readAsBinaryString(file)
  })
}

// 店舗物品行データをPlanオブジェクトの配列に変換
function convertStoreItemRowToPlans(row: any[], headers: string[], rowNumber: number, pickupDate: string): Plan[] {
  const plans: Plan[] = []
  
  try {
    // 列インデックスベースでデータを取得
    // A列: 店舗番号, B列: エリア長コード, C列: 店舗名, D列: 舗名
    const storeNumber = row[0] ? row[0].toString().trim() : ''
    const areaCode = row[1] ? row[1].toString().trim() : ''
    const storeName = row[2] ? row[2].toString().trim() : ''
    const areaName = row[3] ? row[3].toString().trim() : '福岡'

    // バリデーション
    if (!storeNumber) {
      throw new Error('店舗番号（A列）が空です')
    }
    if (!storeName) {
      throw new Error('店舗名（C列）が空です')
    }

    // 各物品列を処理（E列からL列まで）
    // E列: 混載物, F列: 蛍光灯, G列: テスター, H列: 商品管理ゲート, I列: 未使用クレジット端末, J列: ハンカチ什器, K列: 野菜什器, L列: リスト外対象物物品名
    const itemColumns = [
      { index: 4, name: '混載物', unit: '個' },
      { index: 5, name: '蛍光灯', unit: '本' },
      { index: 6, name: 'テスター', unit: '台' },
      { index: 7, name: '商品管理ゲート', unit: '台' },
      { index: 8, name: '未使用クレジット端末', unit: '台' },
      { index: 9, name: 'ハンカチ什器', unit: '台' },
      { index: 10, name: '野菜什器', unit: '台' }
    ]

    // 各物品列の数量をチェック
    itemColumns.forEach(item => {
      const quantity = row[item.index] ? Number(row[item.index]) : 0
      if (!isNaN(quantity) && quantity > 0) {
        const plan = createPlanFromItem(
          storeNumber,
          areaCode,
          storeName,
          areaName,
          item.name,
          quantity,
          item.unit,
          pickupDate,
          rowNumber
        )
        plans.push(plan)
      }
    })

    // リスト外対象物物品名を処理（L列）
    const listOutItems = row[11] ? row[11].toString().trim() : ''
    if (listOutItems) {
      const listOutPlans = parseListOutItems(listOutItems, storeNumber, areaCode, storeName, areaName, pickupDate, rowNumber)
      plans.push(...listOutPlans)
    }

  } catch (error) {
    throw new Error(`行 ${rowNumber}: ${error instanceof Error ? error.message : '不明なエラー'}`)
  }

  return plans
}

// 物品からPlanオブジェクトを作成
function createPlanFromItem(
  storeNumber: string,
  areaCode: string,
  storeName: string,
  areaName: string,
  itemName: string,
  quantity: number,
  unit: string,
  pickupDate: string,
  rowNumber: number
): Plan {
  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    org_id: 'demo-org-id', // デモ用
    store_id: `store_${storeNumber}`,
    item_name: itemName,
    planned_quantity: quantity,
    unit: normalizeUnit(unit),
    planned_pickup_date: pickupDate,
    area_or_city: areaName,
    notes: `店舗番号: ${storeNumber}, エリアコード: ${areaCode}, 店舗名: ${storeName}`,
    status: 'DRAFT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'demo-user',
    updated_by: 'demo-user',
    deleted_at: null
  }
}

// リスト外対象物物品名を解析
function parseListOutItems(
  listOutItems: string,
  storeNumber: string,
  areaCode: string,
  storeName: string,
  areaName: string,
  pickupDate: string,
  rowNumber: number
): Plan[] {
  const plans: Plan[] = []
  
  try {
    // 改行やカンマで分割
    const items = listOutItems.toString().split(/[,\n]/).map(item => item.trim()).filter(item => item)
    
    items.forEach(item => {
      // 数量を含む記述を解析（例: "液晶テレビ 1台"）
      const quantityMatch = item.match(/(.+?)\s+(\d+(?:\.\d+)?)\s*(.+)/)
      
      if (quantityMatch) {
        const itemName = quantityMatch[1].trim()
        const quantity = parseFloat(quantityMatch[2])
        const unit = quantityMatch[3].trim()
        
        if (!isNaN(quantity) && quantity > 0) {
          const plan = createPlanFromItem(
            storeNumber,
            areaCode,
            storeName,
            areaName,
            itemName,
            quantity,
            unit,
            pickupDate,
            rowNumber
          )
          plans.push(plan)
        }
      } else {
        // 数量が含まれない場合は1個として扱う
        const plan = createPlanFromItem(
          storeNumber,
          areaCode,
          storeName,
          areaName,
          item.trim(),
          1,
          '個',
          pickupDate,
          rowNumber
        )
        plans.push(plan)
      }
    })
  } catch (error) {
    console.warn(`リスト外対象物の解析に失敗: ${error}`)
  }
  
  return plans
}

// 部分一致で値を取得
function getValueByPartialMatch(rowData: StoreItemRow, partialKey: string): any {
  const key = Object.keys(rowData).find(k => k.includes(partialKey))
  return key ? rowData[key] : null
}

// 単位を正規化
function normalizeUnit(unit: string): 'KG' | 'T' | 'L' | 'M3' | 'PCS' {
  if (!unit) return 'PCS'

  const unitStr = unit.toString().toUpperCase().trim()
  
  switch (unitStr) {
    case 'KG':
    case 'キログラム':
    case 'kg':
      return 'KG'
    case 'T':
    case 'トン':
    case 't':
      return 'T'
    case 'L':
    case 'リットル':
    case 'l':
      return 'L'
    case 'M3':
    case '立方メートル':
    case 'm3':
      return 'M3'
    case 'PCS':
    case '個':
    case '台':
    case '本':
    case 'pcs':
      return 'PCS'
    default:
      return 'PCS' // デフォルト
  }
}

// 店舗物品管理エクセルファイルのテンプレートを生成
export function generateStoreItemsTemplate(): void {
  const templateData = [
    ['店舗番号', 'エリア長コード', '店舗名', '舗名', '混載物', '蛍光灯', 'テスター', '商品管理ゲート', '未使用クレジット端末', 'ハンカチ什器', '野菜什器', 'リスト外対象物物品名'],
    ['21487', '00208021', '稲元店', '福岡', '1', '10', '1', '0', '0', '1', '0', '液晶テレビ 1台'],
    ['19361', '00230883', '七重店', '福岡', '0', '5', '0', '0', '1', '0', '1', 'ラック、アルコールディスペンサー'],
    ['12345', '00212345', 'サンプル店', '福岡', '2', '15', '1', '1', '0', '1', '1', '消去機 2台、のぼり棒 3本']
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(templateData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '店舗物品管理')

  // ファイルをダウンロード
  XLSX.writeFile(workbook, '店舗物品管理テンプレート.xlsx')
}

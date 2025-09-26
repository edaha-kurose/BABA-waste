// ============================================================================
// エクセルファイル解析ユーティリティ
// 作成日: 2025-09-16
// 目的: エクセルファイル（.xlsx）を解析して予約データに変換
// ============================================================================

import * as XLSX from 'xlsx'
import type { Plan } from '@contracts/v0/schema'

export interface ExcelRow {
  [key: string]: any
}

export interface ExcelParseResult {
  success: boolean
  data: Plan[]
  errors: string[]
  warnings: string[]
}

// エクセルファイルを解析して予約データに変換
export function parseExcelToPlans(file: File): Promise<ExcelParseResult> {
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
            warnings: []
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
            warnings: []
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
            warnings: []
          })
          return
        }

        // ヘッダー行を取得
        const headers = jsonData[0] as string[]
        const dataRows = jsonData.slice(1)

        // 必須カラムをチェック
        const requiredColumns = [
          '店舗コード', '店舗名', 'エリア', '回収日', '品目名', '数量', '単位'
        ]
        
        const missingColumns = requiredColumns.filter(col => 
          !headers.some(header => header && header.includes(col))
        )

        if (missingColumns.length > 0) {
          resolve({
            success: false,
            data: [],
            errors: [`必須カラムが見つかりません: ${missingColumns.join(', ')}`],
            warnings: []
          })
          return
        }

        // データを変換
        const plans: Plan[] = []
        
        dataRows.forEach((row, index) => {
          try {
            if (row.every(cell => !cell)) return // 空行をスキップ

            const plan = convertRowToPlan(row, headers, index + 2)
            if (plan) {
              plans.push(plan)
            }
          } catch (error) {
            errors.push(`行 ${index + 2}: ${error instanceof Error ? error.message : '不明なエラー'}`)
          }
        })

        if (plans.length === 0) {
          resolve({
            success: false,
            data: [],
            errors: ['有効なデータが見つかりませんでした'],
            warnings
          })
          return
        }

        resolve({
          success: true,
          data: plans,
          errors,
          warnings
        })

      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [`ファイル解析エラー: ${error instanceof Error ? error.message : '不明なエラー'}`],
          warnings: []
        })
      }
    }

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ['ファイルの読み込みに失敗しました'],
        warnings: []
      })
    }

    reader.readAsBinaryString(file)
  })
}

// 行データをPlanオブジェクトに変換
function convertRowToPlan(row: any[], headers: string[], rowNumber: number): Plan | null {
  try {
    // ヘッダーと行データをマッピング
    const rowData: ExcelRow = {}
    headers.forEach((header, index) => {
      if (header) {
        rowData[header] = row[index] || ''
      }
    })

    // 必須フィールドを抽出
    const storeCode = getValueByPartialMatch(rowData, '店舗コード')
    const storeName = getValueByPartialMatch(rowData, '店舗名')
    const area = getValueByPartialMatch(rowData, 'エリア')
    const pickupDate = getValueByPartialMatch(rowData, '回収日')
    const itemName = getValueByPartialMatch(rowData, '品目名')
    const quantity = getValueByPartialMatch(rowData, '数量')
    const unit = getValueByPartialMatch(rowData, '単位')

    // バリデーション
    if (!storeCode) {
      throw new Error('店舗コードが空です')
    }
    if (!storeName) {
      throw new Error('店舗名が空です')
    }
    if (!pickupDate) {
      throw new Error('回収日が空です')
    }
    if (!itemName) {
      throw new Error('品目名が空です')
    }
    if (!quantity || isNaN(Number(quantity))) {
      throw new Error('数量が無効です')
    }

    // 日付の正規化
    const normalizedDate = normalizeDate(pickupDate)
    if (!normalizedDate) {
      throw new Error('回収日の形式が無効です（YYYY-MM-DD形式で入力してください）')
    }

    // 数量の正規化
    const normalizedQuantity = parseFloat(quantity.toString())
    if (isNaN(normalizedQuantity) || normalizedQuantity <= 0) {
      throw new Error('数量は0より大きい数値である必要があります')
    }

    // 単位の正規化
    const normalizedUnit = normalizeUnit(unit)

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      org_id: 'demo-org-id', // デモ用
      store_id: `store_${storeCode}`,
      item_name: itemName.toString(),
      planned_quantity: normalizedQuantity,
      unit: normalizedUnit,
      planned_pickup_date: normalizedDate,
      area_or_city: area?.toString() || '',
      notes: '',
      status: 'DRAFT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'demo-user',
      updated_by: 'demo-user',
      deleted_at: null
    }

  } catch (error) {
    throw new Error(`行 ${rowNumber}: ${error instanceof Error ? error.message : '不明なエラー'}`)
  }
}

// 部分一致で値を取得
function getValueByPartialMatch(rowData: ExcelRow, partialKey: string): any {
  const key = Object.keys(rowData).find(k => k.includes(partialKey))
  return key ? rowData[key] : null
}

// 日付を正規化
function normalizeDate(dateValue: any): string | null {
  if (!dateValue) return null

  let date: Date

  if (typeof dateValue === 'string') {
    // 文字列の場合
    const dateStr = dateValue.toString().trim()
    
    // 様々な形式に対応
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // YYYY-MM-DD形式
      date = new Date(dateStr)
    } else if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
      // YYYY/MM/DD形式
      date = new Date(dateStr.replace(/\//g, '-'))
    } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      // MM/DD/YYYY形式
      const parts = dateStr.split('/')
      date = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`)
    } else {
      // その他の形式
      date = new Date(dateStr)
    }
  } else if (typeof dateValue === 'number') {
    // 数値の場合（Excelの日付シリアル値）
    date = XLSX.SSF.parse_date_code(dateValue)
  } else {
    // Dateオブジェクトの場合
    date = new Date(dateValue)
  }

  if (isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().split('T')[0] // YYYY-MM-DD形式で返す
}

// 単位を正規化
function normalizeUnit(unit: any): 'KG' | 'T' | 'L' | 'M3' | 'PCS' {
  if (!unit) return 'KG'

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
    case 'pcs':
      return 'PCS'
    default:
      return 'KG' // デフォルト
  }
}

// エクセルファイルのテンプレートを生成
export function generateExcelTemplate(): void {
  const templateData = [
    ['店舗コード', '店舗名', 'エリア', '回収日', '品目名', '数量', '単位', '備考'],
    ['001', '本店', '渋谷区', '2025-09-20', '廃プラスチック', '2.5', 'T', ''],
    ['002', '支店A', '新宿区', '2025-09-21', '古紙', '50', 'KG', ''],
    ['003', '支店B', '港区', '2025-09-22', '金属くず', '1.2', 'T', '']
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(templateData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '予定データ')

  // ファイルをダウンロード
  XLSX.writeFile(workbook, '予定データテンプレート.xlsx')
}




import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import type { ManagedStore } from '@contracts/v0/schema'

export interface ExcelImportConfig {
  mainItemColumns: string[] // メイン物品の列（例: ['E', 'F', 'G', 'H', 'I', 'J', 'K']）
  otherItemColumn: string // その他物品の列（例: 'L'）
  dataStartRow: number // データ開始行（例: 3）
  storeCodeColumn?: string // 店舗番号列
  storeNameColumn?: string // 店舗名列
  areaColumn?: string // エリア列
}

export interface ExcelRowData {
  store_code: string
  area_manager_code: string
  store_name: string
  area_name: string
  main_items: Array<{
    item_name: string
    quantity: number
    unit: string
  }>
  other_items: Array<{
    item_name: string
    quantity: number
    unit: string
  }>
}

export interface ConvertedRequestData {
  store_code: string
  collector_name: string
  main_items: Array<{
    item_name: string
    quantity: number
    unit: string
  }>
  other_items: Array<{
    item_name: string
    quantity: number
    unit: string
  }>
  planned_pickup_date: string
  area_or_city: string
  notes: string
}

export class FlexibleExcelConverter {
  private config: ExcelImportConfig
  private managedStores: ManagedStore[] = []

  constructor(config: ExcelImportConfig) {
    this.config = config
  }

  // 管理店舗マスターを設定
  setManagedStores(stores: ManagedStore[]) {
    this.managedStores = stores
  }

  // 廃棄依頼データに変換（生のExcelデータ用）
  convertToRequestData(
    excelData: any[][],
    pickupDate: string = dayjs().add(1, 'day').format('YYYY-MM-DD')
  ): ConvertedRequestData[] {
    const requests: ConvertedRequestData[] = []

    if (excelData.length < 2) {
      return requests
    }

    const headers = excelData[0]
    const dataRows = excelData.slice(this.config.dataStartRow - 1) // データ開始行から

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (row.length === 0 || row.every(cell => !cell)) continue

      try {
        // 列マッピングに基づいてデータを抽出
        const storeCode = this.getValueFromRow(row, headers, this.config.storeCodeColumn || 'A')
        const storeName = this.getValueFromRow(row, headers, this.config.storeNameColumn || 'B')
        const area = this.getValueFromRow(row, headers, this.config.areaColumn || 'C') || '不明'

        if (!storeCode || !storeName) continue

        // メイン物品を解析
        const mainItems = this.parseMainItemsFromRow(row, headers)
        // その他物品を解析
        const otherItems = this.parseOtherItemsFromRow(row, headers)

        // 管理店舗マスターから店舗情報を取得
        const managedStore = this.managedStores.find(s => s.store_code === storeCode)

        if (mainItems.length > 0 || otherItems.length > 0) {
          requests.push({
            store_code: storeCode,
            collector_name: '自動割当',
            main_items: mainItems,
            other_items: otherItems,
            planned_pickup_date: pickupDate,
            area_or_city: area,
            notes: `Excel取り込み: ${storeName}${managedStore ? '' : ' (管理店舗マスターにない店舗)'}`
          })
        }
      } catch (error) {
        console.warn(`行 ${i + this.config.dataStartRow} の処理でエラー:`, error)
      }
    }

    return requests
  }

  // 行から値を取得
  private getValueFromRow(row: any[], headers: any[], columnName: string): string {
    const index = this.columnToIndex(columnName)
    return index < row.length ? String(row[index] || '').trim() : ''
  }

  // 行からメイン物品を解析
  private parseMainItemsFromRow(row: any[], headers: any[]): Array<{ item_name: string; quantity: number; unit: string }> {
    const items: Array<{ item_name: string; quantity: number; unit: string }> = []

    for (const column of this.config.mainItemColumns) {
      const index = this.columnToIndex(column)
      if (index < row.length && index < headers.length) {
        const quantity = parseFloat(row[index]) || 0
        const item_name = String(headers[index] || '').trim()
        
        if (quantity > 0 && item_name) {
          items.push({
            item_name,
            quantity,
            unit: this.getUnitForItem(item_name)
          })
        }
      }
    }

    return items
  }

  // 行からその他物品を解析
  private parseOtherItemsFromRow(row: any[], headers: any[]): Array<{ item_name: string; quantity: number; unit: string }> {
    const items: Array<{ item_name: string; quantity: number; unit: string }> = []
    const index = this.columnToIndex(this.config.otherItemColumn)

    if (index < row.length && index < headers.length) {
      const item_name = String(row[index] || '').trim()
      const header_name = String(headers[index] || '').trim()
      
      if (item_name && header_name) {
        items.push({
          item_name,
          quantity: 1,
          unit: 'PCS'
        })
      }
    }

    return items
  }

  // 列文字をインデックスに変換
  private columnToIndex(column: string): number {
    let index = 0
    for (let i = 0; i < column.length; i++) {
      index = index * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
    }
    return index - 1
  }

  // 物品名から単位を取得
  private getUnitForItem(itemName: string): string {
    const unitMap: { [key: string]: string } = {
      '混載物': 'kg',
      '蛍光灯': '本',
      'テスター': '個',
      '商品管理ゲート': '個',
      '未使用クレジット端末': '個',
      'ハンカチ什器': 'PCS',
      '野菜什器': 'PCS',
    }
    
    return unitMap[itemName] || 'kg'
  }

  // サマリーを生成
  generateSummary(excelData: any[][], requestData: ConvertedRequestData[]): any {
    const totalStores = new Set(requestData.map(r => r.store_code)).size
    const totalItems = requestData.reduce((sum, r) => sum + r.main_items.length + r.other_items.length, 0)
    
    return {
      totalRequests: requestData.length,
      totalStores,
      totalItems,
      mainItems: requestData.reduce((sum, r) => sum + r.main_items.length, 0),
      otherItems: requestData.reduce((sum, r) => sum + r.other_items.length, 0)
    }
  }
}
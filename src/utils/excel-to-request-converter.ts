import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

export interface ExcelStoreItemRow {
  store_code: number
  area_manager_code: number
  store_name: string
  area_name: string
  items: { [key: string]: number }
}

export interface ExcelHandkerchiefRow {
  store_code: number
  store_name: string
  prefecture: string
}

export interface ExcelVegetableRow {
  store_code: number
  store_name: string
  prefecture: string
  equipment_count: string
  removal_status: string
}

export interface ConvertedRequestRow {
  store_code: string
  collector_name: string
  item_name: string
  planned_quantity: number
  unit: string
  planned_pickup_date: string
  area_or_city: string
  notes: string
}

export class ExcelToRequestConverter {
  // Excelファイルを解析して全シートのデータを取得
  async parseExcelFile(file: File): Promise<{
    storeItems: ExcelStoreItemRow[]
    handkerchief: ExcelHandkerchiefRow[]
    vegetable: ExcelVegetableRow[]
  }> {
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
          
          // シート1: リスト（店舗物品管理データ）
          const storeItems = this.parseStoreItemsSheet(workbook)
          
          // シート2: ハンカチ什器
          const handkerchief = this.parseHandkerchiefSheet(workbook)
          
          // シート3: 野菜什器
          const vegetable = this.parseVegetableSheet(workbook)

          resolve({
            storeItems,
            handkerchief,
            vegetable
          })
        } catch (error) {
          reject(new Error(`Excelファイルの解析に失敗しました: ${error}`))
        }
      }

      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'))
      }
      
      reader.readAsBinaryString(file)
    })
  }

  // シート1: リスト（店舗物品管理データ）を解析
  private parseStoreItemsSheet(workbook: XLSX.WorkBook): ExcelStoreItemRow[] {
    const sheetName = 'リスト'
    if (!workbook.Sheets[sheetName]) {
      console.warn(`シート "${sheetName}" が見つかりません`)
      return []
    }

    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      range: 1 // 1行目をスキップ
    }) as any[][]

    const rows: ExcelStoreItemRow[] = []
    
    // データ行を処理（2行目から開始、1行目はヘッダー）
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      
      // 必須列のチェック（店舗番号、エリア長コード、店舗名、エリア名）
      if (row.length >= 4 && row[0] && row[1] && row[2] && row[3]) {
        const store_code = String(row[0]).trim()
        const area_manager_code = String(row[1]).trim()
        const store_name = String(row[2]).trim()
        const area_name = String(row[3]).trim()
        
        // 物品データを抽出（4列目以降）
        const items: { [key: string]: number } = {}
        for (let j = 4; j < row.length; j++) {
          const itemName = this.getItemNameFromColumn(j)
          const quantity = parseFloat(row[j]) || 0
          if (itemName && quantity > 0) {
            items[itemName] = quantity
          }
        }
        
        rows.push({
          store_code: parseInt(store_code),
          area_manager_code: parseInt(area_manager_code),
          store_name,
          area_name,
          items
        })
      }
    }

    return rows
  }

  // シート2: ハンカチ什器を解析
  private parseHandkerchiefSheet(workbook: XLSX.WorkBook): ExcelHandkerchiefRow[] {
    const sheetName = 'ハンカチ什器'
    if (!workbook.Sheets[sheetName]) {
      console.warn(`シート "${sheetName}" が見つかりません`)
      return []
    }

    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1
    }) as any[][]

    const rows: ExcelHandkerchiefRow[] = []
    
    // データ行を処理（1行目はヘッダー）
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      
      // 必須列のチェック（店舗コード、店舗名、都道府県）
      if (row.length >= 3 && row[0] && row[1] && row[2]) {
        const store_code = parseInt(String(row[0]).trim())
        const store_name = String(row[1]).trim()
        const prefecture = String(row[2]).trim()
        
        if (!isNaN(store_code)) {
          rows.push({
            store_code,
            store_name,
            prefecture
          })
        }
      }
    }

    return rows
  }

  // シート3: 野菜什器を解析
  private parseVegetableSheet(workbook: XLSX.WorkBook): ExcelVegetableRow[] {
    const sheetName = '野菜什器'
    if (!workbook.Sheets[sheetName]) {
      console.warn(`シート "${sheetName}" が見つかりません`)
      return []
    }

    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1
    }) as any[][]

    const rows: ExcelVegetableRow[] = []
    
    // データ行を処理（1行目はヘッダー）
    for (let i = 2; i < jsonData.length; i++) { // 2行目から開始（1行目は複雑なヘッダー）
      const row = jsonData[i]
      
      // 必須列のチェック（店舗コード、店舗名、都道府県）
      if (row.length >= 3 && row[0] && row[1] && row[2]) {
        const store_code = parseInt(String(row[0]).trim())
        const store_name = String(row[1]).trim()
        const prefecture = String(row[2]).trim()
        const equipment_count = row[3] ? String(row[3]).trim() : ''
        const removal_status = row[4] ? String(row[4]).trim() : ''
        
        if (!isNaN(store_code)) {
          rows.push({
            store_code,
            store_name,
            prefecture,
            equipment_count,
            removal_status
          })
        }
      }
    }

    return rows
  }

  // 列インデックスから物品名を取得
  private getItemNameFromColumn(columnIndex: number): string | null {
    const itemNames = [
      '混載物',
      '蛍光灯',
      'テスター',
      '商品管理ゲート',
      '未使用クレジット端末',
      'ハンカチ什器',
      '野菜什器',
      'リスト外対象物'
    ]
    
    const adjustedIndex = columnIndex - 4 // 4列目から開始
    return itemNames[adjustedIndex] || null
  }

  // 全シートデータを廃棄依頼データに変換
  convertToRequestData(
    data: {
      storeItems: ExcelStoreItemRow[]
      handkerchief: ExcelHandkerchiefRow[]
      vegetable: ExcelVegetableRow[]
    },
    pickupDate: string = dayjs().add(1, 'day').format('YYYY-MM-DD')
  ): ConvertedRequestRow[] {
    const requests: ConvertedRequestRow[] = []
    
    // シート1: 店舗物品管理データ
    for (const storeItem of data.storeItems) {
      for (const [itemName, quantity] of Object.entries(storeItem.items)) {
        if (quantity > 0) {
          requests.push({
            store_code: String(storeItem.store_code),
            collector_name: '自動割当',
            item_name: itemName,
            planned_quantity: quantity,
            unit: this.getUnitForItem(itemName),
            planned_pickup_date: pickupDate,
            area_or_city: storeItem.area_name,
            notes: `Excel取り込み（リスト）: ${storeItem.store_name}`
          })
        }
      }
    }
    
    // シート2: ハンカチ什器
    for (const handkerchief of data.handkerchief) {
      requests.push({
        store_code: String(handkerchief.store_code),
        collector_name: '自動割当',
        item_name: 'ハンカチ什器',
        planned_quantity: 1,
        unit: 'PCS',
        planned_pickup_date: pickupDate,
        area_or_city: handkerchief.prefecture,
        notes: `Excel取り込み（ハンカチ什器）: ${handkerchief.store_name}`
      })
    }
    
    // シート3: 野菜什器
    for (const vegetable of data.vegetable) {
      if (vegetable.removal_status !== '撤去不要') {
        requests.push({
          store_code: String(vegetable.store_code),
          collector_name: '自動割当',
          item_name: '野菜什器',
          planned_quantity: 1,
          unit: 'PCS',
          planned_pickup_date: pickupDate,
          area_or_city: vegetable.prefecture,
          notes: `Excel取り込み（野菜什器）: ${vegetable.store_name} - ${vegetable.equipment_count}`
        })
      }
    }
    
    return requests
  }

  // 物品名から単位を取得
  private getUnitForItem(itemName: string): string {
    const unitMap: { [key: string]: string } = {
      '混載物': 'kg',
      '蛍光灯': 'PCS',
      'テスター': 'PCS',
      '商品管理ゲート': 'PCS',
      '未使用クレジット端末': 'PCS',
      'ハンカチ什器': 'PCS',
      '野菜什器': 'PCS',
      'リスト外対象物': 'kg'
    }
    
    return unitMap[itemName] || 'kg'
  }

  // 変換結果のサマリーを生成
  generateSummary(
    data: {
      storeItems: ExcelStoreItemRow[]
      handkerchief: ExcelHandkerchiefRow[]
      vegetable: ExcelVegetableRow[]
    },
    requests: ConvertedRequestRow[]
  ): {
    totalRequests: number
    storeCount: number
    itemTypes: string[]
    totalQuantity: number
    sheetSummary: {
      storeItems: number
      handkerchief: number
      vegetable: number
    }
  } {
    const storeCodes = new Set(requests.map(r => r.store_code))
    const itemTypes = [...new Set(requests.map(r => r.item_name))]
    const totalQuantity = requests.reduce((sum, r) => sum + r.planned_quantity, 0)
    
    return {
      totalRequests: requests.length,
      storeCount: storeCodes.size,
      itemTypes,
      totalQuantity,
      sheetSummary: {
        storeItems: data.storeItems.length,
        handkerchief: data.handkerchief.length,
        vegetable: data.vegetable.length
      }
    }
  }
}

import * as XLSX from 'xlsx'
import type { Store } from '@contracts/v0/schema'

// ============================================================================
// CSV店舗情報パーサー
// ============================================================================

export interface CsvStoreRow {
  store_code: string
  store_name: string
  area_or_city: string
  pickup_date?: string
  route_id?: string
  item_label?: string
  planned_qty?: number
  actual_qty?: number
  unit?: string
  jwnet_reservation_id?: string
  jwnet_manifest_no?: string
  transporter_name?: string
  vehicle_no?: string
  driver_name?: string
  weighing_ticket_no?: string
  photo_urls?: string
  status?: string
  error_code?: string
  last_updated_at?: string
}

export interface ParsedStoreData {
  storeCode: string
  storeName: string
  areaOrCity: string
  prefecture: string
}

export class CsvStoreParser {
  // CSVファイルを解析して店舗情報を抽出
  async parseCsvFile(filePath: string): Promise<ParsedStoreData[]> {
    try {
      // CSVファイルを読み込み
      const workbook = XLSX.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // データをJSONに変換
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as CsvStoreRow[]
      
      // 店舗情報を抽出・重複除去
      const storeMap = new Map<string, ParsedStoreData>()
      
      jsonData.forEach((row, index) => {
        if (row.store_code && row.store_name && row.area_or_city) {
          const storeCode = String(row.store_code).trim()
          const storeName = String(row.store_name).trim()
          const areaOrCity = String(row.area_or_city).trim()
          
          // 都道府県を抽出（市区町村から都道府県を推定）
          const prefecture = this.extractPrefecture(areaOrCity)
          
          if (!storeMap.has(storeCode)) {
            storeMap.set(storeCode, {
              storeCode,
              storeName,
              areaOrCity,
              prefecture
            })
          }
        }
      })
      
      return Array.from(storeMap.values())
    } catch (error) {
      console.error('CSVファイルの解析に失敗しました:', error)
      throw new Error(`CSVファイルの解析に失敗しました: ${error}`)
    }
  }

  // 市区町村から都道府県を抽出
  private extractPrefecture(areaOrCity: string): string {
    // 都道府県のマッピング
    const prefectureMap: Record<string, string> = {
      // 東京都
      '新宿区': '東京都', '渋谷区': '東京都', '港区': '東京都', '品川区': '東京都', '目黒区': '東京都',
      '世田谷区': '東京都', '大田区': '東京都', '杉並区': '東京都', '中野区': '東京都', '練馬区': '東京都',
      '豊島区': '東京都', '北区': '東京都', '荒川区': '東京都', '台東区': '東京都', '墨田区': '東京都',
      '江東区': '東京都', '中央区': '東京都', '千代田区': '東京都', '文京区': '東京都', '板橋区': '東京都',
      '足立区': '東京都', '葛飾区': '東京都', '江戸川区': '東京都',
      
      // 神奈川県
      '横浜市': '神奈川県', '川崎市': '神奈川県', '相模原市': '神奈川県', '藤沢市': '神奈川県', '茅ヶ崎市': '神奈川県',
      '平塚市': '神奈川県', '小田原市': '神奈川県', '厚木市': '神奈川県', '大和市': '神奈川県', '海老名市': '神奈川県',
      
      // 埼玉県
      'さいたま市': '埼玉県', '川越市': '埼玉県', '所沢市': '埼玉県', '越谷市': '埼玉県', '川口市': '埼玉県',
      '熊谷市': '埼玉県', '春日部市': '埼玉県', '草加市': '埼玉県', '上尾市': '埼玉県', '蕨市': '埼玉県',
      
      // 千葉県
      '千葉市': '千葉県', '船橋市': '千葉県', '松戸市': '千葉県', '柏市': '千葉県', '市川市': '千葉県',
      '習志野市': '千葉県', '八千代市': '千葉県', '流山市': '千葉県', '我孫子市': '千葉県', '鎌ヶ谷市': '千葉県',
      
      // 茨城県
      '水戸市': '茨城県', 'つくば市': '茨城県', '日立市': '茨城県', '土浦市': '茨城県', '古河市': '茨城県',
      '石岡市': '茨城県', '結城市': '茨城県', '龍ケ崎市': '茨城県', '下妻市': '茨城県', '常総市': '茨城県',
      
      // 栃木県
      '宇都宮市': '栃木県', '小山市': '栃木県', '栃木市': '栃木県', '佐野市': '栃木県', '鹿沼市': '栃木県',
      '日光市': '栃木県', '真岡市': '栃木県', '大田原市': '栃木県', '矢板市': '栃木県', '那須塩原市': '栃木県',
      
      // 群馬県
      '前橋市': '群馬県', '高崎市': '群馬県', '桐生市': '群馬県', '伊勢崎市': '群馬県', '太田市': '群馬県',
      '沼田市': '群馬県', '館林市': '群馬県', '渋川市': '群馬県', '藤岡市': '群馬県', '富岡市': '群馬県',
    }

    // 直接マッチング
    if (prefectureMap[areaOrCity]) {
      return prefectureMap[areaOrCity]
    }

    // 部分マッチング（市、区、町、村を除いて検索）
    const cleanArea = areaOrCity.replace(/[市区町村]$/, '')
    if (prefectureMap[cleanArea]) {
      return prefectureMap[cleanArea]
    }

    // 都道府県名が含まれている場合
    const prefectureNames = ['東京都', '神奈川県', '埼玉県', '千葉県', '茨城県', '栃木県', '群馬県']
    for (const pref of prefectureNames) {
      if (areaOrCity.includes(pref)) {
        return pref
      }
    }

    // デフォルトは東京都
    return '東京都'
  }

  // 店舗データをStoreスキーマに変換
  convertToStoreSchema(parsedData: ParsedStoreData[], orgId: string): Store[] {
    const currentDate = new Date().toISOString()
    
    return parsedData.map((data, index) => ({
      id: `store-${data.storeCode}`,
      org_id: orgId,
      store_code: data.storeCode,
      area_manager_code: `AM${String(index + 1).padStart(8, '0')}`, // 8桁のエリア長コード
      name: data.storeName,
      area_name: data.prefecture, // 都道府県名
      address: `${data.areaOrCity}サンプル町${index + 1}-${index + 1}`,
      area: data.areaOrCity,
      emitter_no: `E${String(index + 1).padStart(3, '0')}`,
      opening_date: undefined,
      closing_date: undefined,
      is_active: true,
      created_at: currentDate,
      updated_at: currentDate,
      created_by: 'system',
      updated_by: 'system',
      deleted_at: undefined
    }))
  }
}

export default CsvStoreParser




// ============================================================================
// 店舗物品管理データから拠点情報を自動登録するユーティリティ
// 作成日: 2025-09-16
// 目的: エクセル取り込み時に拠点情報をマスターテーブルに自動登録
// ============================================================================

import type { Store } from '@contracts/v0/schema'

export interface StoreRegistrationData {
  storeNumber: string
  areaCode: string
  storeName: string
  areaName: string
}

export interface StoreRegistrationResult {
  success: boolean
  stores: Store[]
  errors: string[]
  warnings: string[]
}

// 店舗物品管理データから拠点情報を抽出
export function extractStoreDataFromExcel(
  excelData: any[][]
): StoreRegistrationData[] {
  const stores: StoreRegistrationData[] = []
  const seenStores = new Set<string>()

  // ヘッダー行をスキップしてデータ行を処理
  const dataRows = excelData.slice(1)

  dataRows.forEach((row, index) => {
    try {
      // 空行をスキップ
      if (row.every(cell => !cell)) return

      // 列インデックスベースでデータを取得
      const storeNumber = row[0] ? row[0].toString().trim() : ''
      const areaCode = row[1] ? row[1].toString().trim() : ''
      const storeName = row[2] ? row[2].toString().trim() : ''
      const areaName = row[3] ? row[3].toString().trim() : '福岡'

      // バリデーション
      if (!storeNumber || !storeName) return

      // 重複チェック（店舗番号ベース）
      const storeKey = `${storeNumber}_${areaCode}`
      if (seenStores.has(storeKey)) return

      seenStores.add(storeKey)

      stores.push({
        storeNumber,
        areaCode,
        storeName,
        areaName
      })
    } catch (error) {
      console.warn(`行 ${index + 2} の店舗データ抽出に失敗:`, error)
    }
  })

  return stores
}

// 店舗データをStoreスキーマに変換
export function convertToStoreSchema(
  storeData: StoreRegistrationData,
  orgId: string
): Omit<Store, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'deleted_at'> {
  return {
    org_id: orgId,
    store_code: storeData.storeNumber,
    name: storeData.storeName,
    address: undefined, // エクセルデータには含まれていない
    area: storeData.areaName,
    emitter_no: storeData.areaCode, // エリア長コードを事業場番号として使用
  }
}

// 店舗データの重複チェック
export function checkStoreDuplicates(
  newStores: StoreRegistrationData[],
  existingStores: Store[]
): { duplicates: StoreRegistrationData[], unique: StoreRegistrationData[] } {
  const existingStoreCodes = new Set(existingStores.map(store => store.store_code))
  
  const duplicates: StoreRegistrationData[] = []
  const unique: StoreRegistrationData[] = []

  newStores.forEach(store => {
    if (existingStoreCodes.has(store.storeNumber)) {
      duplicates.push(store)
    } else {
      unique.push(store)
    }
  })

  return { duplicates, unique }
}

// 店舗登録のバリデーション
export function validateStoreData(storeData: StoreRegistrationData): string[] {
  const errors: string[] = []

  if (!storeData.storeNumber) {
    errors.push('店舗番号が空です')
  } else if (!/^\d+$/.test(storeData.storeNumber)) {
    errors.push('店舗番号は数字のみである必要があります')
  }

  if (!storeData.storeName) {
    errors.push('店舗名が空です')
  } else if (storeData.storeName.length > 255) {
    errors.push('店舗名は255文字以内である必要があります')
  }

  if (storeData.areaCode && !/^\d+$/.test(storeData.areaCode)) {
    errors.push('エリア長コードは数字のみである必要があります')
  }

  if (storeData.areaName && storeData.areaName.length > 100) {
    errors.push('エリア名は100文字以内である必要があります')
  }

  return errors
}

// 店舗登録の結果を生成
export function generateStoreRegistrationResult(
  stores: StoreRegistrationData[],
  existingStores: Store[],
  orgId: string
): StoreRegistrationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const newStores: Store[] = []

  // 重複チェック
  const { duplicates, unique } = checkStoreDuplicates(stores, existingStores)

  if (duplicates.length > 0) {
    warnings.push(`${duplicates.length}件の店舗が既に登録済みです（スキップされます）`)
  }

  // ユニークな店舗データを処理
  unique.forEach(storeData => {
    // バリデーション
    const validationErrors = validateStoreData(storeData)
    if (validationErrors.length > 0) {
      errors.push(`店舗 ${storeData.storeName} (${storeData.storeNumber}): ${validationErrors.join(', ')}`)
      return
    }

    // Storeスキーマに変換
    try {
      const storeSchema = convertToStoreSchema(storeData, orgId)
      newStores.push(storeSchema as Store)
    } catch (error) {
      errors.push(`店舗 ${storeData.storeName} (${storeData.storeNumber}) の変換に失敗: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  })

  return {
    success: errors.length === 0,
    stores: newStores,
    errors,
    warnings
  }
}




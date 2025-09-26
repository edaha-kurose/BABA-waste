// ============================================================================
// JWNETデータ読み込みスクリプト
// 作成日: 2025-09-16
// 目的: JWNETフォルダーから廃棄物コードデータを読み込んでシステムに取り込む
// ============================================================================

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// JWNETフォルダーのパス
const JWNET_FOLDER = 'C:\\Users\\kuros\\Desktop\\JWNET'

// 出力ファイルのパス
const OUTPUT_FILE = './src/data/jwnet-waste-codes.json'

/**
 * JWNETのExcelファイルから廃棄物コードデータを読み込む
 */
function importJwnetData() {
  try {
    console.log('JWNETデータの読み込みを開始...')
    
    // JWNETフォルダー内のExcelファイルを検索
    const files = fs.readdirSync(JWNET_FOLDER)
    const excelFiles = files.filter(file => 
      file.endsWith('.xlsx') && 
      !file.startsWith('~') && 
      !file.includes('雛形')
    )
    
    console.log(`見つかったExcelファイル: ${excelFiles.length}件`)
    
    const allWasteCodes = []
    
    for (const file of excelFiles) {
      console.log(`処理中: ${file}`)
      
      try {
        const filePath = path.join(JWNET_FOLDER, file)
        const workbook = XLSX.readFile(filePath)
        
        // すべてのシートを処理
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName]
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          // データの構造を分析して廃棄物コードを抽出
          const wasteCodes = extractWasteCodes(data, file, sheetName)
          allWasteCodes.push(...wasteCodes)
        }
      } catch (error) {
        console.warn(`ファイル ${file} の処理でエラー:`, error.message)
      }
    }
    
    // 重複を除去
    const uniqueWasteCodes = removeDuplicates(allWasteCodes)
    
    console.log(`抽出された廃棄物コード: ${uniqueWasteCodes.length}件`)
    
    // JSONファイルとして保存
    const outputDir = path.dirname(OUTPUT_FILE)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueWasteCodes, null, 2), 'utf8')
    
    console.log(`データを ${OUTPUT_FILE} に保存しました`)
    
    // 統計情報を表示
    showStatistics(uniqueWasteCodes)
    
  } catch (error) {
    console.error('JWNETデータの読み込みでエラーが発生しました:', error)
  }
}

/**
 * Excelデータから廃棄物コードを抽出
 */
function extractWasteCodes(data, fileName, sheetName) {
  const wasteCodes = []
  
  // ヘッダー行をスキップ（1行目）
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue
    
    // 廃棄物コードのパターンを検索
    const wasteCode = extractWasteCodeFromRow(row, i, fileName, sheetName)
    if (wasteCode) {
      wasteCodes.push(wasteCode)
    }
  }
  
  return wasteCodes
}

/**
 * 行データから廃棄物コードを抽出
 */
function extractWasteCodeFromRow(row, rowIndex, fileName, sheetName) {
  // JWNETの列構造に基づく抽出
  // 列23: 廃棄物の種類（分類コード）
  // 列24: 廃棄物の種類（大分類名称）
  // 列25: 廃棄物の種類（名称）
  // 列27: 廃棄物の数量
  // 列28: 廃棄物の数量単位（コード）
  // 列29: 廃棄物の数量単位（名称）
  
  const wasteCodeCol = 23 // 0ベースなので24-1
  const wasteCategoryCol = 24 // 0ベースなので25-1
  const wasteNameCol = 25 // 0ベースなので26-1
  const quantityCol = 26 // 0ベースなので27-1
  const unitCodeCol = 27 // 0ベースなので28-1
  const unitNameCol = 28 // 0ベースなので29-1
  
  if (row.length <= wasteCodeCol) return null
  
  const wasteCode = row[wasteCodeCol]
  const wasteCategory = row[wasteCategoryCol] || ''
  const wasteName = row[wasteNameCol] || ''
  const quantity = row[quantityCol] || 0
  const unitCode = row[unitCodeCol] || '2'
  const unitName = row[unitNameCol] || 'ｍ³'
  
  // 廃棄物コードが存在し、有効な値かチェック
  if (!wasteCode || typeof wasteCode !== 'number' || wasteCode <= 0) {
    return null
  }
  
  // 廃棄物コードを文字列に変換（7桁の0埋め）
  const wasteCodeStr = wasteCode.toString().padStart(7, '0')
  
  // 廃棄物の種類を推定
  const inferredCategory = inferWasteCategory(wasteName, wasteCodeStr)
  const wasteType = inferWasteType(wasteName, wasteCodeStr)
  
  return {
    waste_code: wasteCodeStr,
    waste_name: wasteName || '未分類廃棄物',
    waste_category: wasteCategory || inferredCategory,
    waste_type: wasteType,
    unit_code: unitCode.toString(),
    unit_name: unitName,
    quantity: quantity,
    source_file: fileName,
    source_sheet: sheetName,
    source_row: rowIndex + 1
  }
}

/**
 * 廃棄物の種類を推定
 */
function inferWasteCategory(wasteName, wasteCode) {
  const name = wasteName.toLowerCase()
  
  if (name.includes('プラスチック') || name.includes('プラ')) {
    return 'プラスチック類'
  } else if (name.includes('紙') || name.includes('段ボール')) {
    return '紙類'
  } else if (name.includes('金属') || name.includes('鉄')) {
    return '金属類'
  } else if (name.includes('ガラス') || name.includes('びん')) {
    return 'ガラス類'
  } else if (name.includes('木') || name.includes('木材')) {
    return '木類'
  } else if (name.includes('繊維') || name.includes('布')) {
    return '繊維類'
  } else if (name.includes('ゴム') || name.includes('タイヤ')) {
    return 'ゴム類'
  } else if (name.includes('皮革') || name.includes('革')) {
    return '皮革類'
  } else if (name.includes('陶磁器') || name.includes('陶器')) {
    return '陶磁器類'
  } else if (name.includes('汚泥') || name.includes('スラッジ')) {
    return '汚泥'
  } else if (name.includes('廃油') || name.includes('油')) {
    return '廃油'
  } else if (name.includes('廃酸') || name.includes('酸')) {
    return '廃酸'
  } else if (name.includes('廃アルカリ') || name.includes('アルカリ')) {
    return '廃アルカリ'
  } else if (name.includes('廃プラスチック')) {
    return '廃プラスチック類'
  } else if (name.includes('廃紙')) {
    return '廃紙類'
  } else if (name.includes('廃金属')) {
    return '廃金属類'
  } else if (name.includes('廃ガラス')) {
    return '廃ガラス類'
  } else if (name.includes('廃木')) {
    return '廃木類'
  } else if (name.includes('廃繊維')) {
    return '廃繊維類'
  } else if (name.includes('廃ゴム')) {
    return '廃ゴム類'
  } else if (name.includes('廃皮革')) {
    return '廃皮革類'
  } else if (name.includes('廃陶磁器')) {
    return '廃陶磁器類'
  } else {
    return 'その他'
  }
}

/**
 * 廃棄物の分類を推定
 */
function inferWasteType(wasteName, wasteCode) {
  // JWNETの廃棄物コードは7桁の数字
  const code = parseInt(wasteCode)
  
  // 廃棄物の分類コードに基づく判定
  if (code >= 1000000 && code <= 1999999) {
    return '産業廃棄物'
  } else if (code >= 2000000 && code <= 2999999) {
    return '特別管理産業廃棄物'
  } else if (code >= 3000000 && code <= 3999999) {
    return '一般廃棄物'
  } else {
    return 'その他'
  }
}

/**
 * 重複を除去
 */
function removeDuplicates(wasteCodes) {
  const seen = new Set()
  return wasteCodes.filter(code => {
    const key = `${code.waste_code}-${code.waste_name}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * 統計情報を表示
 */
function showStatistics(wasteCodes) {
  console.log('\n=== 統計情報 ===')
  console.log(`総廃棄物コード数: ${wasteCodes.length}`)
  
  // 種類別統計
  const categoryStats = {}
  const typeStats = {}
  
  wasteCodes.forEach(code => {
    categoryStats[code.waste_category] = (categoryStats[code.waste_category] || 0) + 1
    typeStats[code.waste_type] = (typeStats[code.waste_type] || 0) + 1
  })
  
  console.log('\n廃棄物の種類別:')
  Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count}件`)
    })
  
  console.log('\n廃棄物の分類別:')
  Object.entries(typeStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}件`)
    })
}

// スクリプト実行
if (require.main === module) {
  importJwnetData()
}

module.exports = { importJwnetData }

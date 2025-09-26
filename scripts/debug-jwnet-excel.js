// ============================================================================
// JWNET Excelファイル詳細デバッグスクリプト
// 作成日: 2025-09-16
// 目的: 実際のデータを詳しく確認して正しい抽出ロジックを作成
// ============================================================================

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// JWNETフォルダーのパス
const JWNET_FOLDER = 'C:\\Users\\kuros\\Desktop\\JWNET'

/**
 * Excelファイルの詳細デバッグ
 */
function debugJwnetExcel() {
  try {
    console.log('JWNET Excelファイルの詳細デバッグを開始...')
    
    const files = fs.readdirSync(JWNET_FOLDER)
    const excelFiles = files.filter(file => 
      file.endsWith('.xlsx') && 
      !file.startsWith('~') && 
      !file.includes('雛形')
    )
    
    for (const file of excelFiles) {
      console.log(`\n=== 詳細デバッグ: ${file} ===`)
      
      const filePath = path.join(JWNET_FOLDER, file)
      const workbook = XLSX.readFile(filePath)
      
      for (const sheetName of workbook.SheetNames) {
        console.log(`\n--- シート: ${sheetName} ---`)
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // 最初の5行の詳細を表示
        console.log('最初の5行の詳細:')
        for (let i = 0; i < Math.min(5, data.length); i++) {
          const row = data[i]
          console.log(`\n行${i + 1}:`)
          for (let j = 0; j < Math.min(30, row.length); j++) {
            const cell = row[j]
            if (cell !== undefined && cell !== '') {
              console.log(`  列${j + 1}: "${cell}" (型: ${typeof cell})`)
            }
          }
        }
        
        // 廃棄物関連の列を特定
        console.log('\n廃棄物関連の列を検索:')
        const headerRow = data[0]
        for (let j = 0; j < headerRow.length; j++) {
          const header = headerRow[j]
          if (typeof header === 'string' && (
            header.includes('廃棄物') || 
            header.includes('種類') || 
            header.includes('分類') ||
            header.includes('コード')
          )) {
            console.log(`列${j + 1}: "${header}"`)
          }
        }
        
        // 実際のデータ行で廃棄物コードを検索
        console.log('\n実際のデータ行で廃棄物コードを検索:')
        for (let i = 1; i < Math.min(10, data.length); i++) {
          const row = data[i]
          console.log(`\n行${i + 1}:`)
          for (let j = 0; j < Math.min(30, row.length); j++) {
            const cell = row[j]
            if (typeof cell === 'number' && cell > 1000000) {
              console.log(`  列${j + 1}: ${cell} (廃棄物コードの可能性)`)
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('デバッグでエラーが発生しました:', error)
  }
}

// スクリプト実行
if (require.main === module) {
  debugJwnetExcel()
}

module.exports = { debugJwnetExcel }


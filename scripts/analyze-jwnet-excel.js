// ============================================================================
// JWNET Excelファイル構造分析スクリプト
// 作成日: 2025-09-16
// 目的: Excelファイルの構造を分析して適切な抽出ロジックを作成
// ============================================================================

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

// JWNETフォルダーのパス
const JWNET_FOLDER = 'C:\\Users\\kuros\\Desktop\\JWNET'

/**
 * Excelファイルの構造を分析
 */
function analyzeJwnetExcel() {
  try {
    console.log('JWNET Excelファイルの構造分析を開始...')
    
    // JWNETフォルダー内のExcelファイルを検索
    const files = fs.readdirSync(JWNET_FOLDER)
    const excelFiles = files.filter(file => 
      file.endsWith('.xlsx') && 
      !file.startsWith('~') && 
      !file.includes('雛形')
    )
    
    console.log(`見つかったExcelファイル: ${excelFiles.length}件`)
    
    for (const file of excelFiles) {
      console.log(`\n=== 分析中: ${file} ===`)
      
      try {
        const filePath = path.join(JWNET_FOLDER, file)
        const workbook = XLSX.readFile(filePath)
        
        console.log(`シート数: ${workbook.SheetNames.length}`)
        console.log(`シート名: ${workbook.SheetNames.join(', ')}`)
        
        // 各シートを分析
        for (const sheetName of workbook.SheetNames) {
          console.log(`\n--- シート: ${sheetName} ---`)
          analyzeSheet(workbook.Sheets[sheetName], sheetName)
        }
      } catch (error) {
        console.warn(`ファイル ${file} の分析でエラー:`, error.message)
      }
    }
    
  } catch (error) {
    console.error('Excelファイルの分析でエラーが発生しました:', error)
  }
}

/**
 * シートの構造を分析
 */
function analyzeSheet(worksheet, sheetName) {
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  
  console.log(`行数: ${data.length}`)
  
  // 最初の10行を表示
  console.log('最初の10行:')
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i]
    if (row && row.length > 0) {
      console.log(`行${i + 1}:`, row.map(cell => 
        typeof cell === 'string' ? `"${cell}"` : cell
      ).join(' | '))
    }
  }
  
  // 廃棄物コードのパターンを検索
  console.log('\n廃棄物コードパターンの検索:')
  const patterns = [
    /^\d{3}-\d{2}$/,  // 001-01
    /^\d{3}\d{2}$/,   // 00101
    /^\d{2}-\d{2}$/,  // 01-01
    /^\d{2}\d{2}$/,   // 0101
    /^\d{3}$/,        // 001
    /^\d{2}$/,        // 01
  ]
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue
    
    for (let j = 0; j < row.length; j++) {
      const cell = row[j]
      if (typeof cell === 'string') {
        const trimmed = cell.trim()
        for (const pattern of patterns) {
          if (pattern.test(trimmed)) {
            console.log(`  行${i + 1}, 列${j + 1}: "${trimmed}"`)
            // 周辺のセルも表示
            const context = []
            for (let k = Math.max(0, j - 2); k < Math.min(row.length, j + 3); k++) {
              context.push(`"${row[k] || ''}"`)
            }
            console.log(`    周辺: [${context.join(', ')}]`)
            break
          }
        }
      }
    }
  }
  
  // 列の構造を分析
  console.log('\n列の構造分析:')
  const maxCols = Math.max(...data.map(row => row ? row.length : 0))
  console.log(`最大列数: ${maxCols}`)
  
  for (let col = 0; col < Math.min(maxCols, 10); col++) {
    const colData = data.map(row => row && row[col] ? row[col] : '').filter(cell => cell !== '')
    console.log(`列${col + 1}: ${colData.length}個のデータ, 例: ${colData.slice(0, 3).join(', ')}`)
  }
}

// スクリプト実行
if (require.main === module) {
  analyzeJwnetExcel()
}

module.exports = { analyzeJwnetExcel }


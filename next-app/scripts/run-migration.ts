// ============================================================================
// マイグレーション実行スクリプト
// 目的: SQLファイルを読み込んでデータベースに実行
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { Client } from 'pg'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

async function main() {
  const migrationFile = process.argv[2]

  if (!migrationFile) {
    console.error('❌ マイグレーションファイルを指定してください')
    console.error('   例: tsx scripts/run-migration.ts db/migrations/001_create_collectors_table.sql')
    process.exit(1)
  }

  console.log('🚀 マイグレーション実行開始...')
  console.log(`   ファイル: ${migrationFile}`)
  console.log('')

  // データベース接続
  const connectionString = process.env.DATABASE_URL?.replace(/sslmode=require/, '') || ''
  const client = new Client({
    connectionString,
    ssl: process.env.DATABASE_URL?.includes('supabase.com')
      ? { rejectUnauthorized: false }
      : false,
  })

  try {
    // SQLファイル読み込み
    const sqlFilePath = resolve(__dirname, '..', migrationFile)
    console.log(`📄 SQLファイルを読み込み中: ${sqlFilePath}`)
    const sql = readFileSync(sqlFilePath, 'utf-8')
    console.log(`   サイズ: ${sql.length} bytes`)
    console.log('')

    // データベース接続
    console.log('🔌 データベースに接続中...')
    await client.connect()
    console.log('✅ 接続成功')
    console.log('')

    // SQL実行
    console.log('⚙️  SQLを実行中...')
    console.log('')

    // pg クライアントで複数SQL文を実行
    const result = await client.query(sql)

    console.log('')
    console.log('='.repeat(60))
    console.log('✅ マイグレーション完了！')
    console.log('='.repeat(60))
    console.log('')
    
    if (result.length > 0) {
      console.log('実行結果:')
      console.log(`  実行されたコマンド数: ${result.length}`)
      console.log('')
    }
    
    console.log('次のステップ:')
    console.log('  1. pnpm prisma:generate を実行')
    console.log('  2. pnpm typecheck で型チェック')
    console.log('  3. テストデータ作成')
    console.log('')

  } catch (error: any) {
    console.error('')
    console.error('='.repeat(60))
    console.error('❌ マイグレーション失敗')
    console.error('='.repeat(60))
    console.error('')
    console.error('エラー:', error.message)
    console.error('')
    
    if (error.code) {
      console.error(`エラーコード: ${error.code}`)
    }
    
    if (error.position) {
      console.error(`エラー位置: ${error.position}`)
    }
    
    console.error('')
    console.error('対処方法:')
    console.error('  1. エラーメッセージを確認')
    console.error('  2. SQLファイルの構文を確認')
    console.error('  3. 必要に応じてロールバックSQLを実行')
    console.error('     → tsx scripts/run-migration.ts db/migrations/001_rollback_collectors_table.sql')
    console.error('')
    
    throw error
  } finally {
    // 接続クローズ
    await client.end()
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    process.exit(1)
  })


// ============================================================================
// 孤立レコード物理削除スクリプト
// 目的: waste_type_masters の孤立レコードを物理削除
// 理由: 外部キー制約追加前なので物理削除が安全
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'
import { Client } from 'pg'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

async function main() {
  console.log('🔧 孤立レコード物理削除開始...\n')

  const connectionString = process.env.DATABASE_URL?.replace(/sslmode=require/, '') || ''
  const client = new Client({
    connectionString,
    ssl: process.env.DATABASE_URL?.includes('supabase.com')
      ? { rejectUnauthorized: false }
      : false,
  })

  try {
    await client.connect()
    console.log('✅ データベース接続成功\n')

    // 孤立レコード確認（論理削除済みも含む）
    console.log('1️⃣  孤立レコードを確認中（論理削除済みも含む）...')
    const checkResult = await client.query(`
      SELECT COUNT(*) as count
      FROM app.waste_type_masters w
      LEFT JOIN app.collectors c ON w.collector_id = c.id
      WHERE c.id IS NULL;
    `)
    const orphanedCount = parseInt(checkResult.rows[0].count)
    console.log(`   孤立レコード: ${orphanedCount}件\n`)

    if (orphanedCount === 0) {
      console.log('✅ 孤立レコードはありません！')
      return
    }

    // 孤立レコードを物理削除
    console.log('2️⃣  孤立レコードを物理削除中...')
    console.log('   （外部キー制約追加前なので安全です）')
    const deleteResult = await client.query(`
      DELETE FROM app.waste_type_masters
      WHERE id IN (
        SELECT w.id
        FROM app.waste_type_masters w
        LEFT JOIN app.collectors c ON w.collector_id = c.id
        WHERE c.id IS NULL
      );
    `)
    console.log(`   ✅ ${deleteResult.rowCount}件を物理削除しました\n`)

    // 再確認
    console.log('3️⃣  再確認中...')
    const recheckResult = await client.query(`
      SELECT COUNT(*) as count
      FROM app.waste_type_masters w
      LEFT JOIN app.collectors c ON w.collector_id = c.id
      WHERE c.id IS NULL;
    `)
    const remainingCount = parseInt(recheckResult.rows[0].count)
    console.log(`   残りの孤立レコード: ${remainingCount}件\n`)

    if (remainingCount === 0) {
      console.log('='.repeat(60))
      console.log('✅ すべての孤立レコードを削除しました！')
      console.log('='.repeat(60))
      console.log('')
      console.log('次のステップ:')
      console.log('  pnpm exec tsx scripts/run-migration.ts db/migrations/001_create_collectors_table_step2.sql')
      console.log('')
    } else {
      console.log('⚠️  まだ孤立レコードが残っています')
    }

  } catch (error: any) {
    console.error('❌ エラー発生:', error.message)
    throw error
  } finally {
    await client.end()
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(() => {
    process.exit(1)
  })








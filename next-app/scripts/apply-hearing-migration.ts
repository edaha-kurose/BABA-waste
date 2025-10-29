#!/usr/bin/env tsx
/**
 * Supabaseにヒアリング機能のマイグレーションを適用するスクリプト
 * 
 * 使用方法:
 *   DIRECT_DATABASE_URL="postgresql://..." pnpm tsx scripts/apply-hearing-migration.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import pg from 'pg'

const { Pool } = pg

async function main() {
  console.log('🚀 ヒアリング機能マイグレーション開始...\n')

  // Direct connection URLを確認
  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DIRECT_DATABASE_URL または DATABASE_URL 環境変数が設定されていません')
    console.error('   Supabase Dashboard > Settings > Database > Connection string (Direct connection) から取得してください')
    process.exit(1)
  }

  // Pooler URLでないことを確認
  if (databaseUrl.includes('pooler.supabase.com')) {
    console.error('❌ Pooler URLが指定されています')
    console.error('   Prisma Migrateには Direct connection URL が必要です')
    console.error('   Supabase Dashboard > Settings > Database > Connection string を "Direct connection" に切り替えてください')
    process.exit(1)
  }

  console.log('✅ Direct connection URL確認完了')

  // SQLファイルを読み込み
  const sqlPath = join(process.cwd(), 'db', 'migrations', '026_hearing_tables_from_prisma.sql')
  const sql = readFileSync(sqlPath, 'utf-8')

  console.log(`📄 マイグレーションファイル: ${sqlPath}`)
  console.log(`📊 SQL行数: ${sql.split('\n').length}\n`)

  // PostgreSQLに接続
  // SSL設定を明示的に行う
  const isSupabase = databaseUrl.includes('supabase.co')
  const pool = new Pool({
    connectionString: databaseUrl.replace('?sslmode=require', ''),
    ssl: isSupabase ? {
      rejectUnauthorized: false // Supabaseの自己署名証明書を許可
    } : undefined
  })

  try {
    console.log('🔌 Supabaseに接続中...')
    const client = await pool.connect()
    console.log('✅ 接続成功\n')

    console.log('📝 マイグレーション実行中...')
    const startTime = Date.now()

    // トランザクション開始
    await client.query('BEGIN')

    try {
      // SQLを実行
      const result = await client.query(sql)
      
      // トランザクションコミット
      await client.query('COMMIT')
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`✅ マイグレーション成功！ (${duration}秒)\n`)

      // 検証: 作成されたテーブルを確認
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'app' 
          AND table_name LIKE 'hearing%'
        ORDER BY table_name
      `)

      console.log('📋 作成されたテーブル:')
      tablesResult.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.table_name}`)
      })

      console.log(`\n✅ 合計 ${tablesResult.rows.length} テーブル作成完了`)

    } catch (error) {
      // エラー時はロールバック
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    console.log('\n🎉 すべての処理が完了しました！')
    console.log('\n📌 次のステップ:')
    console.log('   1. pnpm prisma db pull   # schema.prismaを同期')
    console.log('   2. pnpm prisma generate  # Prisma Clientを生成')
    console.log('   3. pnpm typecheck        # 型チェック')

  } catch (error) {
    console.error('\n❌ エラーが発生しました:')
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()


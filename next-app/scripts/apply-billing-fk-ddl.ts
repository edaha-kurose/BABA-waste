/**
 * Billing外部キー制約DDL適用スクリプト
 * グローバルルール準拠: 手動SQL実行後の必須手順を自動化
 */

import { Client } from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { config } from 'dotenv'

// .env.localを読み込み
const envPath = resolve(__dirname, '../.env.local')
config({ path: envPath })

// 引用符を削除し、SSL設定を調整
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '')
  // sslmode=require を sslmode=no-verify に変更
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/sslmode=require/g, 'sslmode=no-verify')
}

async function main() {
  console.log('============================================================')
  console.log('🔧 Billing外部キー制約 DDL適用')
  console.log('============================================================\n')

  // DDLファイル読み込み（シンプル版）
  const ddlPath = resolve(__dirname, '../db/ddl/028_add_billing_foreign_keys_simple.sql')
  console.log(`📁 DDL: ${ddlPath}`)
  
  const ddl = readFileSync(ddlPath, 'utf-8')
  console.log(`📝 DDL Size: ${(ddl.length / 1024).toFixed(2)} KB\n`)

  // データベース接続
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Supabase接続用
    },
  })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected\n')

    console.log('🚀 Executing DDL...')
    
    // DDLを個別のステートメントに分割して実行
    // コメント行を削除し、複数行を1行にまとめてから分割
    const cleanedDdl = ddl
      .split('\n')
      .filter(line => {
        const trimmed = line.trim()
        return trimmed.length > 0 && !trimmed.startsWith('--')
      })
      .join(' ')  // 改行をスペースに置換
      .replace(/\s+/g, ' ')  // 複数のスペースを1つに
    
    const statements = cleanedDdl
      .split(/;/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    console.log(`📝 Total statements: ${statements.length}\n`)
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';'  // セミコロンを追加
      console.log(`  [${i + 1}/${statements.length}] Executing...`)
      console.log(`  SQL (first 100 chars): ${stmt.substring(0, 100)}...`)
      try {
        await client.query(stmt)
        console.log(`  ✓ Success`)
      } catch (error: any) {
        // 制約が既に存在する場合のエラーを無視
        if (error.code === '23505' || error.code === '42710' || error.message?.includes('already exists')) {
          console.log(`  ⚠ Constraint already exists (skipped)`)
        } else {
          console.error(`  ✗ Failed:`, error.message)
          console.error(`  Full SQL:`, stmt)
          throw error
        }
      }
    }
    
    console.log('\n✅ All DDL statements executed successfully\n')

    // 検証: 外部キー制約が追加されたか確認
    console.log('🔍 Verifying foreign keys...')
    const { rows } = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_schema = 'app'
        AND tc.table_name IN ('billing_items', 'billing_summaries')
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name LIKE 'fk_billing%'
      ORDER BY tc.table_name, tc.constraint_name
    `)

    console.log(`\n📊 Foreign Keys Added: ${rows.length}\n`)
    rows.forEach((row) => {
      console.log(`  ✓ ${row.table_name}.${row.constraint_name}`)
      console.log(`     DELETE: ${row.delete_rule}, UPDATE: ${row.update_rule}`)
    })

    if (rows.length < 7) {
      console.warn(`\n⚠️  Warning: Expected 7 foreign keys, but found ${rows.length}`)
    } else {
      console.log('\n✅ All 7 foreign keys successfully verified')
    }

    console.log('\n============================================================')
    console.log('✅ DDL適用完了')
    console.log('============================================================')
    console.log('\n📋 次のステップ:')
    console.log('  1. pnpm check:schema-sync')
    console.log('  2. pnpm check:foreign-keys')
    console.log('  3. pnpm typecheck')
    console.log('  4. pnpm test:e2e')

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()


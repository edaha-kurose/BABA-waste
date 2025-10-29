/**
 * 重要な外部キー制約DDL適用スクリプト
 * contracts, hearing_comments, plans の外部キー制約を追加・修正
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
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/sslmode=require/g, 'sslmode=no-verify')
}

async function main() {
  console.log('============================================================')
  console.log('🔧 重要な外部キー制約 DDL適用')
  console.log('============================================================\n')

  const ddlPath = resolve(__dirname, '../db/ddl/029_add_critical_foreign_keys.sql')
  console.log(`📁 DDL: ${ddlPath}`)
  
  const ddl = readFileSync(ddlPath, 'utf-8')
  console.log(`📝 DDL Size: ${(ddl.length / 1024).toFixed(2)} KB\n`)

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected\n')

    console.log('🚀 Executing DDL...')
    
    // コメントを削除（-- と /* */ の両方）
    let cleanedDdl = ddl
      .replace(/\/\*[\s\S]*?\*\//g, '')  // /* ... */ コメントを削除
      .split('\n')
      .filter(line => {
        const trimmed = line.trim()
        return trimmed.length > 0 && !trimmed.startsWith('--')
      })
      .join(' ')
      .replace(/\s+/g, ' ')
    
    const statements = cleanedDdl
      .split(/;/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    console.log(`📝 Total statements: ${statements.length}\n`)
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';'
      console.log(`  [${i + 1}/${statements.length}] Executing...`)
      try {
        await client.query(stmt)
        console.log(`  ✓ Success`)
      } catch (error: any) {
        // 制約が既に存在する場合のエラーを無視
        if (error.code === '23505' || error.code === '42710' || error.message?.includes('already exists')) {
          console.log(`  ⚠ Constraint already exists (skipped)`)
        } else {
          console.error(`  ✗ Failed:`, error.message)
          throw error
        }
      }
    }
    
    console.log('\n✅ All DDL statements executed successfully\n')

    // 検証
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
        AND tc.table_name IN ('contracts', 'hearing_comments', 'plans')
        AND tc.constraint_type = 'FOREIGN KEY'
        AND (
          tc.constraint_name LIKE 'fk_contracts_%'
          OR tc.constraint_name LIKE 'fk_hearing_comments_%'
          OR tc.constraint_name LIKE 'fk_plans_%'
        )
      ORDER BY tc.table_name, tc.constraint_name
    `)

    console.log(`\n📊 Modified/Added Foreign Keys: ${rows.length}\n`)
    rows.forEach((row) => {
      console.log(`  ✓ ${row.table_name}.${row.constraint_name}`)
      console.log(`     DELETE: ${row.delete_rule}, UPDATE: ${row.update_rule}`)
    })

    console.log('\n============================================================')
    console.log('✅ DDL適用完了')
    console.log('============================================================')
    console.log('\n📋 次のステップ:')
    console.log('  1. pnpm check:foreign-keys')
    console.log('  2. pnpm typecheck')
    console.log('  3. pnpm test:e2e')

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()


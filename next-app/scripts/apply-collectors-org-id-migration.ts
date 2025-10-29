#!/usr/bin/env tsx
/**
 * collectors.org_id追加マイグレーション
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import pg from 'pg'

const { Pool } = pg

async function main() {
  console.log('🚀 collectors.org_id追加マイグレーション開始...\n')

  const databaseUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL が設定されていません')
    process.exit(1)
  }

  const sqlPath = join(process.cwd(), 'db', 'migrations', '027_add_org_id_to_collectors.sql')
  const sql = readFileSync(sqlPath, 'utf-8')

  const isSupabase = databaseUrl.includes('supabase.co')
  const pool = new Pool({
    connectionString: databaseUrl.replace('?sslmode=require', ''),
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined
  })

  try {
    const client = await pool.connect()
    console.log('✅ 接続成功\n')

    console.log('📝 マイグレーション実行中...')
    await client.query('BEGIN')

    try {
      await client.query(sql)
      await client.query('COMMIT')
      console.log('✅ マイグレーション成功！\n')

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    console.log('🎉 完了！')

  } catch (error) {
    console.error('\n❌ エラー:')
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()






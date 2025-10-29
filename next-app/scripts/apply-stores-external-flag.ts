import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: join(__dirname, '../.env.local') })

async function main() {
  let rawUrl = process.env.DATABASE_URL
  if (!rawUrl) throw new Error('DATABASE_URL が設定されていません')

  rawUrl = rawUrl.replace(/^["']|["']$/g, '')
  const DATABASE_URL = rawUrl.replace(/sslmode=require/g, 'sslmode=no-verify')

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    console.log('📡 接続中...')
    await client.connect()

    const ddlPath = join(__dirname, '../db/ddl/033_add_is_external_to_stores.sql')
    const ddl = readFileSync(ddlPath, 'utf-8')

    console.log('📝 DDL適用開始')

    const statements = ddl
      .split('\n')
      .filter((line) => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`\n[${index + 1}/${statements.length}]`)
        await client.query(statement)
        console.log('✅ 成功')
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log('⚠️ すでに存在（スキップ）')
        } else {
          console.error('❌', error.message)
          throw error
        }
      }
    }

    console.log('\n✅ DDL適用完了')

    // 確認
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'app' 
        AND table_name = 'stores'
        AND column_name = 'is_external'
    `)

    console.log('\n確認:')
    console.table(result.rows)
  } catch (error) {
    console.error('❌', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()





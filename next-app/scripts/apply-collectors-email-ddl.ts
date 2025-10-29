import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as dotenv from 'dotenv'

// .env.local を読み込み
dotenv.config({ path: join(__dirname, '../.env.local') })

async function main() {
  let rawUrl = process.env.DATABASE_URL
  if (!rawUrl) {
    throw new Error('DATABASE_URL が設定されていません')
  }

  // URL中の引用符を削除
  rawUrl = rawUrl.replace(/^["']|["']$/g, '')
  // sslmode=require を sslmode=no-verify に置換
  const DATABASE_URL = rawUrl.replace(/sslmode=require/g, 'sslmode=no-verify')

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    console.log('📡 データベースに接続中...')
    await client.connect()
    console.log('✅ 接続成功')

    // DDLファイルを読み込み
    const ddlPath = join(__dirname, '../db/ddl/030_add_email_to_collectors.sql')
    const ddl = readFileSync(ddlPath, 'utf-8')

    console.log('📝 DDL適用開始...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // コメント除去と文分割
    const statements = ddl
      .split('\n')
      .filter((line) => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0)

    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`\n実行 ${index + 1}/${statements.length}:`)
        console.log(statement.substring(0, 100) + '...')
        await client.query(statement)
        console.log('✅ 成功')
      } catch (error: any) {
        // "already exists" エラーはスキップ
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('⚠️  スキップ（既に存在）')
        } else {
          console.error('❌ エラー:', error.message)
          throw error
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ DDL適用完了')

    // 確認クエリ
    console.log('\n📊 変更確認中...')
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'app'
        AND table_name = 'collectors'
        AND column_name IN ('email', 'user_id')
      ORDER BY column_name
    `)

    console.log('\n変更後のカラム情報:')
    console.table(result.rows)
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 接続を切断しました')
  }
}

main()





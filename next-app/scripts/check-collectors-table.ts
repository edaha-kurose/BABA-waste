// ============================================================================
// collectors テーブル存在確認スクリプト
// 目的: collectors テーブルがデータベースに存在するかを確認
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 collectors テーブル存在確認開始...\n')

  try {
    // ============================================================================
    // 1. app スキーマの全テーブルを確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('1️⃣  app スキーマの全テーブル')
    console.log('='.repeat(60))
    console.log('')

    const tables = await prisma.$queryRaw<any[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'app'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `

    console.log(`  app スキーマのテーブル数: ${tables.length}件\n`)
    
    const hasCollectors = tables.some(t => t.table_name === 'collectors')
    
    if (hasCollectors) {
      console.log('  ✅ collectors テーブルが見つかりました')
    } else {
      console.log('  ❌ collectors テーブルが見つかりません')
    }
    console.log('')
    
    console.log('  app スキーマのテーブル一覧:')
    tables.forEach((t, idx) => {
      const marker = t.table_name === 'collectors' ? ' ← これ!' : ''
      console.log(`    ${(idx + 1).toString().padStart(2, ' ')}. ${t.table_name}${marker}`)
    })
    console.log('')

    // ============================================================================
    // 2. 全スキーマの collectors テーブルを検索
    // ============================================================================
    console.log('='.repeat(60))
    console.log('2️⃣  全スキーマで collectors テーブルを検索')
    console.log('='.repeat(60))
    console.log('')

    const collectorsInAllSchemas = await prisma.$queryRaw<any[]>`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name = 'collectors'
      ORDER BY table_schema;
    `

    if (collectorsInAllSchemas.length > 0) {
      console.log(`  collectors テーブルが見つかりました: ${collectorsInAllSchemas.length}件\n`)
      collectorsInAllSchemas.forEach((t, idx) => {
        console.log(`  ${idx + 1}. ${t.table_schema}.${t.table_name}`)
      })
      console.log('')
    } else {
      console.log('  ❌ collectors テーブルがどのスキーマにも見つかりません')
      console.log('     → データベースにテーブルが作成されていない可能性が高い')
      console.log('')
    }

    // ============================================================================
    // 3. schema.prisma と実際のデータベースの差分確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('3️⃣  schema.prisma との差分')
    console.log('='.repeat(60))
    console.log('')

    // schema.prisma で定義されている app スキーマのモデル（手動リスト）
    const expectedTables = [
      'actuals',
      'approvals',
      'billing_summaries',
      'collectors', // ← これ
      'collection_requests',
      'item_maps',
      'jwnet_party_combinations',
      'jwnet_waste_codes',
      'organizations',
      'plans',
      'registrations',
      'reservations',
      'store_collector_assignments',
      'stores',
      'user_org_roles',
      'users', // app_users
      'waste_type_masters',
    ]

    const actualTables = tables.map(t => t.table_name)
    const missingTables = expectedTables.filter(t => !actualTables.includes(t))
    const extraTables = actualTables.filter(t => !expectedTables.includes(t))

    if (missingTables.length > 0) {
      console.log(`  ⚠️  schema.prismaに定義されているがDBに存在しないテーブル: ${missingTables.length}件\n`)
      missingTables.forEach((t, idx) => {
        console.log(`    ${idx + 1}. ${t}`)
      })
      console.log('')
    }

    if (extraTables.length > 0) {
      console.log(`  ℹ️  DBに存在するがschema.prismaに定義されていないテーブル: ${extraTables.length}件\n`)
      extraTables.forEach((t, idx) => {
        console.log(`    ${idx + 1}. ${t}`)
      })
      console.log('')
    }

    if (missingTables.length === 0 && extraTables.length === 0) {
      console.log('  ✅ schema.prisma とデータベースは一致しています')
      console.log('')
    }

    // ============================================================================
    // 4. サマリー
    // ============================================================================
    console.log('='.repeat(60))
    console.log('📊 サマリー')
    console.log('='.repeat(60))
    console.log('')

    console.log('【collectors テーブルの状態】')
    if (hasCollectors) {
      console.log('  ✅ app.collectors テーブルは存在します')
    } else if (collectorsInAllSchemas.length > 0) {
      console.log(`  ⚠️  collectors テーブルは存在しますが、別のスキーマにあります`)
      collectorsInAllSchemas.forEach(t => {
        console.log(`     → ${t.table_schema}.${t.table_name}`)
      })
    } else {
      console.log('  ❌ collectors テーブルは存在しません')
      console.log('     → マイグレーションが実行されていない可能性が高い')
    }
    console.log('')

    console.log('【推奨アクション】')
    if (!hasCollectors) {
      console.log('  1. ❗ collectors テーブルを作成する必要があります')
      console.log('     Option A: マイグレーションファイルを作成して実行')
      console.log('     Option B: Supabase Dashboard で直接DDLを実行')
      console.log('     Option C: `prisma db push` で強制同期（開発環境のみ）')
      console.log('')
      console.log('  2. ⚠️  その後、外部キー制約を追加')
      console.log('     → waste_type_masters.collector_id → collectors.id')
    } else {
      console.log('  ✅ 次のステップへ進めます')
      console.log('     → 外部キー制約を追加')
    }
    console.log('')

  } catch (error) {
    console.error('❌ エラー発生:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })








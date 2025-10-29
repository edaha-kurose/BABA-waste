import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.local を読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const prisma = new PrismaClient()

async function checkTestData() {
  console.log('=== データベーステーブル一覧と件数 ===\n')

  const tables = [
    'organizations',
    'app_users',
    'auth_users',
    'stores',
    'collectors',
    'collection_requests',
    'plans',
    'actuals',
    'waste_type_masters',
    'item_maps',
    'hearings',
    'hearing_targets',
    'hearing_responses',
    'hearing_external_stores',
    'hearing_comments',
    'app_billing_items',
    'billing_summaries',
    'contracts',
    'jwnet_party_combinations',
    'registrations',
    'reservations',
    'store_collector_assignments',
  ]

  const results: { table: string; count: number; status: string }[] = []

  for (const table of tables) {
    try {
      const count = await (prisma as any)[table].count()
      results.push({ table, count, status: count > 0 ? 'OK' : 'Empty' })
    } catch (e: any) {
      console.error(`❌ ${table}: ${e.message}`)
      results.push({ table, count: 0, status: 'Error' })
    }
  }

  // 結果を整形して表示
  console.log('テーブル名                      | 件数  | 状態')
  console.log('--------------------------------|-------|-------')
  for (const r of results) {
    const tableName = r.table.padEnd(30)
    const count = r.count.toString().padStart(5)
    const status = r.status.padStart(5)
    console.log(`${tableName} | ${count} | ${status}`)
  }

  console.log('\n=== サマリー ===')
  const okCount = results.filter((r) => r.status === 'OK').length
  const emptyCount = results.filter((r) => r.status === 'Empty').length
  const errorCount = results.filter((r) => r.status === 'Error').length
  console.log(`OK (データあり): ${okCount}`)
  console.log(`Empty (データなし): ${emptyCount}`)
  console.log(`Error: ${errorCount}`)

  if (emptyCount > 0) {
    console.log('\n⚠️  警告: データが空のテーブルがあります:')
    results
      .filter((r) => r.status === 'Empty')
      .forEach((r) => console.log(`  - ${r.table}`))
  }

  if (errorCount > 0) {
    console.log('\n❌ エラー: アクセスできないテーブルがあります:')
    results
      .filter((r) => r.status === 'Error')
      .forEach((r) => console.log(`  - ${r.table}`))
  }
}

checkTestData()
  .catch((e) => {
    console.error('エラーが発生しました:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())


// ============================================================================
// 孤立レコード確認・修正スクリプト
// 目的: waste_type_masters の孤立レコードを確認し、修正する
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 孤立レコード確認開始...\n')

  try {
    // ============================================================================
    // 1. 孤立レコードの詳細を確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('1️⃣  孤立レコードの詳細')
    console.log('='.repeat(60))
    console.log('')

    const orphanedRecords = await prisma.$queryRaw<any[]>`
      SELECT
        w.id,
        w.org_id,
        w.collector_id,
        w.waste_type_code,
        w.waste_type_name,
        w.waste_category,
        w.created_at,
        w.deleted_at
      FROM app.waste_type_masters w
      LEFT JOIN app.collectors c ON w.collector_id = c.id
      WHERE c.id IS NULL
        AND w.deleted_at IS NULL
      ORDER BY w.created_at DESC;
    `

    console.log(`  孤立レコード: ${orphanedRecords.length}件\n`)

    if (orphanedRecords.length > 0) {
      orphanedRecords.forEach((record, idx) => {
        console.log(`  ${idx + 1}. ${record.waste_type_name} (${record.waste_type_code})`)
        console.log(`     ID: ${record.id}`)
        console.log(`     collector_id: ${record.collector_id} (存在しない)`)
        console.log(`     org_id: ${record.org_id}`)
        console.log(`     作成日: ${record.created_at}`)
        console.log('')
      })
    }

    // ============================================================================
    // 2. collectors テーブルの確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('2️⃣  collectors テーブルの状態')
    console.log('='.repeat(60))
    console.log('')

    const collectorsCount = await prisma.collectors.count({
      where: { deleted_at: null },
    })
    console.log(`  collectors 件数: ${collectorsCount}件\n`)

    if (collectorsCount > 0) {
      const collectors = await prisma.collectors.findMany({
        where: { deleted_at: null },
        take: 5,
      })
      collectors.forEach((c, idx) => {
        console.log(`  ${idx + 1}. ${c.company_name}`)
        console.log(`     ID: ${c.id}`)
        console.log('')
      })
    } else {
      console.log('  ⚠️  collectors テーブルにデータがありません')
      console.log('')
    }

    // ============================================================================
    // 3. 修正オプション提示
    // ============================================================================
    console.log('='.repeat(60))
    console.log('3️⃣  修正オプション')
    console.log('='.repeat(60))
    console.log('')

    if (orphanedRecords.length > 0) {
      console.log('【Option A】孤立レコードを論理削除（推奨）')
      console.log('  - 孤立レコードを論理削除（deleted_at を設定）')
      console.log('  - データは保持されるが、検索対象外になる')
      console.log('  - 後で復元可能')
      console.log('')
      console.log('【Option B】孤立レコードを物理削除（非推奨）')
      console.log('  - 孤立レコードを完全に削除')
      console.log('  - 復元不可')
      console.log('')

      if (collectorsCount === 0) {
        console.log('⚠️  collectors テーブルにデータがないため、割り当て直しはできません')
        console.log('   → 先に collectors テーブルにデータを追加する必要があります')
        console.log('')
      }

      console.log('='.repeat(60))
      console.log('💡 推奨アクション')
      console.log('='.repeat(60))
      console.log('')
      console.log('1. 孤立レコードを論理削除')
      console.log('   → tsx scripts/fix-orphaned-records.ts --delete-logically')
      console.log('')
      console.log('2. マイグレーションを再実行')
      console.log('   → pnpm exec tsx scripts/run-migration.ts db/migrations/001_create_collectors_table.sql')
      console.log('')
    } else {
      console.log('✅ 孤立レコードはありません！')
      console.log('   → マイグレーションを再実行できます')
      console.log('')
    }

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








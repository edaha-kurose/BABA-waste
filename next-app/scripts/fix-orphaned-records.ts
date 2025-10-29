// ============================================================================
// 孤立レコード修正スクリプト
// 目的: waste_type_masters の孤立レコードを論理削除
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 孤立レコード修正開始...\n')

  try {
    // ============================================================================
    // 1. 孤立レコードを特定
    // ============================================================================
    console.log('='.repeat(60))
    console.log('1️⃣  孤立レコードを特定中')
    console.log('='.repeat(60))
    console.log('')

    const orphanedRecords = await prisma.$queryRaw<any[]>`
      SELECT
        w.id,
        w.collector_id,
        w.waste_type_name,
        w.waste_type_code
      FROM app.waste_type_masters w
      LEFT JOIN app.collectors c ON w.collector_id = c.id
      WHERE c.id IS NULL
        AND w.deleted_at IS NULL;
    `

    console.log(`  孤立レコード: ${orphanedRecords.length}件\n`)

    if (orphanedRecords.length === 0) {
      console.log('  ✅ 孤立レコードはありません！')
      console.log('')
      return
    }

    orphanedRecords.forEach((record, idx) => {
      console.log(`  ${idx + 1}. ${record.waste_type_name} (${record.waste_type_code})`)
      console.log(`     ID: ${record.id}`)
      console.log(`     collector_id: ${record.collector_id}`)
      console.log('')
    })

    // ============================================================================
    // 2. 孤立レコードを論理削除
    // ============================================================================
    console.log('='.repeat(60))
    console.log('2️⃣  孤立レコードを論理削除中')
    console.log('='.repeat(60))
    console.log('')

    const now = new Date()
    const orphanedIds = orphanedRecords.map(r => r.id)

    const result = await prisma.waste_type_masters.updateMany({
      where: {
        id: {
          in: orphanedIds,
        },
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    })

    console.log(`  ✅ ${result.count}件の孤立レコードを論理削除しました`)
    console.log('')

    // ============================================================================
    // 3. 検証
    // ============================================================================
    console.log('='.repeat(60))
    console.log('3️⃣  検証')
    console.log('='.repeat(60))
    console.log('')

    const remainingOrphaned = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM app.waste_type_masters w
      LEFT JOIN app.collectors c ON w.collector_id = c.id
      WHERE c.id IS NULL
        AND w.deleted_at IS NULL;
    `

    const count = Number(remainingOrphaned[0]?.count || 0)

    if (count === 0) {
      console.log('  ✅ すべての孤立レコードが修正されました')
      console.log('')
      console.log('次のステップ:')
      console.log('  pnpm exec tsx scripts/run-migration.ts db/migrations/001_create_collectors_table.sql')
      console.log('')
    } else {
      console.log(`  ⚠️  まだ${count}件の孤立レコードが残っています`)
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








// ============================================================================
// 外部キー制約確認スクリプト
// 目的: waste_type_masters.collector_id の外部キー制約を確認
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 外部キー制約確認開始...\n')

  try {
    // ============================================================================
    // 1. waste_type_masters テーブルの外部キー制約確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('1️⃣  waste_type_masters の外部キー制約')
    console.log('='.repeat(60))
    console.log('')

    const fkConstraints = await prisma.$queryRaw<any[]>`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      LEFT JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'app'
        AND tc.table_name = 'waste_type_masters'
      ORDER BY kcu.column_name;
    `

    if (fkConstraints.length > 0) {
      console.log(`  ✅ 外部キー制約が見つかりました: ${fkConstraints.length}件\n`)
      fkConstraints.forEach((fk, idx) => {
        console.log(`  ${idx + 1}. ${fk.constraint_name}`)
        console.log(`     カラム: ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`)
        console.log(`     ON UPDATE: ${fk.update_rule}`)
        console.log(`     ON DELETE: ${fk.delete_rule}`)
        console.log('')
      })
    } else {
      console.log('  ⚠️  外部キー制約が見つかりません')
      console.log('')
    }

    // collector_id に対する外部キー制約を個別確認
    console.log('='.repeat(60))
    console.log('2️⃣  collector_id の外部キー制約（詳細）')
    console.log('='.repeat(60))
    console.log('')

    const collectorFk = await prisma.$queryRaw<any[]>`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'app'
        AND tc.table_name = 'waste_type_masters'
        AND kcu.column_name = 'collector_id';
    `

    if (collectorFk.length > 0) {
      console.log('  ✅ collector_id に外部キー制約が設定されています')
      console.log(`     制約名: ${collectorFk[0].constraint_name}`)
      console.log(`     参照先: ${collectorFk[0].foreign_table_name}.${collectorFk[0].foreign_column_name}`)
      console.log('')
    } else {
      console.log('  ❌ collector_id に外部キー制約が設定されていません')
      console.log('     → これが問題の原因です！')
      console.log('')
    }

    // ============================================================================
    // 3. 孤立レコードの確認（存在しない collector_id を持つレコード）
    // ============================================================================
    console.log('='.repeat(60))
    console.log('3️⃣  孤立レコードの確認')
    console.log('='.repeat(60))
    console.log('')

    const orphanedRecords = await prisma.$queryRaw<any[]>`
      SELECT
        w.id,
        w.collector_id,
        w.waste_type_name,
        w.created_at
      FROM app.waste_type_masters w
      LEFT JOIN app.collectors c ON w.collector_id = c.id
      WHERE c.id IS NULL
        AND w.deleted_at IS NULL
      LIMIT 10;
    `

    if (orphanedRecords.length > 0) {
      console.log(`  ⚠️  孤立レコードが見つかりました: ${orphanedRecords.length}件\n`)
      orphanedRecords.forEach((record, idx) => {
        console.log(`  ${idx + 1}. ${record.waste_type_name}`)
        console.log(`     ID: ${record.id}`)
        console.log(`     collector_id: ${record.collector_id} (存在しない)`)
        console.log(`     作成日: ${record.created_at}`)
        console.log('')
      })
    } else {
      console.log('  ✅ 孤立レコードは見つかりませんでした')
      console.log('')
    }

    // ============================================================================
    // 4. collectors テーブルの確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('4️⃣  collectors テーブルの状態')
    console.log('='.repeat(60))
    console.log('')

    const collectorsCount = await prisma.collectors.count({
      where: { deleted_at: null },
    })
    console.log(`  件数（有効）: ${collectorsCount}件`)

    if (collectorsCount > 0) {
      const collectors = await prisma.collectors.findMany({
        where: { deleted_at: null },
        take: 5,
      })
      collectors.forEach((c, idx) => {
        console.log(`  ${idx + 1}. ${c.company_name}`)
        console.log(`     ID: ${c.id}`)
        console.log(`     アクティブ: ${c.is_active ? 'はい' : 'いいえ'}`)
        console.log('')
      })
    } else {
      console.log('  ⚠️  collectors テーブルにデータがありません')
      console.log('')
    }

    // ============================================================================
    // 5. サマリー
    // ============================================================================
    console.log('='.repeat(60))
    console.log('📊 サマリー')
    console.log('='.repeat(60))
    console.log('')

    const hasCollectorFk = collectorFk.length > 0
    const hasOrphanedRecords = orphanedRecords.length > 0
    const hasCollectors = collectorsCount > 0

    console.log('【外部キー制約】')
    console.log(`  ${hasCollectorFk ? '✅' : '❌'} collector_id に外部キー制約が${hasCollectorFk ? '設定されています' : '設定されていません'}`)
    console.log('')

    console.log('【データ整合性】')
    console.log(`  ${hasOrphanedRecords ? '⚠️ ' : '✅'} 孤立レコード: ${hasOrphanedRecords ? `${orphanedRecords.length}件` : 'なし'}`)
    console.log(`  ${hasCollectors ? '✅' : '⚠️ '} collectors: ${collectorsCount}件`)
    console.log('')

    console.log('【推奨アクション】')
    if (!hasCollectorFk) {
      console.log('  1. ❗ 外部キー制約を追加する必要があります')
      console.log('     → schema.prisma にリレーション定義を追加')
      console.log('     → データベースに外部キー制約を追加')
    }
    if (hasOrphanedRecords) {
      console.log('  2. ⚠️  孤立レコードを処理する必要があります')
      console.log('     → 論理削除または既存collectorに割り当て')
    }
    if (!hasCollectors) {
      console.log('  3. ⚠️  collectors テーブルにデータを追加する必要があります')
    }
    if (hasCollectorFk && !hasOrphanedRecords && hasCollectors) {
      console.log('  ✅ 問題ありません！')
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








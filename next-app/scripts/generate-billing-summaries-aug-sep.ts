/**
 * 2025年8月・9月の請求サマリーを生成するスクリプト
 * グローバルルール準拠
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 2025年8月・9月の請求サマリー生成開始...\n')

  const orgId = '00000000-0000-0000-0000-000000000001'
  const months = [
    { date: new Date('2025-08-01'), label: '2025年8月' },
    { date: new Date('2025-09-01'), label: '2025年9月' },
  ]

  let totalCreated = 0
  let totalSkipped = 0

  for (const month of months) {
    console.log(`\n📅 ${month.label} のサマリー生成中...`)

    // 収集業者ごとにグループ化
    const collectorIds = await prisma.app_billing_items.findMany({
      where: {
        org_id: orgId,
        billing_month: month.date,
        deleted_at: null,
        status: 'DRAFT', // DRAFTのみ
      },
      select: {
        collector_id: true,
      },
      distinct: ['collector_id'],
    })

    console.log(`  収集業者: ${collectorIds.length}社`)

    for (const { collector_id } of collectorIds) {
      // 既存サマリーをチェック（冪等性）
      const existingSummary = await prisma.billing_summaries.findFirst({
        where: {
          org_id: orgId,
          collector_id: collector_id,
          billing_month: month.date,
        },
      })

      if (existingSummary) {
        console.log(`    ⏭️  収集業者 ${collector_id}: 既存サマリーあり - スキップ`)
        totalSkipped++
        continue
      }

      // 明細を集計
      const items = await prisma.app_billing_items.findMany({
        where: {
          org_id: orgId,
          collector_id: collector_id,
          billing_month: month.date,
          deleted_at: null,
          status: 'DRAFT',
        },
      })

      if (items.length === 0) {
        console.log(`    ⏭️  収集業者 ${collector_id}: 明細なし - スキップ`)
        continue
      }

      // 集計計算
      let total_fixed_amount = 0
      let total_metered_amount = 0
      let total_other_amount = 0
      let fixed_items_count = 0
      let metered_items_count = 0
      let other_items_count = 0

      items.forEach((item) => {
        if (item.billing_type === 'FIXED') {
          total_fixed_amount += item.amount
          fixed_items_count++
        } else if (item.billing_type === 'METERED') {
          total_metered_amount += item.amount
          metered_items_count++
        } else {
          total_other_amount += item.amount
          other_items_count++
        }
      })

      const subtotal_amount = total_fixed_amount + total_metered_amount + total_other_amount
      const tax_amount = items.reduce((sum, item) => sum + item.tax_amount, 0)
      const total_amount = items.reduce((sum, item) => sum + item.total_amount, 0)

      // サマリー作成
      await prisma.billing_summaries.create({
        data: {
          org_id: orgId,
          collector_id: collector_id,
          billing_month: month.date,
          total_fixed_amount,
          total_metered_amount,
          total_other_amount,
          subtotal_amount,
          tax_amount,
          total_amount,
          total_items_count: items.length,
          fixed_items_count,
          metered_items_count,
          other_items_count,
          status: 'DRAFT', // DRAFTステータス
          notes: 'テストデータ（手数料設定テスト用）',
          created_at: new Date(),
          updated_at: new Date(),
        },
      })

      console.log(`    ✅ 収集業者 ${collector_id}: サマリー作成 (${items.length}件の明細)`)
      totalCreated++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ 生成完了`)
  console.log(`   - 新規作成: ${totalCreated}件`)
  console.log(`   - スキップ: ${totalSkipped}件`)
  console.log('='.repeat(60))
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



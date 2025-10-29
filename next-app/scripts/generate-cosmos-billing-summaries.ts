/**
 * コスモス薬品の請求サマリーを生成するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n🎯 コスモス薬品の請求サマリー生成開始\n')

  const cosmosOrgId = '00000000-0000-0000-0000-000000000001'

  // 収集業者を取得
  const collectors = await prisma.collectors.findMany({
    where: {
      org_id: cosmosOrgId,
      deleted_at: null,
      is_active: true,
    },
  })

  console.log(`✅ 収集業者: ${collectors.length}社`)

  // 対象月を取得
  const months = await prisma.$queryRaw<Array<{ billing_month: Date }>>`
    SELECT DISTINCT billing_month
    FROM app.billing_items
    WHERE org_id = ${cosmosOrgId}::uuid
      AND deleted_at IS NULL
      AND status = 'APPROVED'
    ORDER BY billing_month DESC
  `

  console.log(`✅ 対象月: ${months.length}ヶ月\n`)

  let generatedCount = 0
  let skippedCount = 0

  for (const { billing_month } of months) {
    const monthStr = billing_month.toISOString().substring(0, 7)

    for (const collector of collectors) {
      // 既存サマリーチェック
      const existing = await prisma.billing_summaries.findFirst({
        where: {
          org_id: cosmosOrgId,
          collector_id: collector.id,
          billing_month: billing_month,
        },
      })

      if (existing) {
        skippedCount++
        continue
      }

      // 請求明細を集計
      const billingItems = await prisma.app_billing_items.findMany({
        where: {
          org_id: cosmosOrgId,
          collector_id: collector.id,
          billing_month: billing_month,
          status: 'APPROVED',
          deleted_at: null,
        },
      })

      if (billingItems.length === 0) {
        continue
      }

      // 集計処理
      let total_fixed_amount = 0
      let total_metered_amount = 0
      let total_other_amount = 0
      let fixed_items_count = 0
      let metered_items_count = 0
      let other_items_count = 0

      for (const item of billingItems) {
        switch (item.billing_type) {
          case 'FIXED':
            total_fixed_amount += Number(item.amount)
            fixed_items_count++
            break
          case 'METERED':
            total_metered_amount += Number(item.amount)
            metered_items_count++
            break
          case 'OTHER':
            total_other_amount += Number(item.amount)
            other_items_count++
            break
        }
      }

      const subtotal_amount = total_fixed_amount + total_metered_amount + total_other_amount
      const tax_amount = billingItems.reduce((sum, item) => sum + Number(item.tax_amount), 0)
      const total_amount = subtotal_amount + tax_amount

      // サマリー作成
      await prisma.billing_summaries.create({
        data: {
          org_id: cosmosOrgId,
          collector_id: collector.id,
          billing_month: billing_month,
          total_fixed_amount,
          total_metered_amount,
          total_other_amount,
          subtotal_amount,
          tax_amount,
          total_amount,
          total_items_count: billingItems.length,
          fixed_items_count,
          metered_items_count,
          other_items_count,
          status: 'DRAFT',
          notes: 'Generated for Cosmos',
          created_by: null,
          updated_by: null,
        },
      })

      generatedCount++
      console.log(`✅ ${monthStr} | ${collector.company_name} | ¥${total_amount.toLocaleString()}`)
    }
  }

  console.log(`\n🎉 完了: 生成=${generatedCount}件, スキップ=${skippedCount}件`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



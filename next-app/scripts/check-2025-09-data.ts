/**
 * 2025-09のデータを詳細確認するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n📊 2025-09 データ詳細確認\n')

  const cosmosOrgId = '00000000-0000-0000-0000-000000000001'
  const targetMonth = new Date('2025-09-01')

  // サマリー件数
  const summaryCount = await prisma.billing_summaries.count({
    where: {
      org_id: cosmosOrgId,
      billing_month: targetMonth,
    },
  })

  console.log(`✅ 2025-09 サマリー件数: ${summaryCount}`)

  if (summaryCount > 0) {
    const summaries = await prisma.billing_summaries.findMany({
      where: {
        org_id: cosmosOrgId,
        billing_month: targetMonth,
      },
      include: {
        collectors: {
          select: {
            company_name: true,
          },
        },
      },
    })

    console.log('\n📋 サマリー詳細:')
    summaries.forEach((s) => {
      console.log(
        `  - ${s.collectors.company_name}: ¥${s.total_amount.toLocaleString()} (明細${s.total_items_count}件)`
      )
    })
  }

  // 明細件数
  const itemCount = await prisma.app_billing_items.count({
    where: {
      org_id: cosmosOrgId,
      billing_month: targetMonth,
      deleted_at: null,
    },
  })

  console.log(`\n✅ 2025-09 明細件数: ${itemCount}`)

  // 全月のサマリー件数
  const allSummaries = await prisma.$queryRaw<
    Array<{ billing_month: string; count: number }>
  >`
    SELECT 
      TO_CHAR(billing_month, 'YYYY-MM') as billing_month,
      COUNT(*)::int as count
    FROM app.billing_summaries
    WHERE org_id = ${cosmosOrgId}::uuid
    GROUP BY billing_month
    ORDER BY billing_month DESC
  `

  console.log('\n📅 全月のサマリー件数:')
  allSummaries.forEach((s) => {
    console.log(`  - ${s.billing_month}: ${s.count}件`)
  })

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



/**
 * 請求サマリーの詳細を確認するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n📊 請求サマリー詳細確認\n')

  // 1. 総件数
  const totalCount = await prisma.billing_summaries.count()
  console.log(`✅ 総サマリー件数: ${totalCount}`)

  // 2. 最新5件のサンプル
  const samples = await prisma.billing_summaries.findMany({
    take: 5,
    orderBy: {
      created_at: 'desc',
    },
    include: {
      collectors: {
        select: {
          company_name: true,
        },
      },
    },
  })

  console.log('\n📋 最新5件のサンプル:')
  samples.forEach((s) => {
    const month = s.billing_month.toISOString().substring(0, 7)
    console.log(
      `  - ${month} | ${s.collectors.company_name} | ¥${s.total_amount.toLocaleString()} | 明細${s.total_items_count}件`
    )
  })

  // 3. 組織別の件数
  const orgCounts = await prisma.$queryRaw<Array<{ org_id: string; count: number }>>`
    SELECT org_id, COUNT(*)::int as count
    FROM app.billing_summaries
    GROUP BY org_id
    ORDER BY count DESC
  `

  console.log('\n📊 組織別サマリー件数:')
  orgCounts.forEach((oc) => {
    console.log(`  - org_id: ${oc.org_id} → ${oc.count}件`)
  })

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n📊 2025-10 データ確認中...\n')

  const targetMonth = new Date('2025-10-01')

  const summaryCount = await prisma.billing_summaries.count({
    where: {
      billing_month: targetMonth,
    },
  })

  const itemCount = await prisma.app_billing_items.count({
    where: {
      billing_month: targetMonth,
      deleted_at: null,
    },
  })

  console.log('✅ 2025-10 のサマリー件数:', summaryCount)
  console.log('✅ 2025-10 の明細件数:', itemCount)

  if (summaryCount > 0) {
    const summaries = await prisma.billing_summaries.findMany({
      where: {
        billing_month: targetMonth,
      },
      include: {
        collectors: {
          select: {
            company_name: true,
          },
        },
      },
      take: 5,
    })

    console.log('\n📋 サマリーサンプル (最大5件):')
    summaries.forEach((s) => {
      console.log(
        `  - ${s.collectors.company_name}: ¥${s.total_amount.toLocaleString()} (明細${s.total_items_count}件)`
      )
    })
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})


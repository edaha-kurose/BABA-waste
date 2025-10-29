/**
 * billing_month の実際の値を確認するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n📊 billing_month の実際の値を確認\n')

  const cosmosOrgId = '00000000-0000-0000-0000-000000000001'

  const summaries = await prisma.billing_summaries.findMany({
    where: {
      org_id: cosmosOrgId,
    },
    select: {
      billing_month: true,
      collectors: {
        select: {
          company_name: true,
        },
      },
    },
    orderBy: {
      billing_month: 'desc',
    },
    take: 12,
  })

  console.log('📅 最新12件のbilling_month値:')
  summaries.forEach((s) => {
    console.log(
      `  - ${s.billing_month.toISOString()} | ${s.collectors.company_name}`
    )
  })

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



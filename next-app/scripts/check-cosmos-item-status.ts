/**
 * コスモス薬品の請求明細ステータスを確認するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n📊 コスモス薬品の請求明細ステータス確認\n')

  const cosmosOrgId = '00000000-0000-0000-0000-000000000001'

  // ステータス別の件数
  const statusCounts = await prisma.$queryRaw<
    Array<{ status: string; count: number }>
  >`
    SELECT status, COUNT(*)::int as count
    FROM app.billing_items
    WHERE org_id = ${cosmosOrgId}::uuid
      AND deleted_at IS NULL
    GROUP BY status
    ORDER BY count DESC
  `

  console.log('✅ ステータス別件数:')
  statusCounts.forEach((sc) => {
    console.log(`  - ${sc.status}: ${sc.count}件`)
  })

  // 月別の件数
  const monthCounts = await prisma.$queryRaw<
    Array<{ billing_month: string; count: number }>
  >`
    SELECT 
      TO_CHAR(billing_month, 'YYYY-MM') as billing_month,
      COUNT(*)::int as count
    FROM app.billing_items
    WHERE org_id = ${cosmosOrgId}::uuid
      AND deleted_at IS NULL
    GROUP BY billing_month
    ORDER BY billing_month DESC
    LIMIT 12
  `

  console.log('\n📅 月別件数 (最新12ヶ月):')
  monthCounts.forEach((mc) => {
    console.log(`  - ${mc.billing_month}: ${mc.count}件`)
  })

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



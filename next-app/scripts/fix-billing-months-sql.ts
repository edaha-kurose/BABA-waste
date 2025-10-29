/**
 * SQLを使ってbilling_monthを月初に一括修正するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n🔧 billing_month を月初に一括修正 (SQL)\n')

  const cosmosOrgId = '00000000-0000-0000-0000-000000000001'

  // billing_items を月初に修正
  const itemsResult = await prisma.$executeRaw`
    UPDATE app.billing_items
    SET billing_month = DATE_TRUNC('month', billing_month)::date
    WHERE org_id = ${cosmosOrgId}::uuid
      AND deleted_at IS NULL
      AND billing_month != DATE_TRUNC('month', billing_month)::date
  `

  console.log(`✅ billing_items: ${itemsResult}件を更新`)

  // billing_summaries を月初に修正
  const summariesResult = await prisma.$executeRaw`
    UPDATE app.billing_summaries
    SET billing_month = DATE_TRUNC('month', billing_month)::date
    WHERE org_id = ${cosmosOrgId}::uuid
      AND billing_month != DATE_TRUNC('month', billing_month)::date
  `

  console.log(`✅ billing_summaries: ${summariesResult}件を更新`)

  console.log('\n🎉 完了！')

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



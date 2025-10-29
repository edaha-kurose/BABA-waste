/**
 * billing_itemsのbilling_month値を確認するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n📊 billing_items の billing_month 値確認\n')

  const cosmosOrgId = '00000000-0000-0000-0000-000000000001'

  const items = await prisma.$queryRaw<Array<{ billing_month: Date }>>`
    SELECT DISTINCT billing_month
    FROM app.billing_items
    WHERE org_id = ${cosmosOrgId}::uuid
      AND deleted_at IS NULL
    ORDER BY billing_month DESC
    LIMIT 5
  `

  console.log('📅 最新5ヶ月のbilling_month値:')
  items.forEach((item) => {
    console.log(`  - ${item.billing_month.toISOString()}`)
  })

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



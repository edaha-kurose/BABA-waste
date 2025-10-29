/**
 * コスモス薬品の組織情報を確認するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n🏢 コスモス薬品の組織情報確認\n')

  // コスモス薬品の組織情報
  const cosmosOrg = await prisma.organizations.findFirst({
    where: {
      OR: [
        { name: { contains: 'コスモス' } },
        { name: { contains: 'COSMOS' } },
      ],
      deleted_at: null,
    },
  })

  if (!cosmosOrg) {
    console.log('❌ コスモス薬品が見つかりません')
    return
  }

  console.log('✅ 組織情報:')
  console.log(`  - ID: ${cosmosOrg.id}`)
  console.log(`  - 名前: ${cosmosOrg.name}`)

  // 収集業者数
  const collectorCount = await prisma.collectors.count({
    where: {
      org_id: cosmosOrg.id,
      deleted_at: null,
      is_active: true,
    },
  })

  console.log(`  - 収集業者数: ${collectorCount}`)

  // 既存の請求明細
  const itemCount = await prisma.app_billing_items.count({
    where: {
      org_id: cosmosOrg.id,
      deleted_at: null,
    },
  })

  console.log(`  - 請求明細数: ${itemCount}`)

  // 既存の請求サマリー
  const summaryCount = await prisma.billing_summaries.count({
    where: {
      org_id: cosmosOrg.id,
    },
  })

  console.log(`  - 請求サマリー数: ${summaryCount}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



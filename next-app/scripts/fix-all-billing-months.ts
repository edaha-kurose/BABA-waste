/**
 * billing_items と billing_summaries の billing_month を月初に修正するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n🔧 billing_month を月初に一括修正\n')

  const cosmosOrgId = '00000000-0000-0000-0000-000000000001'

  // 1. billing_items を修正
  console.log('📝 billing_items を修正中...')
  
  const items = await prisma.app_billing_items.findMany({
    where: {
      org_id: cosmosOrgId,
      deleted_at: null,
    },
    select: {
      id: true,
      billing_month: true,
    },
  })

  let itemsUpdated = 0
  for (const item of items) {
    const currentMonth = item.billing_month
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth() // 0-11
    
    // 既に月初の場合はスキップ
    if (currentMonth.getDate() === 1) {
      continue
    }

    // 月初に変更
    const firstDayOfMonth = new Date(year, month, 1)
    
    await prisma.app_billing_items.update({
      where: {
        id: item.id,
      },
      data: {
        billing_month: firstDayOfMonth,
      },
    })

    itemsUpdated++
  }

  console.log(`✅ billing_items: ${itemsUpdated}件を更新\n`)

  // 2. billing_summaries を削除
  console.log('🗑️  billing_summaries を削除中...')
  
  const deletedCount = await prisma.billing_summaries.deleteMany({
    where: {
      org_id: cosmosOrgId,
    },
  })

  console.log(`✅ billing_summaries: ${deletedCount.count}件を削除\n`)

  console.log('🎉 完了！次のステップ: pnpm tsx scripts/generate-cosmos-billing-summaries.ts')

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



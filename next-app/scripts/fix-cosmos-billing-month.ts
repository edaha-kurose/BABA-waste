/**
 * コスモス薬品のbilling_monthを月初に修正するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n🔧 billing_month を月初に修正\n')

  const cosmosOrgId = '00000000-0000-0000-0000-000000000001'

  // 全サマリーを取得
  const summaries = await prisma.billing_summaries.findMany({
    where: {
      org_id: cosmosOrgId,
    },
    select: {
      id: true,
      billing_month: true,
    },
  })

  console.log(`📊 対象サマリー: ${summaries.length}件\n`)

  let updatedCount = 0

  for (const summary of summaries) {
    const currentMonth = summary.billing_month
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth() // 0-11
    
    // 月初に変更
    const firstDayOfMonth = new Date(year, month, 1)
    
    // 既に月初の場合はスキップ
    if (currentMonth.getDate() === 1) {
      continue
    }

    await prisma.billing_summaries.update({
      where: {
        id: summary.id,
      },
      data: {
        billing_month: firstDayOfMonth,
      },
    })

    updatedCount++
    
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    console.log(`✅ ${monthStr}: ${currentMonth.toISOString()} → ${firstDayOfMonth.toISOString()}`)
  }

  console.log(`\n🎉 完了: ${updatedCount}件を更新しました`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



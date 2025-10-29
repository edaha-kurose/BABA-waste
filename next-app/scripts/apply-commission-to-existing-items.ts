/**
 * 既存の請求明細に手数料を適用するスクリプト
 * 
 * ロジック:
 * 1. commission_rules から適用可能なルールを取得
 * 2. 各明細に対して、該当するルールを適用
 * 3. 手数料額と純額を計算
 */

import { prisma } from '../src/lib/prisma'

interface CommissionRule {
  id: string
  org_id: string
  collector_id: string | null
  billing_type: string
  commission_type: string
  commission_value: number
}

async function main() {
  console.log('\n📊 既存明細への手数料適用を開始...\n')

  // 1. 全組織の手数料ルールを取得
  const rules = await prisma.commission_rules.findMany({
    where: {
      is_active: true,
      deleted_at: null,
      OR: [
        { effective_from: null },
        { effective_from: { lte: new Date() } },
      ],
      OR: [
        { effective_to: null },
        { effective_to: { gte: new Date() } },
      ],
    },
    orderBy: [
      { collector_id: 'asc' }, // 業者固有ルールを優先
      { created_at: 'desc' },
    ],
  })

  console.log(`✅ 手数料ルール: ${rules.length}件取得\n`)

  // 2. 手数料が未設定の明細を取得
  const items = await prisma.app_billing_items.findMany({
    where: {
      deleted_at: null,
      commission_amount: null,
    },
    select: {
      id: true,
      org_id: true,
      collector_id: true,
      billing_type: true,
      amount: true,
    },
  })

  console.log(`📝 対象明細: ${items.length}件\n`)

  let updatedCount = 0
  let skippedCount = 0

  for (const item of items) {
    // 3. 該当するルールを検索（業者固有 > 全体）
    const applicableRule = rules.find(
      (r) =>
        r.org_id === item.org_id &&
        (r.collector_id === item.collector_id || r.collector_id === null) &&
        (r.billing_type === item.billing_type || r.billing_type === 'ALL')
    )

    if (!applicableRule) {
      skippedCount++
      continue
    }

    // 4. 手数料を計算
    let commissionAmount = 0
    let commissionRate: number | null = null

    if (applicableRule.commission_type === 'PERCENTAGE') {
      commissionRate = applicableRule.commission_value
      commissionAmount = item.amount * (applicableRule.commission_value / 100)
    } else if (applicableRule.commission_type === 'FIXED_AMOUNT') {
      commissionAmount = applicableRule.commission_value
    }

    const netAmount = item.amount - commissionAmount

    // 5. 明細を更新
    await prisma.app_billing_items.update({
      where: { id: item.id },
      data: {
        commission_type: applicableRule.commission_type,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        is_commission_manual: false,
      },
    })

    updatedCount++

    if (updatedCount % 100 === 0) {
      console.log(`  進捗: ${updatedCount}/${items.length}件`)
    }
  }

  console.log(`\n✅ 更新完了: ${updatedCount}件`)
  console.log(`⏭️  スキップ: ${skippedCount}件（ルールなし）\n`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



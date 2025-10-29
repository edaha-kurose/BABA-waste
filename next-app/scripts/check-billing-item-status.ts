/**
 * 請求明細のステータスを確認するスクリプト
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 請求明細のステータス確認中...\n')

  // コスモス薬品のorg_id
  const orgId = '00000000-0000-0000-0000-000000000001'
  const billingMonth = new Date('2025-07-01')

  // ステータス別の件数を取得
  const statusCounts = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
    SELECT 
      status,
      COUNT(*) as count
    FROM app.billing_items
    WHERE org_id = ${orgId}::uuid
      AND billing_month = ${billingMonth}
      AND deleted_at IS NULL
    GROUP BY status
    ORDER BY count DESC
  `

  console.log('📋 ステータス別件数:')
  statusCounts.forEach((row) => {
    console.log(`  - ${row.status}: ${row.count}件`)
  })

  // サンプルデータを取得
  const samples = await prisma.app_billing_items.findMany({
    where: {
      org_id: orgId,
      billing_month: billingMonth,
      deleted_at: null,
    },
    select: {
      id: true,
      item_name: true,
      status: true,
      amount: true,
      commission_type: true,
      commission_amount: true,
    },
    take: 5,
  })

  console.log('\n📄 サンプルデータ（最初の5件）:')
  samples.forEach((item, idx) => {
    console.log(`\n  ${idx + 1}. ${item.item_name}`)
    console.log(`     ID: ${item.id}`)
    console.log(`     ステータス: ${item.status}`)
    console.log(`     金額: ¥${item.amount.toLocaleString()}`)
    console.log(`     手数料タイプ: ${item.commission_type || '未設定'}`)
    console.log(`     手数料額: ${item.commission_amount !== null ? `¥${item.commission_amount.toLocaleString()}` : '未設定'}`)
  })

  console.log('\n✅ 確認完了')
  console.log('\n💡 ヒント:')
  console.log('  - APPROVED または PAID ステータスの明細は編集できません')
  console.log('  - 編集可能にするには、ステータスを DRAFT に変更してください')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



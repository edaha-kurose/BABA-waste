/**
 * PAID → FINALIZED ステータス移行スクリプト
 * グローバルルール準拠
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 PAID → FINALIZED ステータス移行開始...\n')

  // 1. app_billing_items の PAID → FINALIZED
  console.log('📝 app_billing_items を更新中...')
  const itemsResult = await prisma.app_billing_items.updateMany({
    where: {
      status: 'PAID' as any, // 現在のステータス
    },
    data: {
      status: 'FINALIZED' as any, // 新しいステータス
      updated_at: new Date(),
    },
  })
  console.log(`  ✅ ${itemsResult.count}件を更新しました`)

  // 2. billing_summaries の PAID → FINALIZED
  console.log('\n📝 billing_summaries を更新中...')
  const summariesResult = await prisma.billing_summaries.updateMany({
    where: {
      status: 'PAID' as any,
    },
    data: {
      status: 'FINALIZED' as any,
      updated_at: new Date(),
    },
  })
  console.log(`  ✅ ${summariesResult.count}件を更新しました`)

  console.log('\n' + '='.repeat(60))
  console.log('✅ 移行完了')
  console.log(`   - app_billing_items: ${itemsResult.count}件`)
  console.log(`   - billing_summaries: ${summariesResult.count}件`)
  console.log('='.repeat(60))
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



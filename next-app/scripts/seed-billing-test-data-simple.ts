/**
 * 請求管理のテストデータ作成スクリプト（簡易版）
 * 
 * 実行方法:
 * pnpm tsx scripts/seed-billing-test-data-simple.ts
 * 
 * 作成するデータ:
 * 1. 手数料ルール (commission_rules) - 手数料設定
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('========== 請求管理テストデータ作成開始（簡易版） ==========\n')

  // 1. 組織を取得
  const org = await prisma.organizations.findFirst({
    where: { deleted_at: null },
  })

  if (!org) {
    throw new Error('組織が見つかりません')
  }

  console.log(`✅ 組織: ${org.name} (${org.id})\n`)

  // 2. 収集業者を取得
  const collectors = await prisma.collectors.findMany({
    where: {
      org_id: org.id,
      deleted_at: null,
      is_active: true,
    },
  })

  if (collectors.length === 0) {
    console.log('⚠️ 収集業者が見つかりません。先に収集業者を登録してください。')
    return
  }

  console.log(`✅ 収集業者: ${collectors.length}社\n`)

  // 3. 対象月を設定（今月と先月）
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)

  const lastMonth = new Date(thisMonth)
  lastMonth.setMonth(lastMonth.getMonth() - 1)

  console.log(`📅 対象月: ${lastMonth.toISOString().split('T')[0]} と ${thisMonth.toISOString().split('T')[0]}\n`)

  let commissionRulesCreated = 0

  // 4. トランザクション内でデータ作成
  await prisma.$transaction(async (tx) => {
    // 4-1. 手数料ルールを作成
    console.log('📊 手数料ルールを作成中...')

    for (const collector of collectors) {
      // 既存のルールをチェック
      const existing = await tx.commission_rules.findFirst({
        where: {
          org_id: org.id,
          collector_id: collector.id,
          deleted_at: null,
        },
      })

      if (!existing) {
        // 50%の確率でパーセンテージ型、50%で固定額型
        const isPercentage = Math.random() > 0.5

        await tx.commission_rules.create({
          data: {
            org_id: org.id,
            collector_id: collector.id,
            billing_type: 'ALL', // 全ての請求種別に適用
            commission_type: isPercentage ? 'PERCENTAGE' : 'FIXED_AMOUNT',
            commission_value: isPercentage 
              ? 5 + Math.floor(Math.random() * 10) // 5〜15%
              : 10000 + Math.floor(Math.random() * 20000), // 10,000〜30,000円
            effective_from: lastMonth,
            effective_to: null,
            is_active: true,
            created_by: org.created_by,
            updated_by: org.created_by,
          },
        })

        commissionRulesCreated++
      }
    }

    console.log(`  ✅ 手数料ルール: ${commissionRulesCreated}件作成\n`)
  })

  console.log('========== 完了 ==========')
  console.log(`📊 手数料ルール: ${commissionRulesCreated}件`)
  console.log('\n次のステップ:')
  console.log('1. ブラウザで http://localhost:3001/dashboard/billing にアクセス')
  console.log('2. 収集業者を選択')
  console.log('3. 「全収集業者の請求サマリーを一括生成」ボタンをクリック')
  console.log('\n注意: 回収実績データがない場合は「対象となる回収実績がありませんでした」と表示されます。')
  console.log('回収実績データは、回収依頼（collection_requests）から作成してください。')
}

main()
  .catch((error) => {
    console.error('❌ エラー:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


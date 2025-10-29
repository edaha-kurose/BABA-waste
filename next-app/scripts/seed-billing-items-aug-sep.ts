/**
 * 2025年8月・9月のDRAFT請求明細テストデータを作成するスクリプト
 * グローバルルール準拠
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📝 2025年8月・9月のDRAFT請求明細テストデータ作成開始...\n')

  // コスモス薬品のorg_id
  const orgId = '00000000-0000-0000-0000-000000000001'

  // アクティブな収集業者を取得
  const collectors = await prisma.collectors.findMany({
    where: {
      org_id: orgId,
      deleted_at: null,
    },
    select: {
      id: true,
      company_name: true,
    },
  })

  if (collectors.length === 0) {
    console.log('❌ 収集業者が見つかりません')
    return
  }

  console.log(`✅ 収集業者: ${collectors.length}社`)

  // 店舗を取得
  const stores = await prisma.stores.findMany({
    where: {
      org_id: orgId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
    },
    take: 1,
  })

  const storeId = stores.length > 0 ? stores[0].id : null
  console.log(`✅ 店舗: ${stores.length > 0 ? stores[0].name : 'なし（店舗IDなしで作成）'}`)

  // 品目を取得
  const itemMaps = await prisma.item_maps.findMany({
    where: {
      org_id: orgId,
      deleted_at: null,
    },
    select: {
      item_label: true,
      jwnet_code: true,
    },
    take: 5,
  })

  console.log(`✅ 品目: ${itemMaps.length}種類\n`)

  const billingTypes = ['FIXED', 'METERED', 'OTHER'] as const
  const months = [
    { date: new Date('2025-08-01'), label: '2025年8月' },
    { date: new Date('2025-09-01'), label: '2025年9月' },
  ]

  let totalCreated = 0
  let totalSkipped = 0

  for (const month of months) {
    console.log(`\n📅 ${month.label} のデータ作成中...`)

    for (const collector of collectors) {
      // 既存データをチェック（冪等性）
      const existingCount = await prisma.app_billing_items.count({
        where: {
          org_id: orgId,
          collector_id: collector.id,
          billing_month: month.date,
          deleted_at: null,
        },
      })

      if (existingCount > 0) {
        console.log(`  ⏭️  ${collector.company_name}: 既存データあり (${existingCount}件) - スキップ`)
        totalSkipped += existingCount
        continue
      }

      // 各収集業者に対して5〜10件の明細を作成
      const itemCount = Math.floor(Math.random() * 6) + 5 // 5〜10件

      const items = []
      for (let i = 0; i < itemCount; i++) {
        const itemMap = itemMaps[i % itemMaps.length]
        const billingType = billingTypes[i % billingTypes.length]

        let unitPrice: number | null = null
        let quantity: number | null = null
        let unit: string | null = null
        let amount: number

        if (billingType === 'FIXED') {
          // 固定費: 単価・数量なし、金額のみ
          amount = Math.floor(Math.random() * 50000) + 10000 // 10,000〜60,000円
        } else if (billingType === 'METERED') {
          // 従量費: 単価×数量
          unitPrice = Math.floor(Math.random() * 500) + 100 // 100〜600円/kg
          quantity = Math.floor(Math.random() * 500) + 50 // 50〜550kg
          unit = 'kg'
          amount = unitPrice * quantity
        } else {
          // その他: ランダム
          amount = Math.floor(Math.random() * 30000) + 5000 // 5,000〜35,000円
        }

        const taxRate = 0.1
        const taxAmount = Math.floor(amount * taxRate)
        const totalAmount = amount + taxAmount

        items.push({
          org_id: orgId,
          collector_id: collector.id,
          store_id: storeId,
          billing_month: month.date,
          billing_period_from: month.date,
          billing_period_to: new Date(month.date.getFullYear(), month.date.getMonth() + 1, 0), // 月末
          billing_type: billingType,
          item_name: itemMap.item_label,
          item_code: itemMap.jwnet_code,
          unit_price: unitPrice,
          quantity: quantity,
          unit: unit,
          amount: amount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'DRAFT', // ★ DRAFTステータス
          notes: 'テストデータ（手数料設定テスト用）',
          created_at: new Date(),
          updated_at: new Date(),
        })
      }

      // 一括作成
      await prisma.app_billing_items.createMany({
        data: items,
      })

      console.log(`  ✅ ${collector.company_name}: ${items.length}件作成`)
      totalCreated += items.length
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ 作成完了`)
  console.log(`   - 新規作成: ${totalCreated}件`)
  console.log(`   - スキップ: ${totalSkipped}件`)
  console.log('='.repeat(60))
  console.log('\n💡 次のステップ:')
  console.log('   1. ブラウザで http://localhost:3001/dashboard/billing をリロード')
  console.log('   2. 2025年8月または9月の請求月を選択')
  console.log('   3. 収集業者を選択して明細画面へ')
  console.log('   4. 「編集」ボタンで手数料設定をテスト！')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



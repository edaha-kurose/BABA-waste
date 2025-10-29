/**
 * 請求サマリー生成用の最小実績データ投入スクリプト
 * - collections/request の複雑な依存を避け、app_billing_items を直接作成
 * - 現在月と先月に対して、各収集業者で METERED/FIXED/OTHER を少量投入
 *
 * 実行: pnpm tsx scripts/seed-billing-items.ts
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n========== app_billing_items シード開始 ==========' )

  // 組織
  const org = await prisma.organizations.findFirst({ where: { deleted_at: null } })
  if (!org) throw new Error('organizations が見つかりません')
  console.log(`✅ org: ${org.name} (${org.id})`)

  // 収集業者（全社対象）
  const collectors = await prisma.collectors.findMany({
    where: { org_id: org.id, deleted_at: null, is_active: true },
  })
  if (collectors.length === 0) throw new Error('collectors が見つかりません（最低1社必要）')
  console.log(`✅ collectors: ${collectors.length}社`)

  // 店舗（任意; store_id は NULL 可）
  const stores = await prisma.stores.findMany({ where: { org_id: org.id, deleted_at: null }, take: 5 })

  // 対象月: 今月・先月
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0)
  const lastMonth = new Date(thisMonth); lastMonth.setMonth(lastMonth.getMonth() - 1)

  const months = [lastMonth, thisMonth]

  let createdCount = 0

  for (const m of months) {
    const from = new Date(m)
    const to = new Date(m); to.setMonth(to.getMonth() + 1); to.setDate(0) // 月末

    for (const col of collectors) {
      // 既存明細がある場合はスキップ（冪等化）
      const existingCount = await prisma.app_billing_items.count({
        where: {
          org_id: org.id,
          collector_id: col.id,
          billing_month: m,
          deleted_at: null,
        },
      })
      if (existingCount > 0) {
        console.log(`- skip seed (exists): ${col.company_name}`)
        continue
      }
      // 3種類 x 2件/タイプ = 6件/業者/月 程度
      const rows = [
        {
          billing_type: 'METERED', item_name: '可燃ごみ', item_code: '01010',
          unit_price: 200, quantity: 30, unit: 'kg',
        },
        {
          billing_type: 'METERED', item_name: '廃プラ', item_code: '01070',
          unit_price: 240, quantity: 12.5, unit: 'kg',
        },
        {
          billing_type: 'FIXED', item_name: '月額基本料金', item_code: null,
          unit_price: null, quantity: null, unit: null,
          amount: 45000,
        },
        {
          billing_type: 'FIXED', item_name: '定期回収費', item_code: null,
          unit_price: null, quantity: null, unit: null,
          amount: 20000,
        },
        {
          billing_type: 'OTHER', item_name: '臨時対応費', item_code: null,
          unit_price: null, quantity: null, unit: null,
          amount: 8000,
        },
        {
          billing_type: 'OTHER', item_name: '交通費', item_code: null,
          unit_price: null, quantity: null, unit: null,
          amount: 2200,
        },
      ]

      for (const r of rows) {
        const amount = typeof r.amount === 'number'
          ? r.amount
          : ((r.unit_price ?? 0) * (r.quantity ?? 0))
        const taxRate = 0.10
        const taxAmount = Math.round(amount * taxRate)
        const totalAmount = amount + taxAmount

        const storeId = stores.length > 0 ? stores[Math.floor(Math.random()*stores.length)].id : null

        await prisma.app_billing_items.create({
          data: {
            org_id: org.id,
            collector_id: col.id,
            store_id: storeId,
            collection_id: null,
            billing_month: m,
            billing_period_from: from,
            billing_period_to: to,
            billing_type: r.billing_type,
            item_name: r.item_name,
            item_code: r.item_code,
            unit_price: r.unit_price ?? null,
            quantity: r.quantity ?? null,
            unit: r.unit ?? null,
            amount,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: 'APPROVED',
            notes: 'seeded (auto-approved for testing)',
            created_by: null,
            updated_by: null,
          }
        })
        createdCount++
      }
    }
  }

  console.log(`✅ app_billing_items 作成: ${createdCount} 件 (status: APPROVED)`)
  console.log('========== 完了 ==========' )
  console.log('次のステップ: pnpm gen:billing-summaries-range で請求サマリーを生成してください。')
}

main().catch((e) => { console.error('❌ エラー:', e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })

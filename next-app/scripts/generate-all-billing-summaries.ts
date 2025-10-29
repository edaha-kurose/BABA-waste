/**
 * 全収集業者の請求サマリー一括生成（スクリプト版）
 * - 認証不要でローカル実行用（APIと同等の集計ロジック）
 * - 今月の1日を billing_month として集計
 *
 * 実行: pnpm tsx scripts/generate-all-billing-summaries.ts
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n[Script] Generate All Billing Summaries - start')

  const org = await prisma.organizations.findFirst({ where: { deleted_at: null } })
  if (!org) throw new Error('organizations not found')
  console.log(`[Script] org: ${org.name} (${org.id})`)

  const collectors = await prisma.collectors.findMany({
    where: { org_id: org.id, deleted_at: null, is_active: true },
    select: { id: true, company_name: true },
  })
  console.log(`[Script] collectors: ${collectors.length}`)
  if (collectors.length === 0) {
    console.log('[Script] no collectors, exit')
    return
  }

  const billingMonth = new Date()
  billingMonth.setDate(1); billingMonth.setHours(0,0,0,0)
  const from = new Date(billingMonth)
  const to = new Date(billingMonth); to.setMonth(to.getMonth()+1); to.setDate(0)

  const taxRate = 0.10
  let generated = 0
  let skipped = 0

  await prisma.$transaction(async (tx) => {
    for (const c of collectors) {
      const existing = await tx.billing_summaries.findFirst({
        where: { org_id: org.id, collector_id: c.id, billing_month: billingMonth },
      })
      if (existing) {
        console.log(`[Script] skip existing: ${c.company_name}`)
        skipped++
        continue
      }

      const items = await tx.app_billing_items.findMany({
        where: {
          org_id: org.id,
          collector_id: c.id,
          billing_month: billingMonth,
          deleted_at: null,
        },
      })

      if (items.length === 0) {
        console.log(`[Script] skip no items: ${c.company_name}`)
        skipped++
        continue
      }

      let total_fixed_amount = 0
      let total_metered_amount = 0
      let total_other_amount = 0
      let fixed_items_count = 0
      let metered_items_count = 0
      let other_items_count = 0

      for (const it of items) {
        const amt = it.amount ?? 0
        switch (it.billing_type) {
          case 'FIXED':
            total_fixed_amount += amt; fixed_items_count++; break
          case 'METERED':
            total_metered_amount += amt; metered_items_count++; break
          case 'OTHER':
            total_other_amount += amt; other_items_count++; break
          default:
            total_other_amount += amt; other_items_count++; break
        }
      }

      const subtotal_amount = total_fixed_amount + total_metered_amount + total_other_amount
      const tax_amount = subtotal_amount * taxRate
      const total_amount = subtotal_amount + tax_amount

      await tx.billing_summaries.create({
        data: {
          org_id: org.id,
          collector_id: c.id,
          billing_month: billingMonth,
          total_fixed_amount,
          total_metered_amount,
          total_other_amount,
          subtotal_amount,
          tax_amount,
          total_amount,
          total_items_count: items.length,
          fixed_items_count,
          metered_items_count,
          other_items_count,
          status: 'DRAFT',
          notes: null,
          created_by: null,
          updated_by: null,
        },
      })

      console.log(`[Script] created: ${c.company_name} (¥${Math.round(total_amount).toLocaleString()})`)
      generated++
    }
  })

  console.log('[Script] done', { generated, skipped, month: billingMonth.toISOString().slice(0,10) })
}

main().catch((e) => { console.error('❌ Error:', e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })


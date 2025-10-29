/**
 * 12ヶ月分の請求明細(app_billing_items)を投入（冪等）
 * - 全アクティブ収集業者対象
 * - 各月: METERED/FIXED/OTHER を混在で作成
 * - 既に対象月の明細が存在する場合はスキップ
 *
 * 使い方:
 *   pnpm tsx scripts/seed-billing-items-year.ts --months 12 [--org <ORG_ID>]
 */

import { prisma } from '../src/lib/prisma'

function getArg(name: string, fallback?: string) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]
  return fallback
}

function startOfMonth(d: Date) {
  const x = new Date(d)
  x.setDate(1); x.setHours(0,0,0,0); return x
}

function endOfMonth(d: Date) {
  const x = new Date(d)
  x.setMonth(x.getMonth()+1); x.setDate(0); x.setHours(23,59,59,999); return x
}

async function main() {
  const monthsArg = Number(getArg('months', '12'))
  const orgArg = getArg('org')

  console.log(`\n========== Seed app_billing_items for ${monthsArg} months ==========`)

  let org = null as Awaited<ReturnType<typeof prisma.organizations.findFirst>> | null
  if (orgArg) {
    org = await prisma.organizations.findUnique({ where: { id: orgArg } })
  } else {
    org = await prisma.organizations.findFirst({ where: { deleted_at: null } })
  }
  if (!org) throw new Error('organizations not found')
  console.log(`✅ org: ${org.name} (${org.id})`)

  const collectors = await prisma.collectors.findMany({
    where: { org_id: org.id, is_active: true, deleted_at: null },
    select: { id: true, company_name: true },
  })
  if (collectors.length === 0) throw new Error('collectors not found for org')
  console.log(`✅ collectors: ${collectors.length}`)

  const stores = await prisma.stores.findMany({ where: { org_id: org.id, deleted_at: null }, select: { id: true } })

  // 月範囲: 現在月から遡って monthsArg-1 ヶ月
  const months: Date[] = []
  const current = startOfMonth(new Date())
  for (let i = 0; i < monthsArg; i++) {
    const m = new Date(current); m.setMonth(current.getMonth() - i)
    months.push(startOfMonth(m))
  }

  let created = 0

  for (const m of months) {
    const from = startOfMonth(m)
    const to = endOfMonth(m)
    console.log(`\n📅 Seeding: ${from.toISOString().slice(0,10)} ~ ${to.toISOString().slice(0,10)}`)

    for (const c of collectors) {
      const exists = await prisma.app_billing_items.count({
        where: { org_id: org.id, collector_id: c.id, billing_month: from, deleted_at: null },
      })
      if (exists > 0) {
        console.log(`- skip (exists): ${c.company_name}`)
        continue
      }

      const rows = [
        { billing_type: 'METERED', item_name: '可燃ごみ', item_code: '01010', unit_price: 200, quantity: 40, unit: 'kg' },
        { billing_type: 'METERED', item_name: '廃プラ', item_code: '01070', unit_price: 240, quantity: 15, unit: 'kg' },
        { billing_type: 'FIXED',   item_name: '月額基本料金', item_code: null as string | null, unit_price: null, quantity: null, unit: null, amount: 30000 },
        { billing_type: 'OTHER',   item_name: '臨時対応費', item_code: null as string | null, unit_price: null, quantity: null, unit: null, amount: 5000 },
      ]

      const storeId = stores.length > 0 ? stores[Math.floor(Math.random()*stores.length)].id : null

      for (const r of rows) {
        const amount = typeof r.amount === 'number' ? r.amount : ((r.unit_price ?? 0) * (r.quantity ?? 0))
        const taxRate = 0.10
        const taxAmount = Math.round(amount * taxRate)
        const totalAmount = amount + taxAmount

        await prisma.app_billing_items.create({
          data: {
            org_id: org.id,
            collector_id: c.id,
            store_id: storeId,
            collection_id: null,
            billing_month: from,
            billing_period_from: from,
            billing_period_to: to,
            billing_type: r.billing_type,
            item_name: r.item_name,
            item_code: r.item_code,
            unit_price: r.unit_price as number | null,
            quantity: r.quantity as number | null,
            unit: r.unit as string | null,
            amount,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: 'DRAFT',
            notes: 'seed-year',
            created_by: null,
            updated_by: null,
          },
        })
        created++
      }
    }
  }

  console.log(`\n✅ created app_billing_items: ${created}`)
  console.log('========== done ==========' )
}

main().catch((e) => { console.error('❌ Error:', e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })


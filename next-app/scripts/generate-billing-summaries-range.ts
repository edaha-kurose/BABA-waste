/**
 * 指定月範囲の請求サマリーを一括生成（冪等）
 * 使い方:
 *   pnpm tsx scripts/generate-billing-summaries-range.ts --months 12 [--org <ORG_ID>]
 */

import { prisma } from '../src/lib/prisma'

function getArg(name: string, fallback?: string) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]
  return fallback
}

function startOfMonth(d: Date) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x }

async function main() {
  const monthsArg = Number(getArg('months', '12'))
  const orgArg = getArg('org')

  console.log(`\n========== Generate billing summaries for ${monthsArg} months ==========`)

  let org = null as Awaited<ReturnType<typeof prisma.organizations.findFirst>> | null
  if (orgArg) org = await prisma.organizations.findUnique({ where: { id: orgArg } })
  else org = await prisma.organizations.findFirst({ where: { deleted_at: null } })
  if (!org) throw new Error('organizations not found')
  console.log(`✅ org: ${org.name} (${org.id})`)

  const collectors = await prisma.collectors.findMany({ where: { org_id: org.id, deleted_at: null, is_active: true }, select: { id: true, company_name: true } })
  console.log(`✅ collectors: ${collectors.length}`)
  if (collectors.length === 0) return

  const current = startOfMonth(new Date())
  const months: Date[] = []
  for (let i = 0; i < monthsArg; i++) { const m = new Date(current); m.setMonth(current.getMonth() - i); months.push(startOfMonth(m)) }

  let generated = 0, skipped = 0

  for (const m of months) {
    for (const c of collectors) {
      const existing = await prisma.billing_summaries.findFirst({ where: { org_id: org.id, collector_id: c.id, billing_month: m } })
      if (existing) { skipped++; continue }

      const items = await prisma.app_billing_items.findMany({ where: { org_id: org.id, collector_id: c.id, billing_month: m, deleted_at: null } })
      if (items.length === 0) { skipped++; continue }

      let total_fixed_amount = 0, total_metered_amount = 0, total_other_amount = 0
      let fixed_items_count = 0, metered_items_count = 0, other_items_count = 0
      for (const it of items) {
        const amt = it.amount ?? 0
        switch (it.billing_type) {
          case 'FIXED': total_fixed_amount += amt; fixed_items_count++; break
          case 'METERED': total_metered_amount += amt; metered_items_count++; break
          default: total_other_amount += amt; other_items_count++; break
        }
      }
      const subtotal_amount = total_fixed_amount + total_metered_amount + total_other_amount
      const taxRate = 0.10
      const tax_amount = subtotal_amount * taxRate
      const total_amount = subtotal_amount + tax_amount

      await prisma.billing_summaries.create({ data: {
        org_id: org.id,
        collector_id: c.id,
        billing_month: m,
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
        notes: 'gen-range',
        created_by: null,
        updated_by: null,
      } })
      generated++
    }
  }

  console.log(`[Range] done: generated=${generated}, skipped=${skipped}`)
}

main().catch((e) => { console.error('❌ Error:', e); process.exit(1) }).finally(async () => { await prisma.$disconnect() })



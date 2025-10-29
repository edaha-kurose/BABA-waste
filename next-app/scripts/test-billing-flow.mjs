import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import dayjs from 'dayjs'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 新請求システム テスト稼働開始\n')

  try {
    // テナント取得
    const tenants = await prisma.organizations.findMany({
      where: { org_type: 'EMITTER', deleted_at: null },
      select: { id: true, name: true },
    })

    console.log('📊 テナント一覧:')
    tenants.forEach((t, i) => console.log(`   ${i + 1}. ${t.name} (${t.id})`))
    console.log('')

    for (const tenant of tenants) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📋 テナント: ${tenant.name}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

      // 収集業者一覧
      const collectors = await prisma.collectors.findMany({
        where: { org_id: tenant.id, deleted_at: null },
        select: { id: true, company_name: true },
      })

      console.log(`📦 収集業者: ${collectors.length}社`)
      collectors.forEach((c, i) => console.log(`   ${i + 1}. ${c.company_name}`))
      console.log('')

      // 請求明細（過去3ヶ月分）
      const billingMonth = dayjs().startOf('month').toDate()
      const billingItems = await prisma.app_billing_items.findMany({
        where: {
          org_id: tenant.id,
          billing_month: billingMonth,
          deleted_at: null,
        },
        select: {
          id: true,
          collector_id: true,
          billing_type: true,
          amount: true,
          status: true,
        },
      })

      console.log(`📝 請求明細 (${dayjs(billingMonth).format('YYYY-MM')}):`)
      console.log(`   件数: ${billingItems.length}件`)

      const groupedByCollector = billingItems.reduce((acc, item) => {
        if (!acc[item.collector_id]) {
          acc[item.collector_id] = { count: 0, total: 0 }
        }
        acc[item.collector_id].count++
        acc[item.collector_id].total += Number(item.amount)
        return acc
      }, {})

      for (const collectorId in groupedByCollector) {
        const collector = collectors.find((c) => c.id === collectorId)
        const stats = groupedByCollector[collectorId]
        console.log(`   - ${collector?.company_name || '不明'}: ${stats.count}件, 合計¥${stats.total.toLocaleString()}`)
      }
      console.log('')

      // 請求サマリー
      const billingSummaries = await prisma.billing_summaries.findMany({
        where: {
          org_id: tenant.id,
          billing_month: billingMonth,
        },
        select: {
          id: true,
          collector_id: true,
          status: true,
          total_amount: true,
          collectors: { select: { company_name: true } },
        },
      })

      console.log(`📊 請求サマリー:`)
      if (billingSummaries.length === 0) {
        console.log(`   ⚠️  未作成`)
      } else {
        billingSummaries.forEach((s) => {
          console.log(`   - ${s.collectors.company_name}: ${s.status}, ¥${s.total_amount.toLocaleString()}`)
        })
      }
      console.log('')

      // 手数料ルール
      const commissionRules = await prisma.commission_rules.findMany({
        where: {
          org_id: tenant.id,
          is_active: true,
          deleted_at: null,
        },
        select: {
          billing_type: true,
          commission_type: true,
          commission_value: true,
          collectors: { select: { company_name: true } },
        },
      })

      console.log(`💰 手数料ルール: ${commissionRules.length}件`)
      commissionRules.forEach((r) => {
        const collectorName = r.collectors?.company_name || '全収集業者共通'
        const value =
          r.commission_type === 'PERCENTAGE'
            ? `${r.commission_value}%`
            : `¥${Number(r.commission_value).toLocaleString()}`
        console.log(`   - ${collectorName} / ${r.billing_type}: ${value}`)
      })
      console.log('')

      // テナント請求書
      const tenantInvoices = await prisma.tenant_invoices.findMany({
        where: {
          org_id: tenant.id,
          billing_month: billingMonth,
          deleted_at: null,
        },
        select: {
          id: true,
          invoice_number: true,
          status: true,
          grand_total: true,
          tenant_invoice_items: {
            select: {
              item_type: true,
              item_name: true,
              subtotal: true,
            },
          },
        },
      })

      console.log(`📄 テナント請求書:`)
      if (tenantInvoices.length === 0) {
        console.log(`   ⚠️  未作成`)
      } else {
        tenantInvoices.forEach((inv) => {
          console.log(`   請求書番号: ${inv.invoice_number}`)
          console.log(`   ステータス: ${inv.status}`)
          console.log(`   合計請求額: ¥${Number(inv.grand_total).toLocaleString()}`)
          console.log(`   明細: ${inv.tenant_invoice_items.length}件`)
          inv.tenant_invoice_items.forEach((item, idx) => {
            console.log(`     ${idx + 1}. ${item.item_name} (${item.item_type}): ¥${Number(item.subtotal).toLocaleString()}`)
          })
        })
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ データ確認完了\n')
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()


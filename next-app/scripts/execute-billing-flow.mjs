import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import dayjs from 'dayjs'

dotenv.config({ path: '.env.local' })

/**
 * 消費税計算（切り捨て）
 */
function calculateTax(amount, taxRate = 0.1) {
  return Math.floor(amount * taxRate)
}

const prisma = new PrismaClient()

// システム管理会社ユーザーID (BABA株式会社のadmin@test.com)
const SYSTEM_ADMIN_USER_ID = '579c9ffd-c3c0-4b1a-8e7e-8c6845c3165d'

async function main() {
  console.log('🚀 請求フロー実行開始\n')

  try {
    const billingMonth = dayjs().startOf('month').toDate()
    const tenants = await prisma.organizations.findMany({
      where: { 
        org_type: 'EMITTER', 
        deleted_at: null,
        name: { in: ['楽市楽座株式会社', 'コスモス薬品株式会社'] }
      },
    })

    for (const tenant of tenants) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📋 ${tenant.name}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

      // 収集業者取得
      const collectors = await prisma.collectors.findMany({
        where: { org_id: tenant.id, deleted_at: null },
      })

      console.log(`📊 Step 1: 請求サマリー生成 (${collectors.length}社分)`)

      for (const collector of collectors) {
        // 承認済みの請求明細を取得
        const approvedItems = await prisma.app_billing_items.findMany({
          where: {
            org_id: tenant.id,
            collector_id: collector.id,
            billing_month: billingMonth,
            status: 'APPROVED',
            deleted_at: null,
          },
        })

        if (approvedItems.length === 0) {
          console.log(`   ⚠️  ${collector.company_name}: 承認済み明細なし (スキップ)`)
          continue
        }

        // 集計
        let totalFixedAmount = 0
        let totalMeteredAmount = 0
        let totalOtherAmount = 0
        let totalTaxAmount = 0
        let fixedItemsCount = 0
        let meteredItemsCount = 0
        let otherItemsCount = 0

        for (const item of approvedItems) {
          if (item.billing_type === 'FIXED') {
            totalFixedAmount += item.amount
            fixedItemsCount++
          } else if (item.billing_type === 'METERED') {
            totalMeteredAmount += item.amount
            meteredItemsCount++
          } else {
            totalOtherAmount += item.amount
            otherItemsCount++
          }
          totalTaxAmount += item.tax_amount
        }

        const subtotalAmount = totalFixedAmount + totalMeteredAmount + totalOtherAmount
        const totalAmount = subtotalAmount + totalTaxAmount

        // 既存チェック
        const existingSummary = await prisma.billing_summaries.findUnique({
          where: {
            org_id_collector_id_billing_month: {
              org_id: tenant.id,
              collector_id: collector.id,
              billing_month: billingMonth,
            },
          },
        })

        if (existingSummary) {
          console.log(`   ✅ ${collector.company_name}: 既存 (¥${totalAmount.toLocaleString()})`)
        } else {
          await prisma.billing_summaries.create({
            data: {
              org_id: tenant.id,
              collector_id: collector.id,
              billing_month: billingMonth,
              total_fixed_amount: totalFixedAmount,
              total_metered_amount: totalMeteredAmount,
              total_other_amount: totalOtherAmount,
              subtotal_amount: subtotalAmount,
              tax_amount: totalTaxAmount,
              total_amount: totalAmount,
              total_items_count: approvedItems.length,
              fixed_items_count: fixedItemsCount,
              metered_items_count: meteredItemsCount,
              other_items_count: otherItemsCount,
              status: 'APPROVED', // テスト用に直接APPROVED
              created_by: SYSTEM_ADMIN_USER_ID,
              updated_by: SYSTEM_ADMIN_USER_ID,
            },
          })
          console.log(`   ✅ ${collector.company_name}: 生成完了 (¥${totalAmount.toLocaleString()})`)
        }
      }

      console.log(`\n📄 Step 2: テナント請求書生成`)

      // 既存のテナント請求書チェック
      const existingInvoice = await prisma.tenant_invoices.findFirst({
        where: {
          org_id: tenant.id,
          billing_month: billingMonth,
          deleted_at: null,
        },
      })

      if (existingInvoice) {
        console.log(`   ⚠️  既存の請求書あり: ${existingInvoice.invoice_number} (スキップ)`)
        continue
      }

      // 承認済み収集業者請求サマリーを取得
      const approvedSummaries = await prisma.billing_summaries.findMany({
        where: {
          org_id: tenant.id,
          billing_month: billingMonth,
          status: 'APPROVED',
        },
        include: { collectors: true },
      })

      if (approvedSummaries.length === 0) {
        console.log(`   ⚠️  承認済み請求サマリーなし (スキップ)`)
        continue
      }

      // 手数料ルールを取得
      const commissionRules = await prisma.commission_rules.findMany({
        where: { org_id: tenant.id, is_active: true, deleted_at: null },
      })

      // トランザクションで請求書作成
      await prisma.$transaction(async (tx) => {
        const year = billingMonth.getFullYear()
        const month = String(billingMonth.getMonth() + 1).padStart(2, '0')
        const tenantCode = tenant.id.substring(tenant.id.length - 8)
        const invoiceNumber = `TI-${year}${month}-${tenantCode}`

        const invoice = await tx.tenant_invoices.create({
          data: {
            org_id: tenant.id,
            billing_month: billingMonth,
            invoice_number: invoiceNumber,
            status: 'DRAFT',
            created_by: SYSTEM_ADMIN_USER_ID,
            updated_by: SYSTEM_ADMIN_USER_ID,
          },
        })

        let collectorsSubtotal = 0
        let collectorsTax = 0
        let collectorsTotal = 0
        let commissionSubtotal = 0
        let commissionTax = 0
        let commissionTotal = 0
        let displayOrder = 1

        // 収集業者ごとの明細と手数料
        for (const summary of approvedSummaries) {
          const baseAmount = summary.subtotal_amount
          const taxAmount = summary.tax_amount
          const totalAmount = summary.total_amount

          collectorsSubtotal += baseAmount
          collectorsTax += taxAmount
          collectorsTotal += totalAmount

          // 収集業者請求分
          await tx.tenant_invoice_items.create({
            data: {
              tenant_invoice_id: invoice.id,
              item_type: 'COLLECTOR_BILLING',
              billing_summary_id: summary.id,
              collector_id: summary.collector_id,
              item_name: `${summary.collectors.company_name} 請求分`,
              base_amount: baseAmount,
              commission_amount: 0,
              subtotal: baseAmount,
              tax_rate: 10.00,
              tax_amount: taxAmount,
              total_amount: totalAmount,
              is_auto_calculated: true,
              display_order: displayOrder++,
            },
          })

          // 手数料計算
          let calculatedCommission = 0
          for (const rule of commissionRules) {
            if (rule.collector_id && rule.collector_id !== summary.collector_id) continue

            if (rule.billing_type === 'METERED' && rule.commission_type === 'PERCENTAGE') {
              calculatedCommission += (summary.total_metered_amount * Number(rule.commission_value)) / 100
            } else if (rule.billing_type === 'FIXED' && rule.commission_type === 'FIXED_AMOUNT') {
              calculatedCommission += Number(rule.commission_value)
            }
          }

          if (calculatedCommission > 0) {
            const commissionTaxAmt = calculateTax(calculatedCommission, 0.1)
            const commissionTotalAmt = calculatedCommission + commissionTaxAmt

            commissionSubtotal += calculatedCommission
            commissionTax += commissionTaxAmt
            commissionTotal += commissionTotalAmt

            await tx.tenant_invoice_items.create({
              data: {
                tenant_invoice_id: invoice.id,
                item_type: 'COMMISSION',
                collector_id: summary.collector_id,
                item_name: `${summary.collectors.company_name} 手数料`,
                base_amount: 0,
                commission_amount: calculatedCommission,
                subtotal: calculatedCommission,
                tax_rate: 10.00,
                tax_amount: commissionTaxAmt,
                total_amount: commissionTotalAmt,
                is_auto_calculated: true,
                display_order: displayOrder++,
              },
            })
          }
        }

        // 共通管理費
        const commonRule = commissionRules.find((r) => r.collector_id === null && r.billing_type === 'OTHER')
        if (commonRule) {
          const managementFee = Number(commonRule.commission_value)
          const managementTax = calculateTax(managementFee, 0.1)
          const managementTotal = managementFee + managementTax

          commissionSubtotal += managementFee
          commissionTax += managementTax
          commissionTotal += managementTotal

          await tx.tenant_invoice_items.create({
            data: {
              tenant_invoice_id: invoice.id,
              item_type: 'MANAGEMENT_FEE',
              item_name: 'システム管理費',
              base_amount: 0,
              commission_amount: managementFee,
              subtotal: managementFee,
              tax_rate: 10.00,
              tax_amount: managementTax,
              total_amount: managementTotal,
              is_auto_calculated: true,
              display_order: displayOrder++,
            },
          })
        }

        // 請求書の合計金額を更新
        await tx.tenant_invoices.update({
          where: { id: invoice.id },
          data: {
            collectors_subtotal: collectorsSubtotal,
            collectors_tax: collectorsTax,
            collectors_total: collectorsTotal,
            commission_subtotal: commissionSubtotal,
            commission_tax: commissionTax,
            commission_total: commissionTotal,
            grand_subtotal: collectorsSubtotal + commissionSubtotal,
            grand_tax: collectorsTax + commissionTax,
            grand_total: collectorsTotal + commissionTotal,
          },
        })

        console.log(`   ✅ 請求書番号: ${invoiceNumber}`)
        console.log(`   📊 収集業者請求: ¥${collectorsTotal.toLocaleString()}`)
        console.log(`   💰 手数料・管理費: ¥${commissionTotal.toLocaleString()}`)
        console.log(`   💵 テナント請求額: ¥${(collectorsTotal + commissionTotal).toLocaleString()}`)
      })
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ 請求フロー実行完了\n')
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()


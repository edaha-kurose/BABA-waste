import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// リクエストスキーマ
const GenerateTenantInvoiceSchema = z.object({
  org_id: z.string().uuid(),
  billing_month: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for billing_month (YYYY-MM-DD)',
  }),
})

/**
 * テナント請求書を自動生成
 * - 承認済み収集業者請求を集計
 * - 手数料ルールに基づいて手数料を自動計算
 * - テナント請求書明細を作成（編集可能）
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.isSystemAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // JSON パースエラーハンドリング
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Tenant Invoice Generate] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validatedData = GenerateTenantInvoiceSchema.parse(body)

    const { org_id, billing_month } = validatedData
    const billingMonthDate = new Date(billing_month)

    // 既存の請求書チェック
    let existingInvoice;
    try {
      existingInvoice = await prisma.tenant_invoices.findUnique({
        where: {
          unique_tenant_invoice: {
            org_id,
            billing_month: billingMonthDate,
          },
        },
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Generate] Database error - existing invoice check:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (existingInvoice) {
      return NextResponse.json(
        { error: '指定した月の請求書は既に存在します' },
        { status: 409 }
      )
    }

    // 承認済み収集業者請求サマリーを取得
    let approvedSummaries;
    try {
      approvedSummaries = await prisma.billing_summaries.findMany({
        where: {
          org_id,
          billing_month: billingMonthDate,
          status: 'APPROVED',
        },
        include: {
          collectors: true,
        },
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Generate] Database error - billing summaries fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (approvedSummaries.length === 0) {
      return NextResponse.json(
        { error: '承認済みの収集業者請求がありません' },
        { status: 404 }
      )
    }

    // 手数料ルールを取得
    let commissionRules;
    try {
      commissionRules = await prisma.commission_rules.findMany({
        where: {
          org_id,
          is_active: true,
          deleted_at: null,
        },
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Generate] Database error - commission rules fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // トランザクションで請求書作成
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
      // 請求書番号生成（例: TI-YYYYMM-001）
      const year = billingMonthDate.getFullYear()
      const month = String(billingMonthDate.getMonth() + 1).padStart(2, '0')
      const invoiceNumber = `TI-${year}${month}-001` // 簡略版（実際は連番管理が必要）

      // テナント請求書作成
      const invoice = await tx.tenant_invoices.create({
        data: {
          org_id,
          billing_month: billingMonthDate,
          invoice_number: invoiceNumber,
          status: 'DRAFT',
          created_by: authUser.id,
          updated_by: authUser.id,
        },
      })

      const invoiceItems = []
      let collectorsSubtotal = 0
      let collectorsTax = 0
      let collectorsTotal = 0
      let commissionSubtotal = 0
      let commissionTax = 0
      let commissionTotal = 0
      let displayOrder = 1

      // 収集業者ごとの明細と手数料を作成
      for (const summary of approvedSummaries) {
        const baseAmount = summary.subtotal_amount
        const taxAmount = summary.tax_amount
        const totalAmount = summary.total_amount

        collectorsSubtotal += baseAmount
        collectorsTax += taxAmount
        collectorsTotal += totalAmount

        // 収集業者請求分の明細
        const collectorItem = await tx.tenant_invoice_items.create({
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
        invoiceItems.push(collectorItem)

        // 手数料計算
        let calculatedCommission = 0
        for (const rule of commissionRules) {
          if (rule.collector_id && rule.collector_id !== summary.collector_id) {
            continue // 収集業者が一致しない場合スキップ
          }

          // billing_typeに応じて手数料計算
          if (rule.billing_type === 'FIXED' && rule.commission_type === 'PERCENTAGE') {
            calculatedCommission += (summary.total_fixed_amount * Number(rule.commission_value)) / 100
          } else if (rule.billing_type === 'METERED' && rule.commission_type === 'PERCENTAGE') {
            calculatedCommission += (summary.total_metered_amount * Number(rule.commission_value)) / 100
          } else if (rule.commission_type === 'FIXED_AMOUNT') {
            calculatedCommission += Number(rule.commission_value)
          }
        }

        if (calculatedCommission > 0) {
          const commissionTaxAmt = calculatedCommission * 0.1
          const commissionTotalAmt = calculatedCommission + commissionTaxAmt

          commissionSubtotal += calculatedCommission
          commissionTax += commissionTaxAmt
          commissionTotal += commissionTotalAmt

          // 手数料の明細
          const commissionItem = await tx.tenant_invoice_items.create({
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
          invoiceItems.push(commissionItem)
        }
      }

      // 共通管理費（collector_idがnullのルール）
      const commonRule = commissionRules.find(
        (r) => r.collector_id === null && r.billing_type === 'OTHER'
      )
      if (commonRule) {
        const managementFee = Number(commonRule.commission_value)
        const managementTax = managementFee * 0.1
        const managementTotal = managementFee + managementTax

        commissionSubtotal += managementFee
        commissionTax += managementTax
        commissionTotal += managementTotal

        const managementItem = await tx.tenant_invoice_items.create({
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
        invoiceItems.push(managementItem)
      }

      // 請求書の合計金額を更新
      const updatedInvoice = await tx.tenant_invoices.update({
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
        include: {
          tenant_invoice_items: {
            include: {
              collectors: {
                select: {
                  id: true,
                  company_name: true,
                },
              },
            },
            orderBy: { display_order: 'asc' },
          },
        },
      })

      return updatedInvoice
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Generate] Database error - transaction:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'テナント請求書を生成しました',
        data: result,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[API] Failed to generate tenant invoice:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'テナント請求書の生成に失敗しました' },
      { status: 500 }
    )
  }
}


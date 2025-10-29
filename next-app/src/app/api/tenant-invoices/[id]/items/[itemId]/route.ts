import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// PUTリクエストスキーマ
const UpdateInvoiceItemSchema = z.object({
  subtotal: z.number().optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  notes: z.string().optional().nullable(),
})

/**
 * テナント請求書明細の編集（手動調整）
 * DRAFT状態の請求書のみ編集可能
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
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
      console.error('[Tenant Invoice Item Update] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validatedData = UpdateInvoiceItemSchema.parse(body)

    // 請求書のステータス確認
    let invoice;
    try {
      invoice = await prisma.tenant_invoices.findUnique({
        where: { id: params.id },
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Item Update] Database error - invoice fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'DRAFT状態の請求書のみ編集可能です' },
        { status: 403 }
      )
    }

    // 明細を更新
    const updateData: any = {
      updated_at: new Date(),
    }

    if (validatedData.subtotal !== undefined) {
      updateData.subtotal = validatedData.subtotal
      updateData.is_auto_calculated = false // 手動編集フラグ
    }

    if (validatedData.tax_rate !== undefined) {
      updateData.tax_rate = validatedData.tax_rate
    }

    // 税額と合計額を再計算
    if (updateData.subtotal !== undefined || updateData.tax_rate !== undefined) {
      let currentItem;
      try {
        currentItem = await prisma.tenant_invoice_items.findUnique({
          where: { id: params.itemId },
        });
      } catch (dbError) {
        console.error('[Tenant Invoice Item Update] Database error - item fetch:', dbError);
        return NextResponse.json(
          { error: 'Database error occurred' },
          { status: 500 }
        );
      }

      if (!currentItem) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      const subtotal = updateData.subtotal ?? Number(currentItem.subtotal)
      const taxRate = updateData.tax_rate ?? Number(currentItem.tax_rate)
      updateData.tax_amount = subtotal * (taxRate / 100)
      updateData.total_amount = subtotal + updateData.tax_amount
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    let updatedItem;
    try {
      updatedItem = await prisma.tenant_invoice_items.update({
        where: { id: params.itemId },
        data: updateData,
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Item Update] Database error - item update:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // 請求書全体の合計を再計算
    try {
      await recalculateInvoiceTotals(params.id);
    } catch (dbError) {
      console.error('[Tenant Invoice Item Update] Database error - recalculate:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred during recalculation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedItem })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[API] Failed to update invoice item:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

/**
 * 請求書全体の合計金額を再計算
 */
async function recalculateInvoiceTotals(invoiceId: string) {
  const items = await prisma.tenant_invoice_items.findMany({
    where: { tenant_invoice_id: invoiceId },
  })

  let collectorsSubtotal = 0
  let collectorsTax = 0
  let collectorsTotal = 0
  let commissionSubtotal = 0
  let commissionTax = 0
  let commissionTotal = 0

  for (const item of items) {
    const subtotal = Number(item.subtotal)
    const taxAmount = Number(item.tax_amount)
    const totalAmount = Number(item.total_amount)

    if (item.item_type === 'COLLECTOR_BILLING') {
      collectorsSubtotal += subtotal
      collectorsTax += taxAmount
      collectorsTotal += totalAmount
    } else {
      commissionSubtotal += subtotal
      commissionTax += taxAmount
      commissionTotal += totalAmount
    }
  }

  await prisma.tenant_invoices.update({
    where: { id: invoiceId },
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
      updated_at: new Date(),
    },
  })
}



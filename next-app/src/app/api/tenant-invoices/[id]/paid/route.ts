import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

/**
 * テナント請求書の入金確認
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.isSystemAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let invoice;
    try {
      invoice = await prisma.tenant_invoices.findUnique({
        where: { id: params.id },
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Paid] Database error - invoice fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status !== 'ISSUED') {
      return NextResponse.json(
        { error: 'ISSUED状態の請求書のみ入金確認可能です' },
        { status: 403 }
      )
    }

    let paidInvoice;
    try {
      paidInvoice = await prisma.tenant_invoices.update({
        where: { id: params.id },
        data: {
          status: 'PAID',
          paid_at: new Date(),
          updated_at: new Date(),
          updated_by: authUser.id,
        },
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Paid] Database error - invoice update:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '入金を確認しました',
      data: paidInvoice,
    })
  } catch (error) {
    console.error('[API] Failed to mark invoice as paid:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}



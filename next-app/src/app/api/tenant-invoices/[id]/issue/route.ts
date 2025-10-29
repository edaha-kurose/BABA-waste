import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

/**
 * テナント請求書を発行
 */
export async function POST(
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
      console.error('[Tenant Invoice Issue] Database error - invoice fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status !== 'LOCKED') {
      return NextResponse.json(
        { error: 'LOCKED状態の請求書のみ発行可能です' },
        { status: 403 }
      )
    }

    let issuedInvoice;
    try {
      issuedInvoice = await prisma.tenant_invoices.update({
        where: { id: params.id },
        data: {
          status: 'ISSUED',
          issued_at: new Date(),
          updated_at: new Date(),
          updated_by: authUser.id,
        },
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Issue] Database error - invoice update:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '請求書を発行しました',
      data: issuedInvoice,
    })
  } catch (error) {
    console.error('[API] Failed to issue invoice:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}



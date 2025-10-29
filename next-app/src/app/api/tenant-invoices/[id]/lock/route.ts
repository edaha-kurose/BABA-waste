import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

/**
 * テナント請求書をロック（確定）
 * ロック後は明細の編集不可
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
      console.error('[Tenant Invoice Lock] Database error - invoice fetch:', dbError);
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
        { error: 'DRAFT状態の請求書のみロック可能です' },
        { status: 403 }
      )
    }

    let lockedInvoice;
    try {
      lockedInvoice = await prisma.tenant_invoices.update({
        where: { id: params.id },
        data: {
          status: 'LOCKED',
          locked_at: new Date(),
          locked_by: authUser.id,
          updated_at: new Date(),
          updated_by: authUser.id,
        },
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Lock] Database error - invoice update:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: '請求書を確定しました',
      data: lockedInvoice,
    })
  } catch (error) {
    console.error('[API] Failed to lock invoice:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}



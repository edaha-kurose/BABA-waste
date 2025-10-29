import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// クエリパラメータスキーマ
const QuerySchema = z.object({
  org_id: z.string().uuid(),
  billing_month: z.string().optional(),
  status: z.enum(['DRAFT', 'LOCKED', 'ISSUED', 'PAID', 'CANCELLED']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.isSystemAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const validatedParams = QuerySchema.parse(searchParams)

    const where: any = {
      org_id: validatedParams.org_id,
      deleted_at: null,
    }

    if (validatedParams.billing_month) {
      where.billing_month = new Date(validatedParams.billing_month)
    }

    if (validatedParams.status) {
      where.status = validatedParams.status
    }

    let invoices
    try {
      invoices = await prisma.tenant_invoices.findMany({
        where,
        include: {
          organizations: {
            select: {
              id: true,
              name: true,
            },
          },
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
        orderBy: [{ billing_month: 'desc' }, { created_at: 'desc' }],
      })
    } catch (dbError) {
      console.error('[GET /api/tenant-invoices] Prisma検索エラー:', dbError)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: invoices })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[GET /api/tenant-invoices] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}



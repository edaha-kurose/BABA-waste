import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: any = {
      org_id: user.org_id,
    }

    if (status) {
      where.status = status
    }

    if (startDate && endDate) {
      where.sent_at = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      }
    }

    let items, total;
    try {
      [items, total] = await Promise.all([
        prisma.email_logs.findMany({
          where,
          orderBy: { sent_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.email_logs.count({ where }),
      ]);
    } catch (dbError) {
      console.error('[Email Logs GET API] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: items,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[Email Logs GET API] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { status: 500 }
    )
  }
}




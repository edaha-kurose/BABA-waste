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
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const where: any = {
      org_id: user.org_id,
    }

    if (startDate && endDate) {
      where.sent_at = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      }
    }

    let total, success, failed, opened, clicked;
    try {
      [total, success, failed, opened, clicked] = await Promise.all([
        prisma.email_logs.count({ where }),
        prisma.email_logs.count({ where: { ...where, status: 'SUCCESS' } }),
        prisma.email_logs.count({ where: { ...where, status: 'FAILED' } }),
        prisma.email_logs.count({ where: { ...where, opened_at: { not: null } } }),
        prisma.email_logs.count({ where: { ...where, clicked_at: { not: null } } }),
      ]);
    } catch (dbError) {
      console.error('[Email Stats API] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        total,
        success,
        failed,
        opened,
        clicked,
        success_rate: total > 0 ? ((success / total) * 100).toFixed(2) : '0.00',
        open_rate: total > 0 ? ((opened / total) * 100).toFixed(2) : '0.00',
        click_rate: total > 0 ? ((clicked / total) * 100).toFixed(2) : '0.00',
      },
    })
  } catch (error) {
    console.error('[Email Stats API] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { status: 500 }
    )
  }
}




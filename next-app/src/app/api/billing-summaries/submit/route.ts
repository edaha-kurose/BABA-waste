import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// リクエストスキーマ
const SubmitBillingSchema = z.object({
  billing_summary_ids: z.array(z.string().uuid()).min(1),
})

/**
 * 収集業者が請求書をシステム管理会社に提出
 */
export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    const validatedData = SubmitBillingSchema.parse(body)

    // DRAFT状態の請求サマリーのみ提出可能
    let updatedSummaries
    try {
      updatedSummaries = await prisma.billing_summaries.updateMany({
        where: {
          id: {
            in: validatedData.billing_summary_ids,
          },
          status: 'DRAFT',
        },
        data: {
          status: 'SUBMITTED',
          submitted_at: new Date(),
          submitted_by: authUser.id,
          updated_at: new Date(),
          updated_by: authUser.id,
        },
      });
    } catch (dbError) {
      console.error('[POST /api/billing-summaries/submit] Prisma更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: `${updatedSummaries.count}件の請求書を提出しました`,
        count: updatedSummaries.count,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('[API] Failed to submit billing summaries:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

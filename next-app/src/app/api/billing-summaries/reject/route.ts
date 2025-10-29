import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// リクエストスキーマ
const RejectBillingSchema = z.object({
  billing_summary_ids: z.array(z.string().uuid()).min(1),
  rejection_reason: z.string().min(1, '差し戻し理由は必須です'),
})

/**
 * システム管理会社が収集業者の請求書を差し戻し
 */
export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser || !authUser.isSystemAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    const validatedData = RejectBillingSchema.parse(body)

    // SUBMITTED状態の請求サマリーのみ差し戻し可能
    let updatedSummaries
    try {
      updatedSummaries = await prisma.billing_summaries.updateMany({
        where: {
          id: {
            in: validatedData.billing_summary_ids,
          },
          status: 'SUBMITTED',
        },
        data: {
          status: 'REJECTED',
          rejected_at: new Date(),
          rejected_by: authUser.id,
          rejection_reason: validatedData.rejection_reason,
          updated_at: new Date(),
          updated_by: authUser.id,
        },
      });
    } catch (dbError) {
      console.error('[POST /api/billing-summaries/reject] Prisma更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: `${updatedSummaries.count}件の請求書を差し戻しました`,
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
    console.error('[API] Failed to reject billing summaries:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

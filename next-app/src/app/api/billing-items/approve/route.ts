import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// リクエストスキーマ
const ApproveItemsSchema = z.object({
  item_ids: z.array(z.string().uuid()).min(1),
})

/**
 * POST /api/billing-items/approve
 * 請求明細を一括承認
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    // リクエストボディ検証
    const validated = ApproveItemsSchema.parse(body)

    // トランザクションで一括承認
    let result
    try {
      result = await prisma.$transaction(async (tx) => {
        const updated = await tx.app_billing_items.updateMany({
          where: {
            id: { in: validated.item_ids },
            deleted_at: null,
          },
          data: {
            status: 'APPROVED',
            approved_at: new Date(),
            approved_by: user.id,
            updated_at: new Date(),
          },
        })

        return updated
      });
    } catch (dbError) {
      console.error('[POST /api/billing-items/approve] Prismaトランザクションエラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count}件の請求明細を承認しました`,
    })
  } catch (error) {
    console.error('[API Error] billing-items/approve:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '承認処理に失敗しました' },
      { status: 500 }
    )
  }
}

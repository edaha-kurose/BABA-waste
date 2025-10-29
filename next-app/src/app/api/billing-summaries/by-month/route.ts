import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { prisma } from '@/lib/prisma'

// ✅ Zodスキーマ
const QuerySchema = z.object({
  org_id: z.string().uuid().optional(),
  billing_month: z.string().regex(/^\d{4}-\d{2}$/),
})

/**
 * GET /api/billing-summaries/by-month
 * 指定月の請求サマリー詳細を取得
 */
export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const org_id = searchParams.get('org_id') || undefined
    const billing_month = searchParams.get('billing_month')

    // 3. Zodバリデーション
    const validated = QuerySchema.parse({ org_id, billing_month })

    // 4. 認可チェック
    const targetOrgId = validated.org_id || authUser.org_ids[0]
    if (!targetOrgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 5. 月別詳細データ取得
    let summaries

    try {
      // billing_month を Date 型に変換
      const targetMonth = new Date(`${validated.billing_month}-01`)

      summaries = await prisma.billing_summaries.findMany({
        where: {
          org_id: targetOrgId,
          billing_month: targetMonth,
        },
        include: {
          collectors: {
            select: {
              id: true,
              company_name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      })
    } catch (dbError) {
      console.error('[API] Database error:', dbError)
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: summaries,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


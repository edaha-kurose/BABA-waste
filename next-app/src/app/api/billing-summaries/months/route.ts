import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { prisma } from '@/lib/prisma'

// ✅ Zodスキーマ
const QuerySchema = z.object({
  org_id: z.string().uuid().optional(),
})

/**
 * GET /api/billing-summaries/months
 * 請求サマリーの月別一覧を取得
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

    // 3. Zodバリデーション
    const validated = QuerySchema.parse({ org_id })

    // 4. 認可チェック
    const targetOrgId = validated.org_id || authUser.org_ids[0]
    console.log('[Billing Months API] targetOrgId:', targetOrgId)
    console.log('[Billing Months API] authUser.org_ids:', authUser.org_ids)
    
    if (!targetOrgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 5. 月別集計データ取得
    let monthlyData: Array<{
      billing_month: string
      total_amount: number
      collector_count: number
    }>

    try {
      monthlyData = await prisma.$queryRaw<
        Array<{
          billing_month: string
          total_amount: number
          collector_count: number
        }>
      >`
        SELECT
          TO_CHAR(billing_month, 'YYYY-MM') as billing_month,
          SUM(total_amount)::numeric AS total_amount,
          COUNT(DISTINCT collector_id)::int AS collector_count
        FROM app.billing_summaries
        WHERE org_id = ${targetOrgId}::uuid
        GROUP BY billing_month
        ORDER BY billing_month DESC
      `
    } catch (dbError) {
      console.error('[API] Database error:', dbError)
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
    }

    // 6. レスポンス整形
    const formattedData = monthlyData.map((row) => ({
      billing_month: row.billing_month,
      total_amount: Number(row.total_amount),
      collector_count: row.collector_count,
    }))

    return NextResponse.json({
      success: true,
      data: formattedData,
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


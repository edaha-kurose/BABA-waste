import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// クエリパラメータスキーマ
const QuerySchema = z.object({
  org_id: z.string().uuid().optional(),
  collector_id: z.string().uuid().optional(),
  billing_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

/**
 * GET /api/billing-summaries
 * 請求サマリー一覧取得
 */
export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. クエリパラメータ解析
  const { searchParams } = new URL(request.url)
  const params = {
    org_id: searchParams.get('org_id') || undefined,
    collector_id: searchParams.get('collector_id') || undefined,
    billing_month: searchParams.get('billing_month') || undefined,
    status: searchParams.get('status') || undefined,
    limit: searchParams.get('limit') || '50',
    offset: searchParams.get('offset') || '0',
  }

  let validated
  try {
    validated = QuerySchema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '不正なパラメータです' }, { status: 400 })
  }

  // 3. 権限チェック
  const targetOrgId = validated.org_id || user.org_id
  if (!targetOrgId) {
    return NextResponse.json(
      { error: '組織IDが必要です' },
      { status: 400 }
    )
  }

  if (!user.isSystemAdmin && !user.org_ids.includes(targetOrgId)) {
    return NextResponse.json(
      { error: 'この組織の請求サマリーを閲覧する権限がありません' },
      { status: 403 }
    )
  }

  // 4. WHERE条件構築
  const where: any = {
    org_id: targetOrgId,
  }

  if (validated.collector_id) {
    where.collector_id = validated.collector_id
  }

  if (validated.billing_month) {
    where.billing_month = new Date(validated.billing_month)
  }

  if (validated.status) {
    where.status = validated.status
  }

  // 5. データ取得
  let summaries, total
  try {
    [summaries, total] = await Promise.all([
      prisma.billing_summaries.findMany({
        where,
        include: {
          collectors: {
            select: {
              id: true,
              company_name: true,
            },
          },
          organizations: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ billing_month: 'desc' }, { created_at: 'desc' }],
        take: validated.limit,
        skip: validated.offset,
      }),
      prisma.billing_summaries.count({ where }),
    ])
  } catch (dbError) {
    console.error('[GET /api/billing-summaries] Prisma検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: summaries,
    pagination: {
      total,
      limit: validated.limit,
      offset: validated.offset,
      hasMore: validated.offset + validated.limit < total,
    },
  })
}

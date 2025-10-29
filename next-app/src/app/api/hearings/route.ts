import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

// Zodスキーマ
const HearingCreateSchema = z.object({
  org_id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  target_period_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  target_period_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  response_deadline: z.string().datetime(),
});

// GET: ヒアリング一覧取得
export async function GET(request: NextRequest) {
  // 認証チェック
  const { getAuthenticatedUser } = await import('@/lib/auth/session-server')
  const authUser = await getAuthenticatedUser(request)
  
  if (!authUser || !authUser.org_id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // パラメータ取得
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  // データベースクエリ
  let hearings
  try {
    hearings = await prisma.hearings.findMany({
      where: {
        org_id: authUser.org_id,
        deleted_at: null,
        ...(status && { status }),
      },
      orderBy: { created_at: 'desc' },
      include: {
        hearing_targets: {
          select: {
            id: true,
            response_status: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[GET /api/hearings] DB検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  // 回答状況の集計
  const hearingsWithStats = hearings.map((hearing) => {
    const total = hearing.hearing_targets.length
    const responded = hearing.hearing_targets.filter(
      (t) => t.response_status === 'RESPONDED'
    ).length
    const locked = hearing.hearing_targets.filter(
      (t) => t.response_status === 'LOCKED'
    ).length

    return {
      ...hearing,
      stats: {
        total,
        responded,
        locked,
        response_rate: total > 0 ? Math.round((responded / total) * 100) : 0,
      },
    }
  })

  return NextResponse.json(hearingsWithStats, { status: 200 })
}

// POST: ヒアリング新規作成
export async function POST(request: NextRequest) {
  // 認証チェック
  const { getAuthenticatedUser } = await import('@/lib/auth/session-server')
  const authUser = await getAuthenticatedUser(request)
  
  if (!authUser || !authUser.org_id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // JSONパース
  let body
  try {
    body = await request.json()
  } catch (parseError) {
    return NextResponse.json(
      { error: '不正なJSONフォーマットです' },
      { status: 400 }
    )
  }

  // バリデーション
  const UserInputSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    target_period_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    target_period_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    response_deadline: z.string(), // datetime-local形式を許可
  })

  let validatedData
  try {
    validatedData = UserInputSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 })
  }

  // datetime-local (YYYY-MM-DDTHH:MM) → ISO補正
  const normalizedDeadline = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(validatedData.response_deadline)
    ? `${validatedData.response_deadline}:00`
    : validatedData.response_deadline

  // 日付バリデーション
  const fromDate = new Date(validatedData.target_period_from)
  const toDate = new Date(validatedData.target_period_to)
  if (toDate < fromDate) {
    return NextResponse.json(
      { error: '対象期間の終了日は開始日以降にしてください' },
      { status: 400 }
    )
  }

  // データベース操作
  let hearing
  try {
    hearing = await prisma.hearings.create({
      data: {
        org_id: authUser.org_id,
        title: validatedData.title,
        description: validatedData.description,
        target_period_from: fromDate,
        target_period_to: toDate,
        response_deadline: new Date(normalizedDeadline),
        status: 'DRAFT',
        created_by: authUser.id,
        updated_by: authUser.id,
      },
    })
  } catch (dbError) {
    console.error('[POST /api/hearings] DB作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(hearing, { status: 201 })
}



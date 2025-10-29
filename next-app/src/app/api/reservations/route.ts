import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// クエリパラメータスキーマ
const QuerySchema = z.object({
  org_id: z.string().uuid(),
  plan_id: z.string().uuid().optional(),
})

// Zodバリデーションスキーマ（実際のスキーマに合わせて簡略化）
const reservationSchema = z.object({
  org_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  jwnet_temp_id: z.string().optional(),
  payload_hash: z.string().min(1, 'ペイロードハッシュは必須です'),
  status: z.enum(['RESERVED', 'FAILED', 'PENDING', 'REGISTERED', 'ERROR']).default('PENDING'),
  error_code: z.string().optional(),
})

// GET: 予約一覧取得
export async function GET(request: NextRequest) {
  // 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // バリデーション
  let validatedParams
  try {
    const { searchParams } = new URL(request.url)
    const params = {
      org_id: searchParams.get('org_id') || '',
      plan_id: searchParams.get('plan_id') || undefined,
    }
    validatedParams = QuerySchema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '不正なパラメータです' }, { status: 400 })
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(validatedParams.org_id)) {
    return NextResponse.json(
      { error: 'この組織の予約を閲覧する権限がありません' },
      { status: 403 }
    )
  }

  // クエリ構築
  const where: any = {
    org_id: validatedParams.org_id,
    deleted_at: null,
  }

  if (validatedParams.plan_id) {
    where.plan_id = validatedParams.plan_id
  }

  // データベースクエリ
  let reservations
  try {
    reservations = await prisma.reservations.findMany({
      where,
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        plans: {
          select: {
            id: true,
            planned_date: true,
            planned_qty: true,
            unit: true,
            stores: {
              select: {
                id: true,
                store_code: true,
                name: true,
              },
            },
            item_maps: {
              select: {
                id: true,
                item_label: true,
                jwnet_code: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    })
  } catch (dbError) {
    console.error('[GET /api/reservations] DB検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(reservations)
}

// POST: 予約新規作成
export async function POST(request: NextRequest) {
  // 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
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
  let validatedData
  try {
    validatedData = reservationSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 })
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(validatedData.org_id)) {
    return NextResponse.json(
      { error: 'この組織の予約を作成する権限がありません' },
      { status: 403 }
    )
  }

  // 予定の存在確認
  let plan
  try {
    plan = await prisma.plans.findUnique({
      where: { id: validatedData.plan_id },
    })
  } catch (dbError) {
    console.error('[POST /api/reservations] 予定検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (!plan || plan.deleted_at) {
    return NextResponse.json(
      { error: '予定が見つかりません' },
      { status: 404 }
    )
  }

  // 予約作成
  let reservation
  try {
    reservation = await prisma.reservations.create({
      data: {
        org_id: validatedData.org_id,
        plan_id: validatedData.plan_id,
        jwnet_temp_id: validatedData.jwnet_temp_id,
        payload_hash: validatedData.payload_hash,
        status: validatedData.status,
        error_code: validatedData.error_code,
        created_by: authUser.id,
        updated_by: authUser.id,
      },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        plans: {
          select: {
            id: true,
            planned_date: true,
            stores: {
              select: {
                id: true,
                store_code: true,
                name: true,
              },
            },
            item_maps: {
              select: {
                id: true,
                item_label: true,
              },
            },
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[POST /api/reservations] 予約作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(reservation, { status: 201 })
}

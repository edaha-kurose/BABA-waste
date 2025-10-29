import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// Zodバリデーションスキーマ
const QuerySchema = z.object({
  org_id: z.string().uuid().optional(),
  plan_id: z.string().uuid().optional(),
})

const registrationSchema = z.object({
  org_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  manifest_no: z.string().optional(),
  status: z.enum(['RESERVED', 'FAILED', 'PENDING', 'REGISTERED', 'ERROR']).default('PENDING'),
  error_code: z.string().optional(),
})

// GET: 登録一覧取得
export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // 2. クエリパラメータバリデーション
  const { searchParams } = new URL(request.url)
  let validatedParams
  try {
    validatedParams = QuerySchema.parse({
      org_id: searchParams.get('org_id') || undefined,
      plan_id: searchParams.get('plan_id') || undefined,
    })
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
  const targetOrgId = validatedParams.org_id || authUser.org_id
  if (!targetOrgId) {
    return NextResponse.json(
      { error: '組織IDは必須です' },
      { status: 400 }
    )
  }

  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json(
      { error: 'この組織の登録を閲覧する権限がありません' },
      { status: 403 }
    )
  }

  // 4. データ取得
  const where: any = {
    org_id: targetOrgId,
    deleted_at: null,
  }

  if (validatedParams.plan_id) {
    where.plan_id = validatedParams.plan_id
  }

  let registrations
  try {
    registrations = await prisma.registrations.findMany({
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
    console.error('[GET /api/registrations] Prisma検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(registrations)
}

// POST: 登録新規作成
export async function POST(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // 2. JSONパース
  let body
  try {
    body = await request.json()
  } catch (parseError) {
    return NextResponse.json(
      { error: '不正なJSONフォーマットです' },
      { status: 400 }
    )
  }

  // 3. バリデーション
  let validatedData
  try {
    validatedData = registrationSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 })
  }

  // 4. 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(validatedData.org_id)) {
    return NextResponse.json(
      { error: 'この組織の登録を作成する権限がありません' },
      { status: 403 }
    )
  }

  // 5. 予定の存在確認
  let plan
  try {
    plan = await prisma.plans.findUnique({
      where: { id: validatedData.plan_id },
    })
  } catch (dbError) {
    console.error('[POST /api/registrations] 予定検索エラー:', dbError)
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

  // 6. 登録作成
  let registration
  try {
    registration = await prisma.registrations.create({
      data: {
        org_id: validatedData.org_id,
        plan_id: validatedData.plan_id,
        manifest_no: validatedData.manifest_no,
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
    console.error('[POST /api/registrations] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(registration, { status: 201 })
}

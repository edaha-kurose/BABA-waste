import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// Zodバリデーションスキーマ
const actualSchema = z.object({
  org_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  actual_qty: z.number().positive('実績数量は正の数である必要があります'),
  unit: z.enum(['T', 'KG', 'M3']).default('T'),
  vehicle_no: z.string().optional(),
  driver_name: z.string().optional(),
  weighing_ticket_no: z.string().optional(),
  photo_urls: z.array(z.string()).optional(),
})

// GET: 実績一覧取得（ページネーション対応）
export async function GET(request: NextRequest) {
  // 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const orgIdParam = searchParams.get('org_id')
  const plan_id = searchParams.get('plan_id')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit

  const targetOrgId = orgIdParam || authUser.org_id
  if (!targetOrgId) {
    return NextResponse.json({ error: '組織IDは必須です' }, { status: 400 })
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json(
      { error: 'この組織の実績を閲覧する権限がありません' },
      { status: 403 }
    )
  }

  const where: any = {
    org_id: targetOrgId,
    deleted_at: null,
  }

  if (plan_id) {
    where.plan_id = plan_id
  }

  // Step 1: 親データのみ取得（軽量化）
  let actuals, total
  try {
    [actuals, total] = await Promise.all([
      prisma.actuals.findMany({
        where,
        select: {
          id: true,
          org_id: true,
          plan_id: true,
          actual_qty: true,
          unit: true,
          vehicle_no: true,
          driver_name: true,
          weighing_ticket_no: true,
          photo_urls: true,
          confirmed_at: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: {
          confirmed_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.actuals.count({ where }),
    ])
  } catch (dbError) {
    console.error('[GET /api/actuals] Prisma検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  // Step 2: 必要なIDをまとめて取得
  const planIds = [...new Set(actuals.map(a => a.plan_id))]
  const orgIds = [...new Set(actuals.map(a => a.org_id))]

  let plans, organizations
  try {
    [plans, organizations] = await Promise.all([
      prisma.plans.findMany({
        where: { id: { in: planIds } },
        select: {
          id: true,
          planned_date: true,
          planned_qty: true,
          unit: true,
          store_id: true,
          item_map_id: true,
        },
      }),
      prisma.organizations.findMany({
        where: { id: { in: orgIds } },
        select: {
          id: true,
          name: true,
          code: true,
        },
      }),
    ])
  } catch (dbError) {
    console.error('[GET /api/actuals] 関連データ取得エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  // Step 3: stores と item_maps を取得
  const storeIds = [...new Set(plans.map(p => p.store_id).filter(Boolean))]
  const itemMapIds = [...new Set(plans.map(p => p.item_map_id).filter(Boolean))]

  let stores, itemMaps
  try {
    [stores, itemMaps] = await Promise.all([
      storeIds.length > 0
        ? prisma.stores.findMany({
            where: { id: { in: storeIds as string[] } },
            select: {
              id: true,
              store_code: true,
              name: true,
            },
          })
        : [],
      itemMapIds.length > 0
        ? prisma.item_maps.findMany({
            where: { id: { in: itemMapIds as string[] } },
            select: {
              id: true,
              item_label: true,
              jwnet_code: true,
            },
          })
        : [],
    ])
  } catch (dbError) {
    console.error('[GET /api/actuals] 店舗・品目データ取得エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  // Step 4: マージ
  const storesMap = new Map(stores.map(s => [s.id, s]))
  const itemMapsMap = new Map(itemMaps.map(i => [i.id, i]))
  const plansMap = new Map(
    plans.map(p => [
      p.id,
      {
        ...p,
        stores: p.store_id ? storesMap.get(p.store_id) : null,
        item_maps: p.item_map_id ? itemMapsMap.get(p.item_map_id) : null,
      },
    ])
  )
  const orgsMap = new Map(organizations.map(o => [o.id, o]))

  const result = actuals.map(actual => ({
    ...actual,
    organizations: orgsMap.get(actual.org_id),
    plans: plansMap.get(actual.plan_id),
  }))

  return NextResponse.json({
    data: result,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

// POST: 実績新規作成
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
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 })
  }

  // バリデーション
  let validatedData
  try {
    validatedData = actualSchema.parse(body)
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
      { error: 'この組織の実績を作成する権限がありません' },
      { status: 403 }
    )
  }

  // plan_idの重複チェック（1予定に1実績）
  let existing
  try {
    existing = await prisma.actuals.findFirst({
      where: {
        plan_id: validatedData.plan_id,
        deleted_at: null,
      },
    })
  } catch (dbError) {
    console.error('[POST /api/actuals] Prisma重複チェックエラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (existing) {
    return NextResponse.json(
      { error: 'この予定には既に実績が登録されています' },
      { status: 409 }
    )
  }

  // 予定の存在確認
  let plan
  try {
    plan = await prisma.plans.findUnique({
      where: { id: validatedData.plan_id },
      include: {
        stores: true,
        item_maps: true,
      },
    })
  } catch (dbError) {
    console.error('[POST /api/actuals] Prisma予定検索エラー:', dbError)
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

  // 実績作成
  let actual
  try {
    actual = await prisma.actuals.create({
      data: {
        org_id: validatedData.org_id,
        plan_id: validatedData.plan_id,
        actual_qty: validatedData.actual_qty,
        unit: validatedData.unit,
        vehicle_no: validatedData.vehicle_no,
        driver_name: validatedData.driver_name,
        weighing_ticket_no: validatedData.weighing_ticket_no,
        photo_urls: validatedData.photo_urls || [],
        confirmed_at: new Date(),
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
    })
  } catch (dbError) {
    console.error('[POST /api/actuals] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(actual, { status: 201 })
}




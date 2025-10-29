import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// GET /api/plans - 予定一覧取得（ページネーション対応）
export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const orgId = searchParams.get('org_id')
  const storeId = searchParams.get('store_id')
  const status = searchParams.get('status')
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  const includeDeleted = searchParams.get('includeDeleted') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  const skip = (page - 1) * limit

  // 2. 権限チェック
  const targetOrgId = orgId || authUser.org_id
  if (targetOrgId && !authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json(
      { error: 'この組織の予定を閲覧する権限がありません' },
      { status: 403 }
    )
  }

  // 3. クエリ条件構築
  const where: any = {}
  
  if (targetOrgId) {
    where.org_id = targetOrgId
  }
    
    if (storeId) {
      where.store_id = storeId
    }
    
    if (status) {
      where.status = status
    }
    
    if (fromDate || toDate) {
      where.planned_date = {}
      if (fromDate) {
        where.planned_date.gte = new Date(fromDate)
      }
      if (toDate) {
        where.planned_date.lte = new Date(toDate)
      }
    }

  // 4. データ取得
  let plans, total
  try {
    [plans, total] = await Promise.all([
      prisma.plans.findMany({
        where,
        select: {
          id: true,
          org_id: true,
          store_id: true,
          item_map_id: true,
          planned_date: true,
          planned_qty: true,
          unit: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { planned_date: 'asc' },
        skip,
        take: limit,
      }),
      prisma.plans.count({ where }),
    ])
  } catch (dbError) {
    console.error('[GET /api/plans] Prisma検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  // 5. 関連データ取得
  const orgIds = [...new Set(plans.map(p => p.org_id))]
  const storeIds = [...new Set(plans.map(p => p.store_id))]

  let organizations, stores, reservationCounts
  try {
    const results = await Promise.all([
      prisma.organizations.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true, code: true },
      }),
      prisma.stores.findMany({
        where: { id: { in: storeIds } },
        select: { id: true, store_code: true, name: true, address: true },
      }),
      prisma.reservations.groupBy({
        by: ['plan_id'],
        where: { plan_id: { in: plans.map(p => p.id) } },
        _count: true,
      }),
    ])
    organizations = results[0]
    stores = results[1]
    reservationCounts = results[2]
  } catch (dbError) {
    console.error('[GET /api/plans] 関連データ取得エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  // 6. マージ
  const orgsMap = new Map(organizations.map((o: any) => [o.id, o]))
  const storesMap = new Map(stores.map((s: any) => [s.id, s]))
  const reservationCountsMap = new Map(reservationCounts.map((r: any) => [r.plan_id, r._count]))

  const result = plans.map(plan => ({
    ...plan,
    organizations: orgsMap.get(plan.org_id),
    stores: storesMap.get(plan.store_id),
    _count: {
      reservations: reservationCountsMap.get(plan.id) || 0,
    },
  }))

  return NextResponse.json({
    data: result,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    count: result.length,
  })
}

// POST /api/plans - 予定作成
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

  // 3. Zodバリデーション
  const schema = z.object({
    org_id: z.string().uuid('Invalid organization ID'),
    store_id: z.string().uuid('Invalid store ID'),
    planned_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    }),
    item_map_id: z.string().uuid('Invalid item map ID'),
    planned_qty: z.number().positive('Quantity must be positive'),
    unit: z.enum(['KG', 'T', 'M3']).default('T'),
    earliest_pickup_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    }).optional(),
    route_id: z.string().optional(),
  })

  let validatedData
  try {
    validatedData = schema.parse(body)
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
      { error: 'この組織に予定を作成する権限がありません' },
      { status: 403 }
    )
  }

  // 5. 組織・店舗の存在確認
  let organization, store
  try {
    [organization, store] = await Promise.all([
      prisma.organizations.findUnique({ where: { id: validatedData.org_id } }),
      prisma.stores.findUnique({ where: { id: validatedData.store_id } }),
    ])
  } catch (dbError) {
    console.error('[POST /api/plans] 存在確認エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (!organization || organization.deleted_at) {
    return NextResponse.json({ error: '組織が見つかりません' }, { status: 404 })
  }

  if (!store || store.deleted_at || store.org_id !== validatedData.org_id) {
    return NextResponse.json(
      { error: '店舗が見つかりません、または指定された組織に属していません' },
      { status: 404 }
    )
  }

  // 6. 作成
  let plan
  try {
    plan = await prisma.plans.create({
      data: {
        org_id: validatedData.org_id,
        store_id: validatedData.store_id,
        planned_date: new Date(validatedData.planned_date),
        item_map_id: validatedData.item_map_id,
        planned_qty: validatedData.planned_qty,
        unit: validatedData.unit,
        earliest_pickup_date: validatedData.earliest_pickup_date 
          ? new Date(validatedData.earliest_pickup_date) 
          : undefined,
        route_id: validatedData.route_id,
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
        stores: {
          select: {
            id: true,
            store_code: true,
            name: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[POST /api/plans] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data: plan, message: '予定を作成しました' },
    { status: 201 }
  )
}


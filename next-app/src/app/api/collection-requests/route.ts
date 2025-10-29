import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/collection-requests - 収集依頼一覧取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { getAuthenticatedUser } = await import('@/lib/auth/session-server')
    const authUser = await getAuthenticatedUser(request)
    
    if (!authUser || !authUser.org_id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get('store_id')
    const planId = searchParams.get('plan_id')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    // クエリ条件構築（org_idは認証ユーザーから取得）
    const where: any = {
      org_id: authUser.org_id,
    }
    
    if (storeId) {
      where.store_id = storeId
    }
    
    if (planId) {
      where.plan_id = planId
    }
    
    if (status) {
      where.status = status
    }
    
    
    if (fromDate || toDate) {
      where.request_date = {}
      if (fromDate) {
        where.request_date.gte = new Date(fromDate)
      }
      if (toDate) {
        where.request_date.lte = new Date(toDate)
      }
    }

    const requests = await prisma.collection_requests.findMany({
      where,
      orderBy: { requested_at: 'desc' },
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
            address: true,
          },
        },
        collections: {
          select: {
            id: true,
            actual_qty: true,
            collected_at: true,
          },
        },
      },
    })

    return NextResponse.json({
      data: requests,
      count: requests.length,
    })
  } catch (error) {
    console.error('[API] Failed to fetch collection requests:', error)
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1')
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Failed to fetch collection requests',
        details: isLocal ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    )
  }
}

// POST /api/collection-requests - 収集依頼作成
export async function POST(request: NextRequest) {
  // 1. 認証チェック
  const { getAuthenticatedUser } = await import('@/lib/auth/session-server')
  const authUser = await getAuthenticatedUser(request)
  
  if (!authUser || !authUser.org_id) {
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
    plan_id: z.string().uuid('Invalid plan ID'),
    request_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    }),
    requested_pickup_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    }),
    confirmed_pickup_date: z.string().optional().nullable(),
    status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'COLLECTED']).default('PENDING'),
    notes: z.string().optional(),
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
      { error: 'この組織の収集依頼を作成する権限がありません' },
      { status: 403 }
    )
  }

  // 5. 組織・店舗・予定の存在確認
  let organization, store, plan
  try {
    organization = await prisma.organizations.findUnique({
      where: { id: validatedData.org_id },
    })

    if (!organization) {
      return NextResponse.json(
        { error: '組織が見つかりません' },
        { status: 404 }
      )
    }

    store = await prisma.stores.findUnique({
      where: { id: validatedData.store_id },
    })

    if (!store || store.org_id !== validatedData.org_id) {
      return NextResponse.json(
        { error: '店舗が見つかりません、または指定された組織に属していません' },
        { status: 404 }
      )
    }

    plan = await prisma.plans.findUnique({
      where: { id: validatedData.plan_id },
    })

    if (!plan || plan.org_id !== validatedData.org_id) {
      return NextResponse.json(
        { error: '予定が見つかりません、または指定された組織に属していません' },
        { status: 404 }
      )
    }
  } catch (dbError) {
    console.error('[POST /api/collection-requests] 存在確認エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  // 6. 日付変換
  const requestData: any = {
    org_id: validatedData.org_id,
    store_id: validatedData.store_id,
    plan_id: validatedData.plan_id,
    request_date: new Date(validatedData.request_date),
    requested_pickup_date: new Date(validatedData.requested_pickup_date),
    status: validatedData.status,
    notes: validatedData.notes,
    created_by: authUser.id,
    updated_by: authUser.id,
  }

  if (validatedData.confirmed_pickup_date) {
    requestData.confirmed_pickup_date = new Date(validatedData.confirmed_pickup_date)
  }

  // 7. 作成
  let collectionRequest
  try {
    collectionRequest = await prisma.collection_requests.create({
      data: requestData,
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
    console.error('[POST /api/collection-requests] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data: collectionRequest, message: '収集依頼を作成しました' },
    { status: 201 }
  )
}


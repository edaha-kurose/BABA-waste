import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// GET /api/collections - 実績一覧取得
export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const orgId = searchParams.get('org_id')
  const storeId = searchParams.get('store_id')
  const collectorId = searchParams.get('collector_id')
  const status = searchParams.get('status')
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  const includeDeleted = searchParams.get('includeDeleted') === 'true'

  // 2. 権限チェック
  const targetOrgId = orgId || authUser.org_id
  if (targetOrgId && !authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json(
      { error: 'この組織の実績を閲覧する権限がありません' },
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
    
    if (collectorId) {
      where.collector_id = collectorId
    }
    
    if (status) {
      where.status = status
    }
    
    
    if (fromDate || toDate) {
      where.collected_at = {}
      if (fromDate) {
        where.collected_at.gte = new Date(fromDate)
      }
      if (toDate) {
        where.collected_at.lte = new Date(toDate)
      }
    }

  // 4. データ取得
  let collections
  try {
    collections = await prisma.collections.findMany({
      where,
      orderBy: { collected_at: 'desc' },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        collection_requests: {
          select: {
            id: true,
            status: true,
            requested_at: true,
            scheduled_collection_date: true,
            stores: {
              select: {
                id: true,
                store_code: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[GET /api/collections] Prisma検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: collections,
    count: collections.length,
  })
}

// POST /api/collections - 実績作成
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
    collection_request_id: z.string().uuid('Invalid collection request ID'),
    store_id: z.string().uuid('Invalid store ID'),
    collector_id: z.string().uuid().optional(),
    waste_type_id: z.string().uuid().optional(),
    actual_pickup_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    }),
    actual_pickup_time: z.string().min(1, 'Time is required').max(50),
    actual_quantity: z.number().positive('Actual quantity must be positive'),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required').max(10),
    driver_name: z.string().max(255).optional(),
    vehicle_number: z.string().max(50).optional(),
    notes: z.string().optional(),
    status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED', 'COLLECTED', 'SCHEDULED', 'IN_PROGRESS', 'VERIFIED']).default('PENDING'),
    jwnet_registration_id: z.string().max(255).optional(),
    collected_at: z.string().optional(),
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
      { error: 'この組織に実績を作成する権限がありません' },
      { status: 403 }
    )
  }

  // 5. 組織・店舗・収集依頼の存在確認
  let organization, store, collectionRequest
  try {
    [organization, store, collectionRequest] = await Promise.all([
      prisma.organizations.findUnique({ where: { id: validatedData.org_id } }),
      prisma.stores.findUnique({ where: { id: validatedData.store_id } }),
      prisma.collection_requests.findUnique({ where: { id: validatedData.collection_request_id } }),
    ])
  } catch (dbError) {
    console.error('[POST /api/collections] 存在確認エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (!organization) {
    return NextResponse.json({ error: '組織が見つかりません' }, { status: 404 })
  }

  if (!store || store.org_id !== validatedData.org_id) {
    return NextResponse.json(
      { error: '店舗が見つかりません、または指定された組織に属していません' },
      { status: 404 }
    )
  }

  if (!collectionRequest || collectionRequest.org_id !== validatedData.org_id) {
    return NextResponse.json(
      { error: '収集依頼が見つかりません、または指定された組織に属していません' },
      { status: 404 }
    )
  }

  // 6. 作成
  const collectionData: any = {
    ...validatedData,
    actual_pickup_date: new Date(validatedData.actual_pickup_date),
    collected_at: validatedData.collected_at ? new Date(validatedData.collected_at) : undefined,
    created_by: authUser.id,
    updated_by: authUser.id,
  }

  let collection
  try {
    collection = await prisma.collections.create({
      data: collectionData,
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        collection_requests: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[POST /api/collections] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data: collection, message: '実績を作成しました' },
    { status: 201 }
  )
}


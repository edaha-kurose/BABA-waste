import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// GET /api/stores - 店舗一覧取得
export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const orgId = searchParams.get('org_id') || authUser.org_id
  const includeDeleted = searchParams.get('includeDeleted') === 'true'
  const search = searchParams.get('search')

  // 2. クエリ条件構築
  const where: any = {
    org_id: orgId,
  }
  
  // 削除されたデータを除外（includeDeleted が true の場合は含める）
  if (!includeDeleted) {
    where.deleted_at = null
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { store_code: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ]
  }

  // 3. データ取得
  let stores
  try {
    stores = await prisma.stores.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            plans: true,
            collection_requests: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[GET /api/stores] Prisma検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: stores,
    count: stores.length,
  })
}

// POST /api/stores - 店舗作成
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
    store_code: z.string().min(1, 'Store code is required').max(50),
    name: z.string().min(1, 'Name is required').max(255),
    address: z.string().max(500).optional(),
    phone: z.string().max(50).optional(),
    postal_code: z.string().max(20).optional(),
    address1: z.string().max(255).optional(),
    address2: z.string().max(255).optional(),
    area: z.string().max(100).optional(),
    area_name: z.string().max(100).optional(),
    area_manager_code: z.string().max(50).optional(),
    emitter_no: z.string().max(50).optional(),
    opening_date: z.string().optional(),
    closing_date: z.string().optional(),
    is_active: z.boolean().default(true),
    is_temporary: z.boolean().default(false),
    is_managed: z.boolean().default(false),
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
      { error: 'この組織に店舗を作成する権限がありません' },
      { status: 403 }
    )
  }

  // 5. 組織の存在確認 + 重複チェック
  let organization, existing
  try {
    [organization, existing] = await Promise.all([
      prisma.organizations.findUnique({ where: { id: validatedData.org_id } }),
      prisma.stores.findFirst({
        where: {
          org_id: validatedData.org_id,
          store_code: validatedData.store_code,
        },
      }),
    ])
  } catch (dbError) {
    console.error('[POST /api/stores] 存在確認エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (!organization) {
    return NextResponse.json({ error: '組織が見つかりません' }, { status: 404 })
  }

  if (existing) {
    return NextResponse.json(
      { error: 'この組織では既に同じ店舗コードが使用されています' },
      { status: 409 }
    )
  }

  // 6. 作成
  const storeData: any = {
    ...validatedData,
    created_by: authUser.id,
    updated_by: authUser.id,
    opening_date: validatedData.opening_date ? new Date(validatedData.opening_date) : undefined,
    closing_date: validatedData.closing_date ? new Date(validatedData.closing_date) : undefined,
  }

  let store
  try {
    store = await prisma.stores.create({
      data: storeData,
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[POST /api/stores] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data: store, message: '店舗を作成しました' },
    { status: 201 }
  )
}


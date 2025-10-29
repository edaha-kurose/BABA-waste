import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

// ============================================================================
// GET /api/store-collector-assignments - 店舗・収集業者割り当て一覧取得
// ============================================================================

const querySchema = z.object({
  store_id: z.string().uuid().optional().nullable(),
  collector_id: z.string().uuid().optional().nullable(),
  is_primary: z.string().optional().nullable().transform((val) => {
    if (val === 'true') return true
    if (val === 'false') return false
    return undefined
  }),
  org_id: z.string().uuid().optional().nullable(), // org_idパラメータを追加（nullも許可）
  limit: z.coerce.number().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
}).transform((data) => ({
  ...data,
  store_id: data.store_id || undefined,
  collector_id: data.collector_id || undefined,
  org_id: data.org_id || undefined,
}))

export async function GET(request: NextRequest) {
  console.log('========================================')
  console.log('[GET /api/store-collector-assignments] ★★★ API呼び出し開始 ★★★')
  console.log('========================================')
  
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(request)
    if (!user) {
      console.log('[GET /api/store-collector-assignments] ❌ 認証失敗')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[GET /api/store-collector-assignments] ✅ 認証成功:', user.email)

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const queryParams = {
      store_id: searchParams.get('store_id'),
      collector_id: searchParams.get('collector_id'),
      is_primary: searchParams.get('is_primary'),
      org_id: searchParams.get('org_id'),
      limit: searchParams.get('limit') || '100',
      offset: searchParams.get('offset') || '0',
    }

    // バリデーション
    console.log('[GET /api/store-collector-assignments] クエリパラメータ:', queryParams)
    
    let validatedParams
    try {
      validatedParams = querySchema.parse(queryParams)
      console.log('[GET /api/store-collector-assignments] バリデーション成功:', validatedParams)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[GET /api/store-collector-assignments] バリデーションエラー:', error.errors)
        console.error('[GET /api/store-collector-assignments] 受信したパラメータ:', queryParams)
        return NextResponse.json(
          { error: 'バリデーションエラー', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    // WHERE条件構築（org_id フィルタリング）
    let targetOrgId = user.org_id

    // org_id パラメータが指定されている場合の処理
    const selectedOrgId = searchParams.get('org_id')
    if (selectedOrgId) {
      if (user.isSystemAdmin) {
        // システム管理者の場合、アクセス可能な組織IDかチェック
        if (user.org_ids.includes(selectedOrgId)) {
          targetOrgId = selectedOrgId
        } else {
          return NextResponse.json(
            { error: 'Forbidden: Cannot access this tenant' },
            { status: 403 }
          )
        }
      } else {
        // 一般ユーザーの場合、自分の組織IDと一致するかチェック
        if (selectedOrgId === user.org_id) {
          targetOrgId = selectedOrgId
        } else {
          return NextResponse.json(
            { error: 'Forbidden: Cannot access other tenants' },
            { status: 403 }
          )
        }
      }
    }

    const where: any = {
      org_id: targetOrgId,
      deleted_at: null,
    }

    if (validatedParams.store_id) {
      where.store_id = validatedParams.store_id
    }

    if (validatedParams.collector_id) {
      where.collector_id = validatedParams.collector_id
    }

    if (validatedParams.is_primary !== undefined) {
      where.is_primary = validatedParams.is_primary
    }

    // データ取得
    console.log('========================================')
    console.log('[GET /api/store-collector-assignments] ★★★ Prismaクエリ実行 ★★★')
    console.log('[GET /api/store-collector-assignments] WHERE条件:', JSON.stringify(where, null, 2))
    console.log('[GET /api/store-collector-assignments] limit:', validatedParams.limit, 'offset:', validatedParams.offset)
    console.log('========================================')
    
    let assignments, total
    try {
      [assignments, total] = await Promise.all([
        prisma.store_collector_assignments.findMany({
          where,
          include: {
            stores: {
              select: {
                id: true,
                name: true,
                store_code: true,
              },
            },
            collectors: {
              select: {
                id: true,
                company_name: true,
                phone: true,
              },
            },
          },
          orderBy: [{ created_at: 'desc' }],
          take: validatedParams.limit,
          skip: validatedParams.offset,
        }),
        prisma.store_collector_assignments.count({ where }),
      ])
      
      console.log('========================================')
      console.log('[GET /api/store-collector-assignments] ★★★ Prismaクエリ結果 ★★★')
      console.log('[GET /api/store-collector-assignments] 取得件数:', assignments.length, '/ total:', total)
      console.log('[GET /api/store-collector-assignments] データ:', assignments.map(a => `${a.stores?.name} - ${a.collectors?.company_name}`))
      console.log('========================================')
    } catch (dbError) {
      console.error('[GET /api/store-collector-assignments] Prisma検索エラー:', dbError)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: assignments,
      meta: {
        total,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        has_more: validatedParams.offset + validatedParams.limit < total,
      },
    })
  } catch (error) {
    console.error('[GET /api/store-collector-assignments] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/store-collector-assignments - 店舗・収集業者割り当て作成
// ============================================================================

const createSchema = z.object({
  store_id: z.string().uuid(),
  collector_id: z.string().uuid(),
  is_primary: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  // 認証チェック
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    validatedData = createSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 })
  }

  // 重複チェック
  let existing
  try {
    existing = await prisma.store_collector_assignments.findFirst({
      where: {
        store_id: validatedData.store_id,
        collector_id: validatedData.collector_id,
        deleted_at: null,
      },
    })
  } catch (dbError) {
    console.error('[POST /api/store-collector-assignments] Prisma重複チェックエラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (existing) {
    return NextResponse.json(
      { error: 'この店舗と収集業者の組み合わせは既に登録されています' },
      { status: 409 }
    )
  }

  // データ作成
  let assignment
  try {
    assignment = await prisma.store_collector_assignments.create({
      data: {
        org_id: user.org_id,
        store_id: validatedData.store_id,
        collector_id: validatedData.collector_id,
        is_primary: validatedData.is_primary,
        created_by: user.id,
        updated_by: user.id,
      },
      include: {
        stores: true,
        collectors: true,
      },
    })
  } catch (dbError) {
    console.error('[POST /api/store-collector-assignments] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      data: assignment,
      message: '割り当てを作成しました',
    },
    { status: 201 }
  )
}

// ============================================================================
// PUT /api/store-collector-assignments - 店舗・収集業者割り当て更新
// ============================================================================

const updateSchema = z.object({
  id: z.string().uuid(),
  is_primary: z.boolean().optional(),
})

export async function PUT(request: NextRequest) {
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // リクエストボディ取得
    const body = await request.json()

    // バリデーション
    const validatedData = updateSchema.parse(body)

    // 存在チェック
    const existing = await prisma.store_collector_assignments.findUnique({
      where: { id: validatedData.id },
    })

    if (!existing || existing.deleted_at !== null) {
      return NextResponse.json({ error: '割り当てが見つかりません' }, { status: 404 })
    }

    // 更新
    const assignment = await prisma.store_collector_assignments.update({
      where: { id: validatedData.id },
      data: {
        is_primary: validatedData.is_primary,
        updated_by: user.id,
        updated_at: new Date(),
      },
      include: {
        stores: true,
        collectors: true,
      },
    })

    return NextResponse.json({
      data: assignment,
      message: '割り当てを更新しました',
    })
  } catch (error) {
    console.error('[Store Collector Assignments API] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE /api/store-collector-assignments - 店舗・収集業者割り当て削除
// ============================================================================

const deleteSchema = z.object({
  id: z.string().uuid(),
})

export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // バリデーション
    const validatedData = deleteSchema.parse({ id })

    // 存在チェック
    const existing = await prisma.store_collector_assignments.findUnique({
      where: { id: validatedData.id },
    })

    if (!existing || existing.deleted_at !== null) {
      return NextResponse.json({ error: '割り当てが見つかりません' }, { status: 404 })
    }

    // 論理削除
    await prisma.store_collector_assignments.update({
      where: { id: validatedData.id },
      data: {
        deleted_at: new Date(),
        updated_by: user.id,
        updated_at: new Date(),
      },
    })

    return NextResponse.json({
      message: '割り当てを削除しました',
    })
  } catch (error) {
    console.error('[Store Collector Assignments API] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



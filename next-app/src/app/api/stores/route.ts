import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/stores - 店舗一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orgId = searchParams.get('org_id')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')

    // クエリ条件構築
    const where: any = {}
    
    if (orgId) {
      where.org_id = orgId
    }
    
    if (!includeDeleted) {
      where.deleted_at = null
    }
    
    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === 'true'
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { store_code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    const stores = await prisma.store.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            plans: true,
            collectionRequests: true,
          },
        },
      },
    })

    return NextResponse.json({
      data: stores,
      count: stores.length,
    })
  } catch (error) {
    console.error('[API] Failed to fetch stores:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch stores' },
      { status: 500 }
    )
  }
}

// POST /api/stores - 店舗作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zodでバリデーション
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
      created_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 組織の存在確認
    const organization = await prisma.organization.findUnique({
      where: { id: validatedData.org_id },
    })

    if (!organization || organization.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Organization not found' },
        { status: 404 }
      )
    }

    // 重複チェック（同じorg_id + store_code）
    const existing = await prisma.store.findFirst({
      where: {
        org_id: validatedData.org_id,
        store_code: validatedData.store_code,
        deleted_at: null,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Store code already exists in this organization' },
        { status: 409 }
      )
    }

    // 日付変換
    const storeData: any = {
      ...validatedData,
      updated_by: validatedData.created_by,
    }

    if (validatedData.opening_date) {
      storeData.opening_date = new Date(validatedData.opening_date)
    }
    if (validatedData.closing_date) {
      storeData.closing_date = new Date(validatedData.closing_date)
    }

    // 作成
    const store = await prisma.store.create({
      data: storeData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    return NextResponse.json(
      { data: store, message: 'Store created successfully' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to create store:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create store' },
      { status: 500 }
    )
  }
}


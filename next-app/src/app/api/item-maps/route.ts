import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/item-maps - 品目マッピング一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orgId = searchParams.get('org_id')
    const search = searchParams.get('search')
    const hazard = searchParams.get('hazard')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    // クエリ条件構築
    const where: any = {}
    
    if (orgId) {
      where.org_id = orgId
    }
    
    if (!includeDeleted) {
      where.deleted_at = null
    }
    
    if (hazard !== null && hazard !== undefined) {
      where.hazard = hazard === 'true'
    }
    
    if (search) {
      where.OR = [
        { item_label: { contains: search, mode: 'insensitive' } },
        { jwnet_code: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    const itemMaps = await prisma.item_maps.findMany({
      where,
      orderBy: { item_label: 'asc' },
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

    return NextResponse.json({
      data: itemMaps,
      count: itemMaps.length,
    })
  } catch (error) {
    console.error('[API] Failed to fetch item maps:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch item maps' },
      { status: 500 }
    )
  }
}

// POST /api/item-maps - 品目マッピング作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      org_id: z.string().uuid('Invalid organization ID'),
      item_label: z.string().min(1, 'Item label is required').max(255),
      jwnet_code: z.string().max(50).optional(),
      hazard: z.boolean().default(false),
      default_unit: z.enum(['L', 'T', 'KG', 'M3', 'PCS']).optional(),
      density_t_per_m3: z.number().optional(),
      disposal_method_code: z.string().max(50).optional(),
      notes: z.string().optional(),
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

    // 重複チェック（同じorg_id + item_label）
    const existing = await prisma.item_maps.findFirst({
      where: {
        org_id: validatedData.org_id,
        item_label: validatedData.item_label,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Item label already exists in this organization' },
        { status: 409 }
      )
    }

    // 作成
    const itemMap = await prisma.item_maps.create({
      data: {
        ...validatedData,
        updated_by: validatedData.created_by,
      },
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
      { data: itemMap, message: 'Item map created successfully' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to create item map:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create item map' },
      { status: 500 }
    )
  }
}


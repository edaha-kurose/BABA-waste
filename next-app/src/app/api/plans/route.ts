import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/plans - 予定一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orgId = searchParams.get('org_id')
    const storeId = searchParams.get('store_id')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    // クエリ条件構築
    const where: any = {}
    
    if (orgId) {
      where.org_id = orgId
    }
    
    if (storeId) {
      where.store_id = storeId
    }
    
    if (status) {
      where.status = status
    }
    
    if (!includeDeleted) {
      where.deleted_at = null
    }
    
    if (fromDate || toDate) {
      where.planned_pickup_date = {}
      if (fromDate) {
        where.planned_pickup_date.gte = new Date(fromDate)
      }
      if (toDate) {
        where.planned_pickup_date.lte = new Date(toDate)
      }
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: { planned_pickup_date: 'asc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        store: {
          select: {
            id: true,
            store_code: true,
            name: true,
            address: true,
          },
        },
        _count: {
          select: {
            collectionRequests: true,
          },
        },
      },
    })

    return NextResponse.json({
      data: plans,
      count: plans.length,
    })
  } catch (error) {
    console.error('[API] Failed to fetch plans:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}

// POST /api/plans - 予定作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      org_id: z.string().uuid('Invalid organization ID'),
      store_id: z.string().uuid('Invalid store ID'),
      planned_pickup_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }),
      item_name: z.string().min(1, 'Item name is required').max(255),
      planned_quantity: z.number().positive('Quantity must be positive'),
      unit: z.string().min(1, 'Unit is required').max(10),
      area_or_city: z.string().max(100).optional(),
      notes: z.string().optional(),
      status: z.enum(['pending', 'approved', 'rejected', 'completed']).default('pending'),
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

    // 店舗の存在確認
    const store = await prisma.store.findUnique({
      where: { id: validatedData.store_id },
    })

    if (!store || store.deleted_at || store.org_id !== validatedData.org_id) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Store not found or does not belong to this organization' },
        { status: 404 }
      )
    }

    // 作成
    const plan = await prisma.plan.create({
      data: {
        ...validatedData,
        planned_pickup_date: new Date(validatedData.planned_pickup_date),
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
        store: {
          select: {
            id: true,
            store_code: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(
      { data: plan, message: 'Plan created successfully' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to create plan:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create plan' },
      { status: 500 }
    )
  }
}


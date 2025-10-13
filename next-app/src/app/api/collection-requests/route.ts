import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/collection-requests - 収集依頼一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orgId = searchParams.get('org_id')
    const storeId = searchParams.get('store_id')
    const planId = searchParams.get('plan_id')
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
    
    if (planId) {
      where.plan_id = planId
    }
    
    if (status) {
      where.status = status
    }
    
    if (!includeDeleted) {
      where.deleted_at = null
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

    const requests = await prisma.collectionRequest.findMany({
      where,
      orderBy: { request_date: 'desc' },
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
        plan: {
          select: {
            id: true,
            item_name: true,
            planned_quantity: true,
            unit: true,
            planned_pickup_date: true,
          },
        },
        collections: {
          where: { deleted_at: null },
          select: {
            id: true,
            status: true,
            actual_pickup_date: true,
            actual_quantity: true,
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
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch collection requests' },
      { status: 500 }
    )
  }
}

// POST /api/collection-requests - 収集依頼作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zodでバリデーション
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

    // 予定の存在確認
    const plan = await prisma.plan.findUnique({
      where: { id: validatedData.plan_id },
    })

    if (!plan || plan.deleted_at || plan.org_id !== validatedData.org_id) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Plan not found or does not belong to this organization' },
        { status: 404 }
      )
    }

    // 日付変換
    const requestData: any = {
      ...validatedData,
      request_date: new Date(validatedData.request_date),
      requested_pickup_date: new Date(validatedData.requested_pickup_date),
      updated_by: validatedData.created_by,
    }

    if (validatedData.confirmed_pickup_date) {
      requestData.confirmed_pickup_date = new Date(validatedData.confirmed_pickup_date)
    }

    // 作成
    const collectionRequest = await prisma.collectionRequest.create({
      data: requestData,
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
        plan: {
          select: {
            id: true,
            item_name: true,
          },
        },
      },
    })

    return NextResponse.json(
      { data: collectionRequest, message: 'Collection request created successfully' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to create collection request:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create collection request' },
      { status: 500 }
    )
  }
}


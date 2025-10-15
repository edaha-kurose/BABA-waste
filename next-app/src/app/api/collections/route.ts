import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/collections - 実績一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orgId = searchParams.get('org_id')
    const storeId = searchParams.get('store_id')
    const collectorId = searchParams.get('collector_id')
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

    const collections = await prisma.collections.findMany({
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

    return NextResponse.json({
      data: collections,
      count: collections.length,
    })
  } catch (error) {
    console.error('[API] Failed to fetch collections:', error)
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1')
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Failed to fetch collections',
        details: isLocal ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    )
  }
}

// POST /api/collections - 実績作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zodでバリデーション
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
      created_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 組織の存在確認
    const organization = await prisma.organization.findUnique({
      where: { id: validatedData.org_id },
    })

    if (!organization ) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Organization not found' },
        { status: 404 }
      )
    }

    // 店舗の存在確認
    const store = await prisma.store.findUnique({
      where: { id: validatedData.store_id },
    })

    if (!store  || store.org_id !== validatedData.org_id) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Store not found or does not belong to this organization' },
        { status: 404 }
      )
    }

    // 収集依頼の存在確認
    const collectionRequest = await prisma.collection_requests.findUnique({
      where: { id: validatedData.collection_request_id },
    })

    if (!collectionRequest  || collectionRequest.org_id !== validatedData.org_id) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Collection request not found or does not belong to this organization' },
        { status: 404 }
      )
    }

    // 日付変換
    const collectionData: any = {
      ...validatedData,
      actual_pickup_date: new Date(validatedData.actual_pickup_date),
      updated_by: validatedData.created_by,
    }

    if (validatedData.collected_at) {
      collectionData.collected_at = new Date(validatedData.collected_at)
    }

    // 作成
    const collection = await prisma.collections.create({
      data: collectionData,
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
        collection_requests: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(
      { data: collection, message: 'Collection created successfully' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to create collection:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create collection' },
      { status: 500 }
    )
  }
}


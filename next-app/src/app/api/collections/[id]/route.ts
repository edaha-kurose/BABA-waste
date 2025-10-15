import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/collections/[id] - 実績詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collection = await prisma.collections.findUnique({
      where: { id: params.id },
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
            phone: true,
          },
        },
        collection_requests: {
          select: {
            id: true,
            status: true,
            request_date: true,
            plan: {
              select: {
                id: true,
                item_name: true,
                planned_quantity: true,
                unit: true,
              },
            },
          },
        },
      },
    })

    if (!collection || collection.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Collection not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: collection })
  } catch (error) {
    console.error('[API] Failed to fetch collection:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch collection' },
      { status: 500 }
    )
  }
}

// PATCH /api/collections/[id] - 実績更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      actual_pickup_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }).optional(),
      actual_pickup_time: z.string().min(1).max(50).optional(),
      actual_quantity: z.number().positive().optional(),
      quantity: z.number().positive().optional(),
      unit: z.string().min(1).max(10).optional(),
      driver_name: z.string().max(255).optional(),
      vehicle_number: z.string().max(50).optional(),
      notes: z.string().optional(),
      status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED', 'COLLECTED', 'SCHEDULED', 'IN_PROGRESS', 'VERIFIED']).optional(),
      jwnet_registration_id: z.string().max(255).optional(),
      collected_at: z.string().optional().nullable(),
      updated_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    const existing = await prisma.collections.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Collection not found' },
        { status: 404 }
      )
    }

    // 日付変換
    const updateData: any = { ...validatedData }
    if (validatedData.actual_pickup_date) {
      updateData.actual_pickup_date = new Date(validatedData.actual_pickup_date)
    }
    if (validatedData.collected_at !== undefined) {
      updateData.collected_at = validatedData.collected_at ? new Date(validatedData.collected_at) : null
    }

    // 更新
    const collection = await prisma.collections.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({
      data: collection,
      message: 'Collection updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to update collection:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update collection' },
      { status: 500 }
    )
  }
}

// DELETE /api/collections/[id] - 実績削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const updated_by = searchParams.get('updated_by') || undefined

    // 存在チェック
    const existing = await prisma.collections.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Collection not found' },
        { status: 404 }
      )
    }

    // 論理削除
    const collection = await prisma.collections.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        updated_by,
      },
    })

    return NextResponse.json({
      data: collection,
      message: 'Collection deleted successfully',
    })
  } catch (error) {
    console.error('[API] Failed to delete collection:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete collection' },
      { status: 500 }
    )
  }
}


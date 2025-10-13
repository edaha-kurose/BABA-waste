import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/collection-requests/[id] - 収集依頼詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const collectionRequest = await prisma.collectionRequest.findUnique({
      where: { id: params.id },
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
            phone: true,
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
          orderBy: { actual_pickup_date: 'desc' },
          select: {
            id: true,
            status: true,
            actual_pickup_date: true,
            actual_pickup_time: true,
            actual_quantity: true,
            quantity: true,
            unit: true,
          },
        },
      },
    })

    if (!collectionRequest || collectionRequest.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Collection request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: collectionRequest })
  } catch (error) {
    console.error('[API] Failed to fetch collection request:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch collection request' },
      { status: 500 }
    )
  }
}

// PATCH /api/collection-requests/[id] - 収集依頼更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      request_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }).optional(),
      requested_pickup_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }).optional(),
      confirmed_pickup_date: z.string().optional().nullable(),
      status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'COLLECTED']).optional(),
      notes: z.string().optional(),
      updated_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    const existing = await prisma.collectionRequest.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Collection request not found' },
        { status: 404 }
      )
    }

    // 日付変換
    const updateData: any = { ...validatedData }
    if (validatedData.request_date) {
      updateData.request_date = new Date(validatedData.request_date)
    }
    if (validatedData.requested_pickup_date) {
      updateData.requested_pickup_date = new Date(validatedData.requested_pickup_date)
    }
    if (validatedData.confirmed_pickup_date !== undefined) {
      updateData.confirmed_pickup_date = validatedData.confirmed_pickup_date 
        ? new Date(validatedData.confirmed_pickup_date) 
        : null
    }

    // 更新
    const collectionRequest = await prisma.collectionRequest.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({
      data: collectionRequest,
      message: 'Collection request updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to update collection request:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update collection request' },
      { status: 500 }
    )
  }
}

// DELETE /api/collection-requests/[id] - 収集依頼削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const updated_by = searchParams.get('updated_by') || undefined

    // 存在チェック
    const existing = await prisma.collectionRequest.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Collection request not found' },
        { status: 404 }
      )
    }

    // 論理削除
    const collectionRequest = await prisma.collectionRequest.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        updated_by,
      },
    })

    return NextResponse.json({
      data: collectionRequest,
      message: 'Collection request deleted successfully',
    })
  } catch (error) {
    console.error('[API] Failed to delete collection request:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete collection request' },
      { status: 500 }
    )
  }
}


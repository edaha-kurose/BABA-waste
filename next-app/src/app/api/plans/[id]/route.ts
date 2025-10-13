import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/plans/[id] - 予定詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const plan = await prisma.plan.findUnique({
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
        itemMap: {
          select: {
            id: true,
            item_label: true,
            jwnet_code: true,
            hazard: true,
            default_unit: true,
            disposal_method_code: true,
          },
        },
        collectionRequests: {
          where: { deleted_at: null },
          orderBy: { request_date: 'desc' },
          select: {
            id: true,
            request_date: true,
            status: true,
            requested_pickup_date: true,
            confirmed_pickup_date: true,
          },
        },
      },
    })

    if (!plan || plan.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Plan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: plan })
  } catch (error) {
    console.error('[API] Failed to fetch plan:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch plan' },
      { status: 500 }
    )
  }
}

// PATCH /api/plans/[id] - 予定更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      planned_pickup_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }).optional(),
      item_name: z.string().min(1).max(255).optional(),
      planned_quantity: z.number().positive().optional(),
      unit: z.string().min(1).max(10).optional(),
      area_or_city: z.string().max(100).optional(),
      notes: z.string().optional(),
      status: z.enum(['pending', 'approved', 'rejected', 'completed']).optional(),
      updated_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    const existing = await prisma.plan.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Plan not found' },
        { status: 404 }
      )
    }

    // 日付変換
    const updateData: any = { ...validatedData }
    if (validatedData.planned_pickup_date) {
      updateData.planned_pickup_date = new Date(validatedData.planned_pickup_date)
    }

    // 更新
    const plan = await prisma.plan.update({
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
      },
    })

    return NextResponse.json({
      data: plan,
      message: 'Plan updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to update plan:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update plan' },
      { status: 500 }
    )
  }
}

// DELETE /api/plans/[id] - 予定削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const updated_by = searchParams.get('updated_by') || undefined

    // 存在チェック
    const existing = await prisma.plan.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Plan not found' },
        { status: 404 }
      )
    }

    // 論理削除
    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        updated_by,
      },
    })

    return NextResponse.json({
      data: plan,
      message: 'Plan deleted successfully',
    })
  } catch (error) {
    console.error('[API] Failed to delete plan:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete plan' },
      { status: 500 }
    )
  }
}


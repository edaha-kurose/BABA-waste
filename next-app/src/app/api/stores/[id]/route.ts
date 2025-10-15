import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/stores/[id] - 店舗詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await prisma.stores.findUnique({
      where: { id: params.id },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        plans: {
          orderBy: { planned_pickup_date: 'desc' },
          take: 10,
          select: {
            id: true,
            planned_pickup_date: true,
            item_name: true,
            planned_quantity: true,
            unit: true,
            status: true,
          },
        },
        _count: {
          select: {
            plans: true,
            collectionRequests: true,
            collections: true,
          },
        },
      },
    })

    if (!store || store.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Store not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: store })
  } catch (error) {
    console.error('[API] Failed to fetch store:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch store' },
      { status: 500 }
    )
  }
}

// PATCH /api/stores/[id] - 店舗更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      store_code: z.string().min(1).max(50).optional(),
      name: z.string().min(1).max(255).optional(),
      address: z.string().max(500).optional(),
      phone: z.string().max(50).optional(),
      postal_code: z.string().max(20).optional(),
      address1: z.string().max(255).optional(),
      address2: z.string().max(255).optional(),
      area: z.string().max(100).optional(),
      area_name: z.string().max(100).optional(),
      area_manager_code: z.string().max(50).optional(),
      emitter_no: z.string().max(50).optional(),
      opening_date: z.string().optional().nullable(),
      closing_date: z.string().optional().nullable(),
      is_active: z.boolean().optional(),
      is_temporary: z.boolean().optional(),
      is_managed: z.boolean().optional(),
      updated_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    const existing = await prisma.stores.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Store not found' },
        { status: 404 }
      )
    }

    // コード重複チェック（変更時）
    if (validatedData.store_code && validatedData.store_code !== existing.store_code) {
      const duplicate = await prisma.stores.findFirst({
        where: {
          org_id: existing.org_id,
          store_code: validatedData.store_code,
          deleted_at: null,
          NOT: { id: params.id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Store code already exists in this organization' },
          { status: 409 }
        )
      }
    }

    // 日付変換
    const updateData: any = { ...validatedData }

    if (validatedData.opening_date !== undefined) {
      updateData.opening_date = validatedData.opening_date ? new Date(validatedData.opening_date) : null
    }
    if (validatedData.closing_date !== undefined) {
      updateData.closing_date = validatedData.closing_date ? new Date(validatedData.closing_date) : null
    }

    // 更新
    const store = await prisma.stores.update({
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
      },
    })

    return NextResponse.json({
      data: store,
      message: 'Store updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to update store:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update store' },
      { status: 500 }
    )
  }
}

// DELETE /api/stores/[id] - 店舗削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const updated_by = searchParams.get('updated_by') || undefined

    // 存在チェック
    const existing = await prisma.stores.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Store not found' },
        { status: 404 }
      )
    }

    // 論理削除
    const store = await prisma.stores.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        updated_by,
      },
    })

    return NextResponse.json({
      data: store,
      message: 'Store deleted successfully',
    })
  } catch (error) {
    console.error('[API] Failed to delete store:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete store' },
      { status: 500 }
    )
  }
}


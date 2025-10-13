import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/item-maps/[id] - 品目マッピング詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemMap = await prisma.itemMap.findUnique({
      where: { id: params.id },
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

    if (!itemMap || itemMap.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Item map not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: itemMap })
  } catch (error) {
    console.error('[API] Failed to fetch item map:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch item map' },
      { status: 500 }
    )
  }
}

// PATCH /api/item-maps/[id] - 品目マッピング更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      item_label: z.string().min(1).max(255).optional(),
      jwnet_code: z.string().max(50).optional(),
      hazard: z.boolean().optional(),
      default_unit: z.enum(['L', 'T', 'KG', 'M3', 'PCS']).optional(),
      density_t_per_m3: z.number().optional().nullable(),
      disposal_method_code: z.string().max(50).optional(),
      notes: z.string().optional(),
      updated_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    const existing = await prisma.itemMap.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Item map not found' },
        { status: 404 }
      )
    }

    // ラベル重複チェック（変更時）
    if (validatedData.item_label && validatedData.item_label !== existing.item_label) {
      const duplicate = await prisma.itemMap.findFirst({
        where: {
          org_id: existing.org_id,
          item_label: validatedData.item_label,
          deleted_at: null,
          NOT: { id: params.id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Item label already exists in this organization' },
          { status: 409 }
        )
      }
    }

    // 更新
    const itemMap = await prisma.itemMap.update({
      where: { id: params.id },
      data: validatedData,
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
      data: itemMap,
      message: 'Item map updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to update item map:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update item map' },
      { status: 500 }
    )
  }
}

// DELETE /api/item-maps/[id] - 品目マッピング削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const updated_by = searchParams.get('updated_by') || undefined

    // 存在チェック
    const existing = await prisma.itemMap.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Item map not found' },
        { status: 404 }
      )
    }

    // 論理削除
    const itemMap = await prisma.itemMap.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        updated_by,
      },
    })

    return NextResponse.json({
      data: itemMap,
      message: 'Item map deleted successfully',
    })
  } catch (error) {
    console.error('[API] Failed to delete item map:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete item map' },
      { status: 500 }
    )
  }
}


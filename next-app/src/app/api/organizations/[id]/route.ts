import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/organizations/[id] - 組織詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        stores: {
          where: { deleted_at: null },
          select: {
            id: true,
            store_code: true,
            name: true,
            is_active: true,
          },
        },
        userOrgRoles: {
          select: {
            id: true,
            user_id: true,
            role: true,
          },
        },
      },
    })

    if (!organization || organization.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: organization })
  } catch (error) {
    console.error('[API] Failed to fetch organization:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

// PATCH /api/organizations/[id] - 組織更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      name: z.string().min(1).max(255).optional(),
      code: z.string().min(1).max(50).optional(),
      updated_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    const existing = await prisma.organization.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Organization not found' },
        { status: 404 }
      )
    }

    // コード重複チェック（変更時）
    if (validatedData.code && validatedData.code !== existing.code) {
      const duplicate = await prisma.organization.findUnique({
        where: { code: validatedData.code },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Organization code already exists' },
          { status: 409 }
        )
      }
    }

    // 更新
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: validatedData,
    })

    return NextResponse.json({
      data: organization,
      message: 'Organization updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to update organization:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update organization' },
      { status: 500 }
    )
  }
}

// DELETE /api/organizations/[id] - 組織削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const updated_by = searchParams.get('updated_by') || undefined

    // 存在チェック
    const existing = await prisma.organization.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Organization not found' },
        { status: 404 }
      )
    }

    // 論理削除
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        updated_by,
      },
    })

    return NextResponse.json({
      data: organization,
      message: 'Organization deleted successfully',
    })
  } catch (error) {
    console.error('[API] Failed to delete organization:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete organization' },
      { status: 500 }
    )
  }
}


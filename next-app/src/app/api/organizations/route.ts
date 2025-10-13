import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/organizations - 組織一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    const organizations = await prisma.organization.findMany({
      where: includeDeleted ? {} : { deleted_at: null },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        _count: {
          select: {
            stores: true,
            userOrgRoles: true,
          },
        },
      },
    })

    return NextResponse.json({
      data: organizations,
      count: organizations.length,
    })
  } catch (error) {
    console.error('[API] Failed to fetch organizations:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

// POST /api/organizations - 組織作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      name: z.string().min(1, 'Name is required').max(255),
      code: z.string().min(1, 'Code is required').max(50),
      created_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 重複チェック
    const existing = await prisma.organization.findUnique({
      where: { code: validatedData.code },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Organization code already exists' },
        { status: 409 }
      )
    }

    // 作成
    const organization = await prisma.organization.create({
      data: {
        name: validatedData.name,
        code: validatedData.code,
        created_by: validatedData.created_by,
        updated_by: validatedData.created_by,
      },
    })

    return NextResponse.json(
      { data: organization, message: 'Organization created successfully' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to create organization:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create organization' },
      { status: 500 }
    )
  }
}


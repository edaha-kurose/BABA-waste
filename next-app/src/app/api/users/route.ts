import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/users - ユーザー一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const orgId = searchParams.get('org_id')
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const isActive = searchParams.get('is_active')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'

    // クエリ条件構築
    const where: any = {}
    
    if (orgId) {
      where.user_org_roles = {
        some: {
          org_id: orgId,
          deleted_at: null,
        },
      }
    }
    
    if (role) {
      where.user_org_roles = {
        some: {
          role: role,
          deleted_at: null,
        },
      }
    }
    
    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === 'true'
    }
    
    if (!includeDeleted) {
      where.deleted_at = null
    }
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user_org_roles: {
          where: { deleted_at: null },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      data: users,
      count: users.length,
    })
  } catch (error) {
    console.error('[API] Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - ユーザー作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      email: z.string().email('Invalid email format'),
      name: z.string().min(1, 'Name is required').max(255),
      password: z.string().min(8, 'Password must be at least 8 characters').optional(),
      is_active: z.boolean().default(true),
      created_by: z.string().uuid().optional(),
      // Organization role
      org_id: z.string().uuid('Invalid organization ID'),
      role: z.enum(['ADMIN', 'EMITTER', 'TRANSPORTER', 'DISPOSER', 'COLLECTOR', 'USER']).default('USER'),
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

    // メールアドレス重複チェック
    const existingUser = await prisma.user.findFirst({
      where: {
        email: validatedData.email,
        deleted_at: null,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Email already exists' },
        { status: 409 }
      )
    }

    // トランザクションでユーザーと組織ロールを作成
    const result = await prisma.$transaction(async (tx) => {
      // ユーザー作成
      const user = await tx.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          is_active: validatedData.is_active,
          created_by: validatedData.created_by,
          updated_by: validatedData.created_by,
        },
      })

      // 組織ロール作成
      const userOrgRole = await tx.userOrgRole.create({
        data: {
          user_id: user.id,
          org_id: validatedData.org_id,
          role: validatedData.role,
          created_by: validatedData.created_by,
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
        },
      })

      return {
        ...user,
        user_org_roles: [userOrgRole],
      }
    })

    return NextResponse.json(
      { data: result, message: 'User created successfully' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to create user:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create user' },
      { status: 500 }
    )
  }
}


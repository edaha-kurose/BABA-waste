import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// GET /api/users - ユーザー一覧取得
export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const orgId = searchParams.get('org_id')
  const role = searchParams.get('role')
  const search = searchParams.get('search')
  const isActive = searchParams.get('is_active')
  const includeDeleted = searchParams.get('includeDeleted') === 'true'

  // 2. 権限チェック
  const targetOrgId = orgId || authUser.org_id
  if (targetOrgId && !authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json(
      { error: 'この組織のユーザーを閲覧する権限がありません' },
      { status: 403 }
    )
  }

  // 3. クエリ条件構築
  const where: any = {}
    
    if (orgId) {
      where.userOrgRoles = {
        some: {
          org_id: orgId,
        },
      }
    }
    
    if (role) {
      where.userOrgRoles = {
        some: {
          role: role,
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

  // 4. データ取得
  let users
  try {
    users = await prisma.app_users.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user_org_roles: {
          where: {},
          include: {
            organizations: {
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
  } catch (dbError) {
    console.error('[GET /api/users] Prisma検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: users,
    count: users.length,
  })
}

// POST /api/users - ユーザー作成
export async function POST(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // 2. JSONパース
  let body
  try {
    body = await request.json()
  } catch (parseError) {
    return NextResponse.json(
      { error: '不正なJSONフォーマットです' },
      { status: 400 }
    )
  }

  // 3. Zodバリデーション
  const schema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(1, 'Name is required').max(255),
    auth_user_id: z.string().uuid('Invalid auth user ID'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    is_active: z.boolean().default(true),
    // Organization role
    org_id: z.string().uuid('Invalid organization ID'),
    role: z.enum(['ADMIN', 'EMITTER', 'TRANSPORTER', 'DISPOSER']).default('EMITTER'),
  })

  let validatedData
  try {
    validatedData = schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 })
  }

  // 4. 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(validatedData.org_id)) {
    return NextResponse.json(
      { error: 'この組織にユーザーを作成する権限がありません' },
      { status: 403 }
    )
  }

  // 5. 組織の存在確認
  let organization
  try {
    organization = await prisma.organizations.findUnique({
      where: { id: validatedData.org_id },
    })
  } catch (dbError) {
    console.error('[POST /api/users] 組織検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (!organization || organization.deleted_at) {
    return NextResponse.json(
      { error: '組織が見つかりません' },
      { status: 404 }
    )
  }

  // 6. メールアドレス重複チェック
  let existingUser
  try {
    existingUser = await prisma.app_users.findFirst({
      where: {
        email: validatedData.email,
      },
    })
  } catch (dbError) {
    console.error('[POST /api/users] 重複チェックエラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (existingUser) {
    return NextResponse.json(
      { error: 'このメールアドレスは既に使用されています' },
      { status: 409 }
    )
  }

  // 7. トランザクションでユーザーと組織ロールを作成
  let result
  try {
    result = await prisma.$transaction(async (tx) => {
      // ユーザー作成
      const user = await tx.app_users.create({
        data: {
          auth_user_id: validatedData.auth_user_id,
          email: validatedData.email,
          name: validatedData.name,
          is_active: validatedData.is_active,
          created_by: authUser.id,
          updated_by: authUser.id,
        },
      })

      // 組織ロール作成
      const userOrgRole = await tx.user_org_roles.create({
        data: {
          user_id: user.id,
          org_id: validatedData.org_id,
          role: validatedData.role,
          created_by: authUser.id,
          updated_by: authUser.id,
        },
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

      return {
        ...user,
        user_org_roles: [userOrgRole],
      }
    })
  } catch (dbError) {
    console.error('[POST /api/users] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data: result, message: 'ユーザーを作成しました' },
    { status: 201 }
  )
}


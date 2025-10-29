import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// GET /api/organizations - 組織一覧取得
export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const includeDeleted = searchParams.get('includeDeleted') === 'true'

  // 2. 権限チェック（システム管理者のみ全組織閲覧可能、それ以外は自分の組織のみ）
  const where: any = {
    code: {
      not: null,
    },
  }

  if (!authUser.isSystemAdmin) {
    where.id = { in: authUser.org_ids }
  }

  // 3. データ取得
  let organizations
  try {
    organizations = await prisma.organizations.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            stores: true,
            user_org_roles: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[GET /api/organizations] Prisma検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: organizations,
    count: organizations.length,
  })
}

// POST /api/organizations - 組織作成
export async function POST(request: NextRequest) {
  // 1. 認証チェック（システム管理者のみ）
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  if (!authUser.isSystemAdmin) {
    return NextResponse.json(
      { error: '組織を作成する権限がありません（システム管理者のみ）' },
      { status: 403 }
    )
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
    name: z.string().min(1, 'Name is required').max(255),
    code: z.string().min(1, 'Code is required').max(50),
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

  // 4. 重複チェック
  let existing
  try {
    existing = await prisma.organizations.findFirst({
      where: { code: validatedData.code },
    })
  } catch (dbError) {
    console.error('[POST /api/organizations] 重複チェックエラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (existing) {
    return NextResponse.json(
      { error: 'この組織コードは既に使用されています' },
      { status: 409 }
    )
  }

  // 5. 作成
  let organization
  try {
    organization = await prisma.organizations.create({
      data: {
        name: validatedData.name,
        code: validatedData.code,
        created_by: authUser.id,
        updated_by: authUser.id,
      },
    })
  } catch (dbError) {
    console.error('[POST /api/organizations] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data: organization, message: '組織を作成しました' },
    { status: 201 }
  )
}


import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// クエリパラメータスキーマ
const QuerySchema = z.object({
  org_id: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  // 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // バリデーション
  let validatedParams
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    validatedParams = QuerySchema.parse(searchParams)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '不正なパラメータです' }, { status: 400 })
  }

  // 組織IDの決定（パラメータ指定 or ユーザーの所属組織）
  const targetOrgId = validatedParams.org_id || authUser.org_id

  if (!targetOrgId) {
    return NextResponse.json(
      { error: '組織IDが指定されていません' },
      { status: 400 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json(
      { error: 'この組織の回収業者を閲覧する権限がありません' },
      { status: 403 }
    )
  }

  // データベースクエリ
  let collectors
  try {
    collectors = await prisma.collectors.findMany({
      where: {
        org_id: targetOrgId,
        deleted_at: null,
      },
      orderBy: {
        company_name: 'asc',
      },
      select: {
        id: true,
        company_name: true,
        phone: true,
        email: true,
        contact_person: true,
      },
    })
  } catch (dbError) {
    console.error('[GET /api/collectors] DB検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: collectors })
}

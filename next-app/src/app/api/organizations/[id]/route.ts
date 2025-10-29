import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = params.id

    // ユーザーがアクセス権限を持つ組織かチェック
    if (!user.org_ids.includes(orgId)) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot access this organization' },
        { status: 403 }
      )
    }

    let organization
    try {
      organization = await prisma.organizations.findUnique({
      where: {
        id: orgId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        org_type: true,
        jwnet_subscriber_id: true,
        jwnet_public_confirmation_id: true,
        is_active: true,
        created_at: true,
      },
    });
    } catch (dbError) {
      console.error('[GET /api/organizations/[id]] Prisma検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: organization })
  } catch (error) {
    console.error('[Organizations Detail API] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

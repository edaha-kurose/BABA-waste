import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/organizations/managed-tenants
 * 
 * システム管理者が管理する全テナント（排出企業）一覧を取得
 * 
 * @returns {Array} 管理対象テナント一覧
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!user.isSystemAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: System admin only' },
      { status: 403 }
    );
  }

  // システム管理者が管理する全テナント（EMITTER型）を取得
  let tenants
  try {
    tenants = await prisma.organizations.findMany({
      where: {
        id: { in: user.org_ids },
        org_type: 'EMITTER',
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        org_type: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (dbError) {
    console.error('[GET /api/organizations/managed-tenants] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: tenants,
    meta: {
      total: tenants.length,
    },
  });
}

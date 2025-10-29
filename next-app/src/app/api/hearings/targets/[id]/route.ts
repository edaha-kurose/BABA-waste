import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

/**
 * GET /api/hearings/targets/[id]
 * ヒアリングターゲットの詳細を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const targetId = params.id

  let target
  try {
    target = await prisma.hearing_targets.findUnique({
      where: { id: targetId },
      include: {
        hearings: {
          select: {
            title: true,
            description: true,
            target_period_from: true,
            target_period_to: true,
            response_deadline: true,
            status: true,
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[GET /api/hearings/targets/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
  }

  if (!target) {
    return NextResponse.json({ error: 'Target not found' }, { status: 404 })
  }

  const formattedTarget = {
    id: target.id,
    hearing_id: target.hearing_id,
    company_name: target.company_name,
    store_name: target.store_name,
    item_name: target.item_name,
    response_status: target.response_status,
    responded_at: target.responded_at,
    hearing: target.hearings,
  }

  return NextResponse.json({ target: formattedTarget })
}

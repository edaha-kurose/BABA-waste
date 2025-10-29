import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

/**
 * GET /api/hearings/my-targets
 * ログイン中の業者に割り当てられたヒアリング対象を取得
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 業者IDを取得（collectorsテーブルから）
  let collector
  try {
    collector = await prisma.collectors.findFirst({
      where: {
        user_id: authUser.id,
      },
      select: {
        id: true,
      },
    });
  } catch (dbError) {
    console.error('[GET /api/hearings/my-targets] Prisma業者検索エラー:', dbError);
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
  }

  if (!collector) {
    return NextResponse.json({ targets: [] })
  }

  const collectorId = collector.id

  let targets
  try {
    targets = await prisma.hearing_targets.findMany({
      where: {
        collector_id: collectorId,
      },
      include: {
        hearings: {
          select: {
            title: true,
            target_period_from: true,
            target_period_to: true,
            response_deadline: true,
            status: true,
          },
        },
        _count: {
          select: {
            hearing_responses: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  } catch (dbError) {
    console.error('[GET /api/hearings/my-targets] Prismaターゲット検索エラー:', dbError);
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
  }

  const formattedTargets = targets.map((t) => ({
    id: t.id,
    hearing_id: t.hearing_id,
    company_name: t.company_name,
    store_name: t.store_name,
    item_name: t.item_name,
    response_status: t.response_status,
    responded_at: t.responded_at,
    hearing: t.hearings,
    responses_count: t._count.hearing_responses,
  }))

  return NextResponse.json({ targets: formattedTargets })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

const UnlockRequestSchema = z.object({
  request_reason: z.string().min(1, '理由は必須です'),
})

/**
 * GET /api/hearings/targets/[id]/unlock-requests
 * ロック解除申請の一覧を取得
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

  let requests
  try {
    requests = await prisma.hearing_unlock_requests.findMany({
      where: {
        hearing_target_id: targetId,
      },
      orderBy: {
        requested_at: 'desc',
      },
    });
  } catch (dbError) {
    console.error('[GET /api/hearings/targets/[id]/unlock-requests] Prisma検索エラー:', dbError);
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ requests })
}

/**
 * POST /api/hearings/targets/[id]/unlock-requests
 * ロック解除申請を作成
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    const targetId = params.id
    const validated = UnlockRequestSchema.parse(body)

    // ターゲットがLOCKED状態か確認
    let target
    try {
      target = await prisma.hearing_targets.findUnique({
        where: { id: targetId },
        select: { response_status: true },
      });
    } catch (dbError) {
      console.error('[POST /api/hearings/targets/[id]/unlock-requests] Prismaターゲット検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (!target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    if (target.response_status !== 'LOCKED') {
      return NextResponse.json(
        { error: 'Target is not locked' },
        { status: 400 }
      )
    }

    // トランザクション
    let result
    try {
      result = await prisma.$transaction(async (tx) => {
        // ロック解除申請作成
        const unlockRequest = await tx.hearing_unlock_requests.create({
          data: {
            hearing_target_id: targetId,
            requested_by: authUser.id,
            request_reason: validated.request_reason,
            status: 'PENDING',
          },
        })

        // ターゲットのステータスをUNLOCK_REQUESTEDに変更
        await tx.hearing_targets.update({
          where: { id: targetId },
          data: {
            response_status: 'UNLOCK_REQUESTED',
          },
        })

        return unlockRequest
      });
    } catch (dbError) {
      console.error('[POST /api/hearings/targets/[id]/unlock-requests] Prismaトランザクションエラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json({ unlockRequest: result }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to create unlock request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

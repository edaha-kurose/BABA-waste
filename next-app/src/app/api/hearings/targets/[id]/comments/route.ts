import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

const CommentSchema = z.object({
  comment: z.string().min(1, 'コメントは必須です'),
})

/**
 * GET /api/hearings/targets/[id]/comments
 * ヒアリングターゲットのコメントを取得
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

  let comments
  try {
    comments = await prisma.hearing_comments.findMany({
      where: {
        hearing_target_id: targetId,
        deleted_at: null,
      },
      orderBy: {
        created_at: 'asc',
      },
    });
  } catch (dbError) {
    console.error('[GET /api/hearings/targets/[id]/comments] Prisma検索エラー:', dbError);
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ comments })
}

/**
 * POST /api/hearings/targets/[id]/comments
 * コメントを投稿
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
    const validated = CommentSchema.parse(body)

    // ユーザーロール取得
    let userOrgRole
    try {
      userOrgRole = await prisma.user_org_roles.findFirst({
        where: { user_id: authUser.id },
        select: { role: true },
      });
    } catch (dbError) {
      console.error('[POST /api/hearings/targets/[id]/comments] Prismaロール検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    const userRole = (userOrgRole?.role as string) === 'COLLECTOR' ? 'COLLECTOR' : 'ADMIN'
    const userName = authUser.email || 'Unknown User'

    let comment
    try {
      comment = await prisma.hearing_comments.create({
        data: {
          hearing_target_id: targetId,
          comment: validated.comment,
          user_id: authUser.id,
          user_role: userRole,
          user_name: userName,
        },
      });
    } catch (dbError) {
      console.error('[POST /api/hearings/targets/[id]/comments] Prisma作成エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to create comment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

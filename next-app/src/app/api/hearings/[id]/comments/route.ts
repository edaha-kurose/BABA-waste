import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

const CommentCreateSchema = z.object({
  user_id: z.string().uuid(),
  hearing_target_id: z.string().uuid(),
  comment: z.string().min(1),
  user_role: z.enum(['ADMIN', 'COLLECTOR']),
  user_name: z.string(),
});

// POST: コメント投稿
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    const { id: hearingId } = params;
    const { user_id, hearing_target_id, comment, user_role, user_name } = CommentCreateSchema.parse(body);

    let commentRecord
    try {
      commentRecord = await prisma.hearing_comments.create({
        data: {
          hearing_target_id,
          user_id,
          user_role,
          user_name,
          comment,
          is_read_by_admin: user_role === 'ADMIN',
          is_read_by_collector: user_role === 'COLLECTOR',
        },
      });
    } catch (dbError) {
      console.error('[POST /api/hearings/[id]/comments] Prisma作成エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json(commentRecord, { status: 201 });
  } catch (error: any) {
    console.error('[Hearing Comments POST] エラー:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'バリデーションエラー', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'サーバーエラー', message: error.message }, { status: 500 });
  }
}

// GET: コメント取得
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { id: hearingId } = params;
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('target_id');

    let comments
    try {
      comments = await prisma.hearing_comments.findMany({
        where: {
          hearing_targets: {
            hearing_id: hearingId,
            ...(targetId && { id: targetId }),
          },
          deleted_at: null,
        },
        include: {
          hearing_targets: {
            select: {
              id: true,
              company_name: true,
              store_name: true,
              item_name: true,
            },
          },
        },
        orderBy: { created_at: 'asc' },
      });
    } catch (dbError) {
      console.error('[GET /api/hearings/[id]/comments] Prisma検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json(comments, { status: 200 });
  } catch (error: any) {
    console.error('[Hearing Comments GET] エラー:', error);
    return NextResponse.json({ error: 'サーバーエラー', message: error.message }, { status: 500 });
  }
}

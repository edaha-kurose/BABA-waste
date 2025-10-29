import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

const ResponseSubmitSchema = z.object({
  user_id: z.string().uuid(),
  responses: z.array(
    z.object({
      hearing_target_id: z.string().uuid(),
      target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      is_available: z.boolean(),
    })
  ),
});

// POST: 回答送信（業者側）
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
    const { user_id, responses } = ResponseSubmitSchema.parse(body);

    try {
      await prisma.$transaction(async (tx) => {
        for (const response of responses) {
          // 既存レコードを検索
          const existing = await tx.hearing_responses.findFirst({
            where: {
              hearing_target_id: response.hearing_target_id,
              target_date: new Date(response.target_date),
            },
          });

          if (existing) {
            // 更新
            await tx.hearing_responses.update({
              where: { id: existing.id },
              data: {
                is_available: response.is_available,
                responded_by: user_id,
                updated_at: new Date(),
              },
            });
          } else {
            // 作成
            await tx.hearing_responses.create({
              data: {
                hearing_target_id: response.hearing_target_id,
                target_date: new Date(response.target_date),
                is_available: response.is_available,
                responded_by: user_id,
              },
            });
          }
        }

        // 対象の回答状況を更新
        const targetIds = [...new Set(responses.map((r) => r.hearing_target_id))];
        await tx.hearing_targets.updateMany({
          where: { id: { in: targetIds } },
          data: {
            response_status: 'RESPONDED',
            responded_at: new Date(),
          },
        });
      });
    } catch (dbError) {
      console.error('[POST /api/hearings/[id]/responses] Prismaトランザクションエラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json({ message: '回答を送信しました', count: responses.length }, { status: 201 });
  } catch (error: any) {
    console.error('[Hearing Responses POST] エラー:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'バリデーションエラー', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'サーバーエラー', message: error.message }, { status: 500 });
  }
}

// GET: 回答取得
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { id: hearingId } = params;
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('target_id');

    let responses
    try {
      responses = await prisma.hearing_responses.findMany({
        where: {
          hearing_targets: {
            hearing_id: hearingId,
            ...(targetId && { id: targetId }),
          },
        },
        include: {
          hearing_targets: {
            select: {
              id: true,
              company_name: true,
              store_name: true,
              item_name: true,
              collectors: {
                select: {
                  company_name: true,
                },
              },
            },
          },
        },
        orderBy: [{ hearing_target_id: 'asc' }, { target_date: 'asc' }],
      });
    } catch (dbError) {
      console.error('[GET /api/hearings/[id]/responses] Prisma検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json(responses, { status: 200 });
  } catch (error: any) {
    console.error('[Hearing Responses GET] エラー:', error);
    return NextResponse.json({ error: 'サーバーエラー', message: error.message }, { status: 500 });
  }
}

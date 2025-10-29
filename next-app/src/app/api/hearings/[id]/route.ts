import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

const HearingUpdateSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  target_period_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  target_period_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  response_deadline: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'LOCKED', 'CLOSED']).optional(),
});

// GET: ヒアリング詳細取得
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = params;

  let hearing
  try {
    hearing = await prisma.hearings.findUnique({
      where: { id },
      include: {
        hearing_targets: {
          include: {
            collectors: {
              select: {
                id: true,
                company_name: true,
              },
            },
            stores: {
              select: {
                id: true,
                name: true,
                store_code: true,
              },
            },
            hearing_external_stores: {
              select: {
                id: true,
                store_name: true,
                store_code: true,
                company_name: true,
              },
            },
            store_items: {
              select: {
                id: true,
                item_name: true,
              },
            },
            hearing_external_store_items: {
              select: {
                id: true,
                item_name: true,
              },
            },
            hearing_responses: {
              select: {
                target_date: true,
                is_available: true,
              },
            },
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[GET /api/hearings/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!hearing) {
    return NextResponse.json({ error: 'ヒアリングが見つかりません' }, { status: 404 });
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(hearing.org_id)) {
    return NextResponse.json(
      { error: 'このヒアリングを閲覧する権限がありません' },
      { status: 403 }
    );
  }

  return NextResponse.json(hearing, { status: 200 });
}

// PATCH: ヒアリング更新
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = params;
  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    const { user_id, title, description, target_period_from, target_period_to, response_deadline, status } =
      HearingUpdateSchema.parse(body);

    // 存在と権限チェック
    let existingHearing
    try {
      existingHearing = await prisma.hearings.findUnique({
        where: { id },
        select: { org_id: true },
      });
    } catch (dbError) {
      console.error('[PATCH /api/hearings/[id]] Prisma検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!existingHearing) {
      return NextResponse.json({ error: 'ヒアリングが見つかりません' }, { status: 404 });
    }

    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existingHearing.org_id)) {
      return NextResponse.json(
        { error: 'このヒアリングを更新する権限がありません' },
        { status: 403 }
      );
    }

    let hearing
    try {
      hearing = await prisma.hearings.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(target_period_from && { target_period_from: new Date(target_period_from) }),
        ...(target_period_to && { target_period_to: new Date(target_period_to) }),
        ...(response_deadline && { response_deadline: new Date(response_deadline) }),
        ...(status && { status }),
        updated_by: user_id,
        updated_at: new Date(),
      },
    });
    } catch (dbError) {
      console.error('[PATCH /api/hearings/[id]] Prisma更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(hearing, { status: 200 });
  } catch (error: any) {
    console.error('[Hearing PATCH] エラー:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'バリデーションエラー', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'サーバーエラー', message: error.message }, { status: 500 });
  }
}

// DELETE: ヒアリング削除（論理削除）
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = params;

  // 存在と権限チェック
  let existingHearing
  try {
    existingHearing = await prisma.hearings.findUnique({
      where: { id },
      select: { org_id: true },
    });
  } catch (dbError) {
    console.error('[DELETE /api/hearings/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existingHearing) {
    return NextResponse.json({ error: 'ヒアリングが見つかりません' }, { status: 404 });
  }

  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existingHearing.org_id)) {
    return NextResponse.json(
      { error: 'このヒアリングを削除する権限がありません' },
      { status: 403 }
    );
  }

  try {
    await prisma.hearings.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  } catch (dbError) {
    console.error('[DELETE /api/hearings/[id]] Prisma削除エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'ヒアリングを削除しました' }, { status: 200 });
}







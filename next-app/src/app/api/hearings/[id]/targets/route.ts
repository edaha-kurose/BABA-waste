import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

const TargetGenerateSchema = z.object({
  user_id: z.string().uuid(),
  store_ids: z.array(z.string().uuid()).optional(),
  external_store_ids: z.array(z.string().uuid()).optional(),
  auto_generate: z.boolean().default(true),
});

// POST: ヒアリング対象生成（業者×店舗×品目）
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
    const { user_id, store_ids, external_store_ids, auto_generate } = TargetGenerateSchema.parse(body);

    let hearing
    try {
      hearing = await prisma.hearings.findUnique({
        where: { id: hearingId },
        select: { org_id: true },
      });
    } catch (dbError) {
      console.error('[POST /api/hearings/[id]/targets] Prisma検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (!hearing) {
      return NextResponse.json({ error: 'ヒアリングが見つかりません' }, { status: 404 });
    }

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(hearing.org_id)) {
      return NextResponse.json({ error: 'このヒアリングにアクセスする権限がありません' }, { status: 403 });
    }

    const targets: any[] = [];

    // A社店舗の品目を対象化
    if (auto_generate || (store_ids && store_ids.length > 0)) {
      let storeItems
      try {
        storeItems = await prisma.store_items.findMany({
          where: {
            org_id: hearing.org_id,
            is_active: true,
            deleted_at: null,
            ...(store_ids && store_ids.length > 0 && { store_id: { in: store_ids } }),
          },
          include: {
            stores: true,
            collectors: true,
          },
        });
      } catch (dbError) {
        console.error('[POST /api/hearings/[id]/targets] Prisma店舗品目検索エラー:', dbError);
        return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
      }

      for (const item of storeItems) {
        if (!item.assigned_collector_id || !item.collectors) continue;

        targets.push({
          hearing_id: hearingId,
          collector_id: item.assigned_collector_id,
          store_id: item.store_id,
          store_item_id: item.id,
          external_store_id: null,
          external_store_item_id: null,
          company_name: 'A社',
          store_name: item.stores?.name || '',
          item_name: item.item_name,
          notification_status: 'PENDING',
          response_status: 'NOT_RESPONDED',
        });
      }
    }

    // 外部店舗の品目を対象化
    if (auto_generate || (external_store_ids && external_store_ids.length > 0)) {
      let externalStoreItems
      try {
        externalStoreItems = await prisma.hearing_external_store_items.findMany({
          where: {
            org_id: hearing.org_id,
            is_active: true,
            deleted_at: null,
            ...(external_store_ids && external_store_ids.length > 0 && { external_store_id: { in: external_store_ids } }),
          },
          include: {
            hearing_external_stores: true,
            collectors: true,
          },
        });
      } catch (dbError) {
        console.error('[POST /api/hearings/[id]/targets] Prisma外部店舗品目検索エラー:', dbError);
        return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
      }

      for (const item of externalStoreItems) {
        if (!item.assigned_collector_id || !item.collectors) continue;

        targets.push({
          hearing_id: hearingId,
          collector_id: item.assigned_collector_id,
          store_id: null,
          store_item_id: null,
          external_store_id: item.external_store_id,
          external_store_item_id: item.id,
          company_name: item.hearing_external_stores?.company_name || '',
          store_name: item.hearing_external_stores?.store_name || '',
          item_name: item.item_name,
          notification_status: 'PENDING',
          response_status: 'NOT_RESPONDED',
        });
      }
    }

    if (targets.length === 0) {
      return NextResponse.json({ message: '対象となる店舗品目がありません' }, { status: 200 });
    }

    try {
      await prisma.hearing_targets.createMany({
        data: targets,
        skipDuplicates: true,
      });
    } catch (dbError) {
      console.error('[POST /api/hearings/[id]/targets] Prisma作成エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json({ message: `${targets.length}件の対象を生成しました`, count: targets.length }, { status: 201 });
  } catch (error: any) {
    console.error('[Hearing Targets POST] エラー:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'バリデーションエラー', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'サーバーエラー', message: error.message }, { status: 500 });
  }
}

// GET: ヒアリング対象一覧取得
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { id: hearingId } = params;
    const { searchParams } = new URL(request.url);
    const collectorId = searchParams.get('collector_id');

    let targets
    try {
      targets = await prisma.hearing_targets.findMany({
        where: {
          hearing_id: hearingId,
          ...(collectorId && { collector_id: collectorId }),
        },
        include: {
          collectors: {
            select: {
              id: true,
              company_name: true,
            },
          },
          hearing_responses: {
            select: {
              target_date: true,
              is_available: true,
            },
          },
        },
        orderBy: [{ company_name: 'asc' }, { store_name: 'asc' }, { item_name: 'asc' }],
      });
    } catch (dbError) {
      console.error('[GET /api/hearings/[id]/targets] Prisma検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json(targets, { status: 200 });
  } catch (error: any) {
    console.error('[Hearing Targets GET] エラー:', error);
    return NextResponse.json({ error: 'サーバーエラー', message: error.message }, { status: 500 });
  }
}

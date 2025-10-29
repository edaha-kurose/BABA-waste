import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

const ItemCreateSchema = z.object({
  user_id: z.string().uuid(),
  item_name: z.string().min(1),
  item_code: z.string().optional(),
  sort_order: z.number().int().optional(),
  assigned_collector_id: z.string().uuid().optional(),
});

// POST: 外部店舗品目追加
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser || !authUser.org_id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    const { id: externalStoreId } = params;
    const { user_id, item_name, item_code, sort_order, assigned_collector_id } = ItemCreateSchema.parse(body);

    let store
    try {
      store = await prisma.hearing_external_stores.findUnique({
        where: { id: externalStoreId },
        select: { org_id: true },
      });
    } catch (dbError) {
      console.error('[POST /api/hearing-external-stores/[id]/items] Prisma検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (!store) {
      return NextResponse.json({ error: '外部店舗が見つかりません' }, { status: 404 });
    }

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(store.org_id)) {
      return NextResponse.json({ error: 'この外部店舗にアクセスする権限がありません' }, { status: 403 });
    }

    let item
    try {
      item = await prisma.hearing_external_store_items.create({
        data: {
          org_id: store.org_id,
          external_store_id: externalStoreId,
          item_name,
          item_code,
          sort_order: sort_order || 0,
          assigned_collector_id,
          created_by: user_id,
          updated_by: user_id,
        },
      });
    } catch (dbError) {
      console.error('[POST /api/hearing-external-stores/[id]/items] Prisma作成エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error('[External Store Items POST] エラー:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'バリデーションエラー', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'サーバーエラー', message: error.message }, { status: 500 });
  }
}

// GET: 外部店舗品目一覧取得
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser || !authUser.org_id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { id: externalStoreId } = params;

    // 外部店舗の存在確認と権限チェック
    let store
    try {
      store = await prisma.hearing_external_stores.findUnique({
        where: { id: externalStoreId },
        select: { org_id: true },
      });
    } catch (dbError) {
      console.error('[GET /api/hearing-external-stores/[id]/items] Prisma検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (!store) {
      return NextResponse.json({ error: '外部店舗が見つかりません' }, { status: 404 });
    }

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(store.org_id)) {
      return NextResponse.json({ error: 'この外部店舗にアクセスする権限がありません' }, { status: 403 });
    }

    let items
    try {
      items = await prisma.hearing_external_store_items.findMany({
        where: {
          external_store_id: externalStoreId,
          deleted_at: null,
        },
        include: {
          collectors: {
            select: {
              id: true,
              company_name: true,
            },
          },
        },
        orderBy: { sort_order: 'asc' },
      });
    } catch (dbError) {
      console.error('[GET /api/hearing-external-stores/[id]/items] Prisma取得エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json(items, { status: 200 });
  } catch (error: any) {
    console.error('[External Store Items GET] エラー:', error);
    return NextResponse.json({ error: 'サーバーエラー', message: error.message }, { status: 500 });
  }
}

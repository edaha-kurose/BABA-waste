import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

const ItemSchema = z.object({
  item_name: z.string().min(1, '品目名は必須です'),
  item_code: z.string().optional(),
  sort_order: z.number().int().default(0),
  assigned_collector_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
})

/**
 * GET /api/stores/[id]/items
 * A社店舗の品目一覧を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storeId = params.id

    // 店舗の org_id を確認
    let store;
    try {
      store = await prisma.stores.findUnique({
        where: { id: storeId },
        select: { org_id: true },
      });
    } catch (dbError) {
      console.error('[Store Items GET] Database error - store fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // 権限チェック: システム管理者または同じ組織のユーザー
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(store.org_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let items;
    try {
      items = await prisma.store_items.findMany({
        where: {
          store_id: storeId,
          deleted_at: null,
        },
        orderBy: {
          sort_order: 'asc',
        },
      });
    } catch (dbError) {
      console.error('[Store Items GET] Database error - items fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('[Store Items GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stores/[id]/items
 * A社店舗に品目を追加
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storeId = params.id

    // JSON パースエラーハンドリング
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Store Items POST] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Zod バリデーション
    let validated;
    try {
      validated = ItemSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    // 店舗存在チェック + 権限チェック
    let store;
    try {
      store = await prisma.stores.findUnique({
        where: { id: storeId },
        select: { org_id: true },
      });
    } catch (dbError) {
      console.error('[Store Items POST] Database error - store fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // 権限チェック: システム管理者または同じ組織のユーザー
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(store.org_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let item;
    try {
      item = await prisma.store_items.create({
        data: {
          org_id: store.org_id,
          store_id: storeId,
          item_name: validated.item_name,
          item_code: validated.item_code || null,
          sort_order: validated.sort_order,
          assigned_collector_id: validated.assigned_collector_id || null,
          is_active: validated.is_active,
          created_by: authUser.id,
        },
      });
    } catch (dbError) {
      console.error('[Store Items POST] Database error - item create:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('[Store Items POST] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


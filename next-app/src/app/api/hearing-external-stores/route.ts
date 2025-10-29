import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

const ExternalStoreCreateSchema = z.object({
  org_id: z.string().uuid(),
  company_name: z.string().min(1),
  store_code: z.string().min(1),
  store_name: z.string().min(1),
  address: z.string().optional(),
  primary_collector_id: z.string().uuid().optional(),
});

// GET: 外部店舗一覧取得
export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orgIdParam = searchParams.get('org_id');

  const targetOrgId = orgIdParam || authUser.org_id;
  if (!targetOrgId) {
    return NextResponse.json({ error: '組織IDは必須です' }, { status: 400 });
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json(
      { error: 'この組織の外部店舗を閲覧する権限がありません' },
      { status: 403 }
    );
  }

  let stores
  try {
    stores = await prisma.hearing_external_stores.findMany({
      where: {
        org_id: targetOrgId,
        deleted_at: null,
      },
      include: {
        collectors: {
          select: {
            id: true,
            company_name: true,
          },
        },
        hearing_external_store_items: {
          where: { deleted_at: null },
          select: {
            id: true,
            item_name: true,
            sort_order: true,
          },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: [{ company_name: 'asc' }, { store_code: 'asc' }],
    });
  } catch (dbError) {
    console.error('[GET /api/hearing-external-stores] Prisma検索エラー:', dbError);
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json(stores, { status: 200 });
}

// POST: 外部店舗新規作成
export async function POST(request: NextRequest) {
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

  let validatedData
  try {
    validatedData = ExternalStoreCreateSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'バリデーションエラー', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 });
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(validatedData.org_id)) {
    return NextResponse.json(
      { error: 'この組織の外部店舗を作成する権限がありません' },
      { status: 403 }
    );
  }

  let store
  try {
    store = await prisma.hearing_external_stores.create({
      data: {
        org_id: validatedData.org_id,
        company_name: validatedData.company_name,
        store_code: validatedData.store_code,
        store_name: validatedData.store_name,
        address: validatedData.address,
        primary_collector_id: validatedData.primary_collector_id,
        created_by: authUser.id,
        updated_by: authUser.id,
      },
    });
  } catch (dbError) {
    console.error('[POST /api/hearing-external-stores] Prisma作成エラー:', dbError);
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json(store, { status: 201 });
}



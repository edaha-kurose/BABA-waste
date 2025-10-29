import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// Zodバリデーションスキーマ
const actualUpdateSchema = z.object({
  actual_qty: z.number().positive().optional(),
  unit: z.enum(['T', 'KG', 'M3']).optional(),
  vehicle_no: z.string().optional(),
  driver_name: z.string().optional(),
  weighing_ticket_no: z.string().optional(),
  photo_urls: z.array(z.string()).optional(),
})

// GET: 実績詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = params

  let actual
  try {
    actual = await prisma.actuals.findUnique({
      where: { id },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        plans: {
          select: {
            id: true,
            planned_date: true,
            planned_qty: true,
            unit: true,
            stores: {
              select: {
                id: true,
                store_code: true,
                name: true,
                address: true,
              },
            },
            item_maps: {
              select: {
                id: true,
                item_label: true,
                jwnet_code: true,
                hazard: true,
              },
            },
          },
        },
      },
    })

  } catch (dbError) {
    console.error('[GET /api/actuals/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!actual || actual.deleted_at) {
    return NextResponse.json(
      { error: '実績が見つかりません' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(actual.org_id)) {
    return NextResponse.json(
      { error: 'この実績を閲覧する権限がありません' },
      { status: 403 }
    );
  }

  return NextResponse.json(actual)
}

// PUT: 実績更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = params
  
  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  // 存在確認
  let existing
  try {
    existing = await prisma.actuals.findUnique({
      where: { id },
    });
  } catch (dbError) {
    console.error('[PUT /api/actuals/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existing || existing.deleted_at) {
    return NextResponse.json(
      { error: '実績が見つかりません' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existing.org_id)) {
    return NextResponse.json(
      { error: 'この実績を更新する権限がありません' },
      { status: 403 }
    );
  }

  // バリデーション
  let validatedData
  try {
    validatedData = actualUpdateSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 });
  }

  // 更新
  let actual
  try {
    actual = await prisma.actuals.update({
      where: { id },
      data: {
        ...validatedData,
        updated_by: authUser.id,
        updated_at: new Date(),
      },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        plans: {
          select: {
            id: true,
            planned_date: true,
            planned_qty: true,
            stores: {
              select: {
                id: true,
                store_code: true,
                name: true,
              },
            },
            item_maps: {
              select: {
                id: true,
                item_label: true,
              },
            },
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[PUT /api/actuals/[id]] Prisma更新エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json(actual)
}

// DELETE: 実績論理削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = params

  // 存在確認
  let existing
  try {
    existing = await prisma.actuals.findUnique({
      where: { id },
    });
  } catch (dbError) {
    console.error('[DELETE /api/actuals/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existing || existing.deleted_at) {
    return NextResponse.json(
      { error: '実績が見つかりません' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existing.org_id)) {
    return NextResponse.json(
      { error: 'この実績を削除する権限がありません' },
      { status: 403 }
    );
  }

  // 論理削除
  let actual
  try {
    actual = await prisma.actuals.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  } catch (dbError) {
    console.error('[DELETE /api/actuals/[id]] Prisma削除エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: '実績を削除しました',
    id: actual.id,
  })
}








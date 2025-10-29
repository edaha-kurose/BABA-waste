import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// GET /api/stores/[id] - 店舗詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let store
  try {
    store = await prisma.stores.findUnique({
      where: { id: params.id },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        plans: {
          orderBy: { planned_date: 'desc' },
          take: 10,
          select: {
            id: true,
            planned_date: true,
            planned_qty: true,
            unit: true,
            earliest_pickup_date: true,
          },
        },
        _count: {
          select: {
            plans: true,
            collection_requests: true,
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[GET /api/stores/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!store || store.deleted_at) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Store not found' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(store.org_id)) {
    return NextResponse.json(
      { error: 'この店舗を閲覧する権限がありません' },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: store })
}

// PATCH /api/stores/[id] - 店舗更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Zodでバリデーション
    const schema = z.object({
      store_code: z.string().min(1).max(50).optional(),
      name: z.string().min(1).max(255).optional(),
      address: z.string().max(500).optional(),
      phone: z.string().max(50).optional(),
      postal_code: z.string().max(20).optional(),
      address1: z.string().max(255).optional(),
      address2: z.string().max(255).optional(),
      area: z.string().max(100).optional(),
      area_name: z.string().max(100).optional(),
      area_manager_code: z.string().max(50).optional(),
      emitter_no: z.string().max(50).optional(),
      opening_date: z.string().optional().nullable(),
      closing_date: z.string().optional().nullable(),
      is_active: z.boolean().optional(),
      is_temporary: z.boolean().optional(),
      is_managed: z.boolean().optional(),
      updated_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    let existing
    try {
      existing = await prisma.stores.findUnique({
        where: { id: params.id },
      });
    } catch (dbError) {
      console.error('[PATCH /api/stores/[id]] Prisma検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Store not found' },
        { status: 404 }
      )
    }

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existing.org_id)) {
      return NextResponse.json(
        { error: 'この店舗を更新する権限がありません' },
        { status: 403 }
      );
    }

    // コード重複チェック（変更時）
    if (validatedData.store_code && validatedData.store_code !== existing.store_code) {
      const duplicate = await prisma.stores.findFirst({
        where: {
          org_id: existing.org_id,
          store_code: validatedData.store_code,
          deleted_at: null,
          NOT: { id: params.id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Store code already exists in this organization' },
          { status: 409 }
        )
      }
    }

    // 日付変換
    const updateData: any = { ...validatedData }

    if (validatedData.opening_date !== undefined) {
      updateData.opening_date = validatedData.opening_date ? new Date(validatedData.opening_date) : null
    }
    if (validatedData.closing_date !== undefined) {
      updateData.closing_date = validatedData.closing_date ? new Date(validatedData.closing_date) : null
    }

    // 更新
    let store
    try {
      store = await prisma.stores.update({
        where: { id: params.id },
        data: { ...updateData, updated_by: authUser.id },
        include: {
          organizations: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });
    } catch (dbError) {
      console.error('[PATCH /api/stores/[id]] Prisma更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: store,
      message: 'Store updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to update store:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update store' },
      { status: 500 }
    )
  }
}

// DELETE /api/stores/[id] - 店舗削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // 存在チェック
  let existing
  try {
    existing = await prisma.stores.findUnique({
      where: { id: params.id },
    });
  } catch (dbError) {
    console.error('[DELETE /api/stores/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existing || existing.deleted_at) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Store not found' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existing.org_id)) {
    return NextResponse.json(
      { error: 'この店舗を削除する権限がありません' },
      { status: 403 }
    );
  }

  // 論理削除
  let store
  try {
    store = await prisma.stores.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        updated_by: authUser.id,
      },
    });
  } catch (dbError) {
    console.error('[DELETE /api/stores/[id]] Prisma削除エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: store,
    message: 'Store deleted successfully',
  })
}


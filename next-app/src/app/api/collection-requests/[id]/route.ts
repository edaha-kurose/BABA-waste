import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// GET /api/collection-requests/[id] - 収集依頼詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let collectionRequest
  try {
    collectionRequest = await prisma.collection_requests.findUnique({
      where: { id: params.id },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        stores: {
          select: {
            id: true,
            store_code: true,
            name: true,
            address: true,
          },
        },
        collections: {
          orderBy: { collected_at: 'desc' },
          select: {
            id: true,
            collected_at: true,
            actual_qty: true,
            actual_unit: true,
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[GET /api/collection-requests/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!collectionRequest) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Collection request not found' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(collectionRequest.org_id)) {
    return NextResponse.json(
      { error: 'この収集依頼を閲覧する権限がありません' },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: collectionRequest })
}

// PATCH /api/collection-requests/[id] - 収集依頼更新
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
      request_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }).optional(),
      requested_pickup_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }).optional(),
      confirmed_pickup_date: z.string().optional().nullable(),
      status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'COLLECTED']).optional(),
      notes: z.string().optional(),
      updated_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    let existing
    try {
      existing = await prisma.collection_requests.findUnique({
        where: { id: params.id },
      });
    } catch (dbError) {
      console.error('[PATCH /api/collection-requests/[id]] Prisma検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Collection request not found' },
        { status: 404 }
      )
    }

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existing.org_id)) {
      return NextResponse.json(
        { error: 'この収集依頼を更新する権限がありません' },
        { status: 403 }
      );
    }

    // 日付変換
    const updateData: any = { ...validatedData }
    if (validatedData.request_date) {
      updateData.request_date = new Date(validatedData.request_date)
    }
    if (validatedData.requested_pickup_date) {
      updateData.requested_pickup_date = new Date(validatedData.requested_pickup_date)
    }
    if (validatedData.confirmed_pickup_date !== undefined) {
      updateData.confirmed_pickup_date = validatedData.confirmed_pickup_date 
        ? new Date(validatedData.confirmed_pickup_date) 
        : null
    }

    // 更新
    let collectionRequest
    try {
      collectionRequest = await prisma.collection_requests.update({
      where: { id: params.id },
      data: updateData,
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        stores: {
          select: {
            id: true,
            store_code: true,
            name: true,
          },
        },
      },
    });
    } catch (dbError) {
      console.error('[PATCH /api/collection-requests/[id]] Prisma更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: collectionRequest,
      message: 'Collection request updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to update collection request:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update collection request' },
      { status: 500 }
    )
  }
}

// DELETE /api/collection-requests/[id] - 収集依頼削除（論理削除）
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
    existing = await prisma.collection_requests.findUnique({
      where: { id: params.id },
    });
  } catch (dbError) {
    console.error('[DELETE /api/collection-requests/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Collection request not found' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existing.org_id)) {
    return NextResponse.json(
      { error: 'この収集依頼を削除する権限がありません' },
      { status: 403 }
    );
  }

  // 物理削除（deleted_atフィールドがないため）
  try {
    await prisma.collection_requests.delete({
      where: { id: params.id },
    });
  } catch (dbError) {
    console.error('[DELETE /api/collection-requests/[id]] Prisma削除エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'Collection request deleted successfully',
  })
}


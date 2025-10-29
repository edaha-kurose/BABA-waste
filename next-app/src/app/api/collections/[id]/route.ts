import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// GET /api/collections/[id] - 実績詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let collection
  try {
    collection = await prisma.collections.findUnique({
      where: { id: params.id },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        collection_requests: {
          select: {
            id: true,
            status: true,
            requested_at: true,
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[GET /api/collections/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!collection) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Collection not found' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(collection.org_id)) {
    return NextResponse.json(
      { error: 'この実績を閲覧する権限がありません' },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: collection })
}

// PATCH /api/collections/[id] - 実績更新
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
      actual_pickup_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format',
      }).optional(),
      actual_pickup_time: z.string().min(1).max(50).optional(),
      actual_quantity: z.number().positive().optional(),
      quantity: z.number().positive().optional(),
      unit: z.string().min(1).max(10).optional(),
      driver_name: z.string().max(255).optional(),
      vehicle_number: z.string().max(50).optional(),
      notes: z.string().optional(),
      status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED', 'COLLECTED', 'SCHEDULED', 'IN_PROGRESS', 'VERIFIED']).optional(),
      jwnet_registration_id: z.string().max(255).optional(),
      collected_at: z.string().optional().nullable(),
      updated_by: z.string().uuid().optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    let existing
    try {
      existing = await prisma.collections.findUnique({
        where: { id: params.id },
      });
    } catch (dbError) {
      console.error('[PATCH /api/collections/[id]] Prisma検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Collection not found' },
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

    // 日付変換
    const updateData: any = { ...validatedData }
    if (validatedData.actual_pickup_date) {
      updateData.actual_pickup_date = new Date(validatedData.actual_pickup_date)
    }
    if (validatedData.collected_at !== undefined) {
      updateData.collected_at = validatedData.collected_at ? new Date(validatedData.collected_at) : null
    }

    // 更新
    let collection
    try {
      collection = await prisma.collections.update({
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
          collection_requests: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });
    } catch (dbError) {
      console.error('[PATCH /api/collections/[id]] Prisma更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: collection,
      message: 'Collection updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to update collection:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update collection' },
      { status: 500 }
    )
  }
}

// DELETE /api/collections/[id] - 実績削除（物理削除）
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
    existing = await prisma.collections.findUnique({
      where: { id: params.id },
    });
  } catch (dbError) {
    console.error('[DELETE /api/collections/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Collection not found' },
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

  // 物理削除（deleted_atフィールドがないため）
  try {
    await prisma.collections.delete({
      where: { id: params.id },
    });
  } catch (dbError) {
    console.error('[DELETE /api/collections/[id]] Prisma削除エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'Collection deleted successfully',
  })
}


/**
 * 店舗-収集業者割り当てAPI（個別）
 * GET/PATCH/DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

const AssignmentUpdateSchema = z.object({
  priority: z.number().int().min(1).max(10).optional(),
  is_active: z.boolean().optional(),
})

/**
 * GET /api/store-assignments/[id]
 * 個別割り当て取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let assignment
  try {
    assignment = await prisma.store_collector_assignments.findUnique({
      where: { id: params.id },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            store_code: true,
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[GET /api/store-assignments/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!assignment) {
    return NextResponse.json(
      { error: 'Not Found', message: '割り当てが見つかりません' },
      { status: 404 }
    )
  }

  // 権限チェック: システム管理者または店舗の組織に属するユーザー
  const store = await prisma.stores.findUnique({
    where: { id: assignment.store_id },
    select: { org_id: true },
  });

  if (!authUser.isSystemAdmin && (!store || !authUser.org_ids.includes(store.org_id))) {
    return NextResponse.json(
      { error: 'この割り当てを閲覧する権限がありません' },
      { status: 403 }
    );
  }

  return NextResponse.json(assignment)
}

/**
 * PATCH /api/store-assignments/[id]
 * 割り当て更新
 */
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
    const validatedData = AssignmentUpdateSchema.parse(body)

    // 権限チェック: システム管理者のみ
    if (!authUser.isSystemAdmin) {
      return NextResponse.json(
        { error: 'システム管理者権限が必要です' },
        { status: 403 }
      );
    }

    let assignment
    try {
      assignment = await prisma.store_collector_assignments.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        updated_at: new Date(),
      },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            store_code: true,
          },
        },
      },
    });
    } catch (dbError) {
      console.error('[PATCH /api/store-assignments/[id]] Prisma更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('[StoreAssignmentsAPI] PATCH Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/store-assignments/[id]
 * 割り当て削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // 権限チェック: システム管理者のみ
  if (!authUser.isSystemAdmin) {
    return NextResponse.json(
      { error: 'システム管理者権限が必要です' },
      { status: 403 }
    );
  }

  try {
    await prisma.store_collector_assignments.delete({
      where: { id: params.id },
    });
  } catch (dbError) {
    console.error('[DELETE /api/store-assignments/[id]] Prisma削除エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true })
}











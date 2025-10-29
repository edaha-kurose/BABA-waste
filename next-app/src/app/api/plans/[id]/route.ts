// ============================================================================
// Plans API - 単一リソース
// GET/PUT/DELETE /api/plans/:id
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { planUpdateSchema } from '@/utils/validation/common'
import { z } from 'zod'

// GET /api/plans/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let plan
    try {
      plan = await prisma.plans.findUnique({
      where: {
        id: params.id,
        org_id: user.org_id,
        deleted_at: null,
      },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
          },
        },
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
            jwnet_code: true,
          },
        },
      },
    });
    } catch (dbError) {
      console.error('[GET /api/plans/[id]] Prisma検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('[Plans API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/plans/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    const validatedData = planUpdateSchema.parse(body)

    // 存在確認
    let existing
    try {
      existing = await prisma.plans.findUnique({
      where: {
        id: params.id,
        org_id: user.org_id,
        deleted_at: null,
      },
    });
    } catch (dbError) {
      console.error('[PUT /api/plans/[id]] Prisma検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // 更新
    let updated
    try {
      updated = await prisma.plans.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        planned_date: validatedData.planned_date ? new Date(validatedData.planned_date) : undefined,
        earliest_pickup_date: validatedData.earliest_pickup_date
          ? new Date(validatedData.earliest_pickup_date)
          : undefined,
        updated_at: new Date(),
        updated_by: user.id,
      },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
          },
        },
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
            jwnet_code: true,
          },
        },
      },
    });
    } catch (dbError) {
      console.error('[PUT /api/plans/[id]] Prisma更新エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Plans API] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/plans/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 存在確認
  let existing
  try {
    existing = await prisma.plans.findUnique({
      where: {
        id: params.id,
        org_id: user.org_id,
        deleted_at: null,
      },
    });
  } catch (dbError) {
    console.error('[DELETE /api/plans/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // 論理削除
  try {
    await prisma.plans.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        updated_by: user.id,
      },
    });
  } catch (dbError) {
    console.error('[DELETE /api/plans/[id]] Prisma削除エラー:', dbError);
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Plan deleted successfully' })
}

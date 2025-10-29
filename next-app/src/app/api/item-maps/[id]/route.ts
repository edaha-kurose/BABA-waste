import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// Zodバリデーションスキーマ
const itemMapUpdateSchema = z.object({
  item_label: z.string().min(1, '品目ラベルは必須です').optional(),
  jwnet_code: z.string().min(1, 'JWNETコードは必須です').optional(),
  hazard: z.boolean().optional(),
  default_unit: z.enum(['T', 'KG', 'M3']).optional(),
  density_t_per_m3: z.number().optional(),
  disposal_method_code: z.string().optional(),
  notes: z.string().optional(),
})

// GET: 品目マップ詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let itemMap
  try {
    const { id } = params

    itemMap = await prisma.item_maps.findUnique({
      where: {
        id,
      },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            plans: true,
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[GET /api/item-maps/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!itemMap || itemMap.deleted_at) {
    return NextResponse.json(
      { error: '品目マップが見つかりません' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(itemMap.org_id)) {
    return NextResponse.json(
      { error: 'この品目マップを閲覧する権限がありません' },
      { status: 403 }
    );
  }

  return NextResponse.json(itemMap)
}

// PUT: 品目マップ更新
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

  try {
    // バリデーション
    const validatedData = itemMapUpdateSchema.parse(body)

    // 存在確認
    let existing
    try {
      existing = await prisma.item_maps.findUnique({
        where: { id },
      });
    } catch (dbError) {
      console.error('[PUT /api/item-maps/[id]] Prisma検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: '品目マップが見つかりません' },
        { status: 404 }
      )
    }

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existing.org_id)) {
      return NextResponse.json(
        { error: 'この品目マップを更新する権限がありません' },
        { status: 403 }
      );
    }

    // 品目ラベル重複チェック（変更する場合）
    if (validatedData.item_label && validatedData.item_label !== existing.item_label) {
      let duplicate
      try {
        duplicate = await prisma.item_maps.findFirst({
        where: {
          org_id: existing.org_id,
          item_label: validatedData.item_label,
          deleted_at: null,
          id: {
            not: id,
          },
        },
      });
      } catch (dbError) {
        console.error('[PUT /api/item-maps/[id]] Prisma重複チェックエラー:', dbError);
        return NextResponse.json(
          { error: 'データベースエラーが発生しました' },
          { status: 500 }
        );
      }

      if (duplicate) {
        return NextResponse.json(
          { error: 'この品目ラベルは既に存在します' },
          { status: 409 }
        )
      }
    }

    // 更新
    let itemMap
    try {
      itemMap = await prisma.item_maps.update({
      where: { id },
      data: {
        ...validatedData,
        updated_by: body.updated_by || null,
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
      },
    });
    } catch (dbError) {
      console.error('[PUT /api/item-maps/[id]] Prisma更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(itemMap)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Item Maps API] PUT エラー:', error)
    return NextResponse.json(
      { error: '品目マップの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE: 品目マップ論理削除
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
    existing = await prisma.item_maps.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            plans: true,
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[DELETE /api/item-maps/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existing || existing.deleted_at) {
    return NextResponse.json(
      { error: '品目マップが見つかりません' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existing.org_id)) {
    return NextResponse.json(
      { error: 'この品目マップを削除する権限がありません' },
      { status: 403 }
    );
  }

  // 使用中チェック
  if (existing._count.plans > 0) {
      return NextResponse.json(
        { 
          error: 'この品目マップは予定で使用されているため削除できません',
          details: { plans_count: existing._count.plans }
        },
        { status: 409 }
      )
    }

    // 論理削除
    let itemMap
    try {
      itemMap = await prisma.item_maps.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
    } catch (dbError) {
      console.error('[DELETE /api/item-maps/[id]] Prisma削除エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: '品目マップを削除しました',
      id: itemMap.id 
    })
}

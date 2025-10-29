import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

// ============================================================================
// Zodバリデーションスキーマ
// ============================================================================

const UpdateItemSchema = z.object({
  total_quantity: z.number().positive().optional(),
  unit_price: z.number().nonnegative().optional(),
  collection_count: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// PUT: 年間報告書明細更新
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const user = await getAuthenticatedUser(request);
  if (!user || !user.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    // Zodバリデーション
    const validatedData = UpdateItemSchema.parse(body);

    // 親レポートの存在確認とorg_id分離
    let report
    try {
      report = await prisma.annual_waste_reports.findFirst({
        where: {
          id: params.id,
          org_id: user.org_id,
          deleted_at: null,
        },
      });
    } catch (dbError) {
      console.error('[PUT /api/annual-waste-reports/[id]/items/[itemId]] Prisma検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!report) {
      return NextResponse.json(
        { error: '年間報告書が見つかりません' },
        { status: 404 }
      );
    }

    // DRAFT以外は編集不可
    if (report.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'DRAFT状態の報告書のみ編集可能です' },
        { status: 400 }
      );
    }

    // 明細の存在確認
    let existingItem
    try {
      existingItem = await prisma.annual_waste_report_items.findFirst({
        where: {
          id: params.itemId,
          report_id: params.id,
          deleted_at: null,
        },
      });
    } catch (dbError) {
      console.error('[PUT /api/annual-waste-reports/[id]/items/[itemId]] Prisma明細検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!existingItem) {
      return NextResponse.json(
        { error: '明細が見つかりません' },
        { status: 404 }
      );
    }

    // 金額再計算
    const total_quantity = validatedData.total_quantity ?? existingItem.total_quantity;
    const unit_price = validatedData.unit_price ?? (existingItem.unit_price ? Number(existingItem.unit_price) : 0);
    const total_amount = Number(total_quantity) * unit_price;

    // Prismaトランザクションで更新
    let item
    try {
      item = await prisma.annual_waste_report_items.update({
        where: { id: params.itemId },
        data: {
          total_quantity: validatedData.total_quantity,
          unit_price: validatedData.unit_price,
          total_amount: validatedData.total_quantity !== undefined || validatedData.unit_price !== undefined
            ? total_amount
            : undefined,
          collection_count: validatedData.collection_count,
          notes: validatedData.notes,
          updated_by: user.id,
          updated_at: new Date(),
        },
        include: {
          store: true,
          collector: true,
          waste_type: true,
        },
      });
    } catch (dbError) {
      console.error('[PUT /api/annual-waste-reports/[id]/items/[itemId]] Prisma更新エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('年間報告書明細更新エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: 年間報告書明細削除（論理削除）
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const user = await getAuthenticatedUser(request);
  if (!user || !user.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 親レポートの存在確認とorg_id分離
  let report
  try {
    report = await prisma.annual_waste_reports.findFirst({
      where: {
        id: params.id,
        org_id: user.org_id,
        deleted_at: null,
      },
    });
  } catch (dbError) {
    console.error('[DELETE /api/annual-waste-reports/[id]/items/[itemId]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!report) {
    return NextResponse.json(
      { error: '年間報告書が見つかりません' },
      { status: 404 }
    );
  }

  // DRAFT以外は編集不可
  if (report.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'DRAFT状態の報告書のみ編集可能です' },
      { status: 400 }
    );
  }

  // 明細の存在確認
  let existingItem
  try {
    existingItem = await prisma.annual_waste_report_items.findFirst({
      where: {
        id: params.itemId,
        report_id: params.id,
        deleted_at: null,
      },
    });
  } catch (dbError) {
    console.error('[DELETE /api/annual-waste-reports/[id]/items/[itemId]] Prisma明細検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existingItem) {
    return NextResponse.json(
      { error: '明細が見つかりません' },
      { status: 404 }
    );
  }

  // Prismaトランザクションで論理削除
  try {
    await prisma.annual_waste_report_items.update({
      where: { id: params.itemId },
      data: { deleted_at: new Date() },
    });
  } catch (dbError) {
    console.error('[DELETE /api/annual-waste-reports/[id]/items/[itemId]] Prisma削除エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: '削除しました' });
}

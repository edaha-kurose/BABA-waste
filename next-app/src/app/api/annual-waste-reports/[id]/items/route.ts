import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

// ============================================================================
// Zodバリデーションスキーマ
// ============================================================================

const CreateItemSchema = z.object({
  store_id: z.string().uuid(),
  collector_id: z.string().uuid(),
  waste_type_id: z.string().uuid(),
  item_label: z.string().min(1).max(255),
  total_quantity: z.number().positive(),
  unit: z.string().min(1).max(10),
  unit_price: z.number().nonnegative().optional(),
  collection_count: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
});

// ============================================================================
// GET: 年間報告書明細一覧取得
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    console.error('[GET /api/annual-waste-reports/[id]/items] Prisma検索エラー:', dbError);
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

  // 明細取得
  let items
  try {
    items = await prisma.annual_waste_report_items.findMany({
      where: {
        report_id: params.id,
        deleted_at: null,
      },
      include: {
        store: {
          select: {
            id: true,
            store_code: true,
            name: true,
            address: true,
          },
        },
        collector: {
          select: {
            id: true,
            company_name: true,
            contact_person: true,
            phone: true,
          },
        },
        waste_type: {
          select: {
            id: true,
            waste_type_code: true,
            waste_type_name: true,
            unit_code: true,
            unit_price: true,
          },
        },
      },
      orderBy: [
        { store_id: 'asc' },
        { collector_id: 'asc' },
        { waste_type_id: 'asc' },
      ],
    });
  } catch (dbError) {
    console.error('[GET /api/annual-waste-reports/[id]/items] Prisma明細取得エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json(items);
}

// ============================================================================
// POST: 年間報告書明細作成
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const validatedData = CreateItemSchema.parse(body);

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
      console.error('[POST /api/annual-waste-reports/[id]/items] Prisma検索エラー:', dbError);
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

    // 関連マスタの存在確認（org_id分離）
    let store, collector, wasteType
    try {
      [store, collector, wasteType] = await Promise.all([
        prisma.stores.findFirst({
          where: { id: validatedData.store_id, org_id: user.org_id, deleted_at: null },
        }),
        prisma.collectors.findFirst({
          where: { id: validatedData.collector_id, org_id: user.org_id, deleted_at: null },
        }),
        prisma.waste_type_masters.findFirst({
          where: { id: validatedData.waste_type_id, org_id: user.org_id, deleted_at: null },
        }),
      ]);
    } catch (dbError) {
      console.error('[POST /api/annual-waste-reports/[id]/items] Prismaマスタ検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!store) {
      return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 });
    }
    if (!collector) {
      return NextResponse.json({ error: '収集業者が見つかりません' }, { status: 404 });
    }
    if (!wasteType) {
      return NextResponse.json({ error: '廃棄物種別が見つかりません' }, { status: 404 });
    }

    // 金額計算
    const unit_price = validatedData.unit_price ?? wasteType.unit_price ?? 0;
    const total_amount = validatedData.total_quantity * unit_price;

    // Prismaトランザクションで作成
    let item
    try {
      item = await prisma.annual_waste_report_items.create({
        data: {
          report_id: params.id,
          store_id: validatedData.store_id,
          collector_id: validatedData.collector_id,
          waste_type_id: validatedData.waste_type_id,
          item_label: validatedData.item_label,
          total_quantity: validatedData.total_quantity,
          unit: validatedData.unit,
          unit_price,
          total_amount,
          collection_count: validatedData.collection_count,
          notes: validatedData.notes,
          created_by: user.id,
        },
        include: {
          store: true,
          collector: true,
          waste_type: true,
        },
      });
    } catch (dbError) {
      console.error('[POST /api/annual-waste-reports/[id]/items] Prisma作成エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('年間報告書明細作成エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

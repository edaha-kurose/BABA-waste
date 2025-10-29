import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// GET: 年間報告書集計サマリー取得
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
      include: {
        items: {
          where: { deleted_at: null },
          include: {
            store: true,
            collector: true,
            waste_type: true,
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[GET /api/annual-waste-reports/[id]/summary] Prisma検索エラー:', dbError);
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

  // 集計計算
  const items = report.items;
  
  // 店舗別集計
  const byStore = items.reduce((acc, item) => {
    const key = item.store_id;
    if (!acc[key]) {
      acc[key] = {
        store: item.store,
        total_quantity: new Decimal(0),
        total_amount: new Decimal(0),
        item_count: 0,
      };
    }
    acc[key].total_quantity = acc[key].total_quantity.add(item.total_quantity);
    acc[key].total_amount = acc[key].total_amount.add(item.total_amount || 0);
    acc[key].item_count += 1;
    return acc;
  }, {} as Record<string, any>);

  // 収集業者別集計
  const byCollector = items.reduce((acc, item) => {
    const key = item.collector_id;
    if (!acc[key]) {
      acc[key] = {
        collector: item.collector,
        total_quantity: new Decimal(0),
        total_amount: new Decimal(0),
        item_count: 0,
      };
    }
    acc[key].total_quantity = acc[key].total_quantity.add(item.total_quantity);
    acc[key].total_amount = acc[key].total_amount.add(item.total_amount || 0);
    acc[key].item_count += 1;
    return acc;
  }, {} as Record<string, any>);

  // 廃棄物種別別集計
  const byWasteType = items.reduce((acc, item) => {
    const key = item.waste_type_id;
    if (!acc[key]) {
      acc[key] = {
        waste_type: item.waste_type,
        total_quantity: new Decimal(0),
        total_amount: new Decimal(0),
        item_count: 0,
      };
    }
    acc[key].total_quantity = acc[key].total_quantity.add(item.total_quantity);
    acc[key].total_amount = acc[key].total_amount.add(item.total_amount || 0);
    acc[key].item_count += 1;
    return acc;
  }, {} as Record<string, any>);

  // 全体集計
  const totalQuantity = items.reduce(
    (sum, item) => sum.add(item.total_quantity),
    new Decimal(0)
  );
  const totalAmount = items.reduce(
    (sum, item) => sum.add(item.total_amount || 0),
    new Decimal(0)
  );
  const totalCollections = items.reduce(
    (sum, item) => sum + item.collection_count,
    0
  );

  // Decimalを数値に変換
  const convertDecimal = (obj: any): any => {
    if (obj instanceof Decimal) {
      return obj.toNumber();
    }
    if (Array.isArray(obj)) {
      return obj.map(convertDecimal);
    }
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, convertDecimal(v)])
      );
    }
    return obj;
  };

  return NextResponse.json({
    report_id: report.id,
    fiscal_year: report.fiscal_year,
    report_type: report.report_type,
    status: report.status,
    period: {
      from: report.report_period_from,
      to: report.report_period_to,
    },
    summary: {
      total_items: items.length,
      total_quantity: totalQuantity.toNumber(),
      total_amount: totalAmount.toNumber(),
      total_collections: totalCollections,
    },
    by_store: convertDecimal(Object.values(byStore)),
    by_collector: convertDecimal(Object.values(byCollector)),
    by_waste_type: convertDecimal(Object.values(byWasteType)),
  });
}

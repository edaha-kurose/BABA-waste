import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// Zodバリデーションスキーマ
// ============================================================================

const GenerateReportSchema = z.object({
  fiscal_year: z.number().int().min(2000).max(2100),
  report_type: z.string().min(1).max(50).default('ANNUAL_GENERAL_WASTE'),
});

// ============================================================================
// POST: 年間報告書自動生成
// ============================================================================

export async function POST(request: NextRequest) {
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
    const validatedData = GenerateReportSchema.parse(body);

    // 年度期間（4月1日〜翌年3月31日）
    const periodFrom = new Date(validatedData.fiscal_year, 3, 1); // 4月1日
    const periodTo = new Date(validatedData.fiscal_year + 1, 2, 31); // 翌年3月31日

    // 既存の報告書チェック
    let existingReport
    try {
      existingReport = await prisma.annual_waste_reports.findFirst({
        where: {
          org_id: user.org_id,
          fiscal_year: validatedData.fiscal_year,
          report_type: validatedData.report_type,
          deleted_at: null,
        },
      });
    } catch (dbError) {
      console.error('[POST /api/annual-waste-reports/generate] Prisma既存報告書検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (existingReport) {
      return NextResponse.json(
        { 
          error: '同一年度・同一タイプの報告書が既に存在します',
          existing_report_id: existingReport.id,
        },
        { status: 400 }
      );
    }

    // 非JWNET廃棄物の収集実績を取得（jwnet_waste_code が NULL のもの）
    let collections
    try {
      collections = await prisma.collections.findMany({
        where: {
          org_id: user.org_id,
          collected_at: {
            gte: periodFrom,
            lte: periodTo,
          },
          // 非JWNETのみを対象（jwnet_registration_id が NULL）
          jwnet_registration_id: null,
        },
        include: {
          collection_requests: {
            include: {
              stores: true,
              waste_types: true,
            },
          },
        },
      });
    } catch (dbError) {
      console.error('[POST /api/annual-waste-reports/generate] Prisma収集実績検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (collections.length === 0) {
      return NextResponse.json(
        { error: '対象期間の非JWNET廃棄物の収集実績がありません' },
        { status: 404 }
      );
    }

    // 店舗×業者×廃棄物種別で集計
    interface AggregatedItem {
      store_id: string;
      collector_id: string;
      waste_type_id: string;
      item_label: string;
      total_quantity: Decimal;
      unit: string;
      unit_price: number | null;
      total_amount: Decimal;
      collection_count: number;
    }

    const aggregationMap = new Map<string, AggregatedItem>();

    for (const collection of collections) {
      const request = collection.collection_requests;
      if (!request) continue;

      const store_id = request.store_id;
      const collector_id = request.collector_id || 'unknown';
      
      // waste_type_id は collection_requests から取得
      // または collections の billing_items から推測
      const waste_type_id = request.waste_type_id || 'unknown';
      
      if (waste_type_id === 'unknown') continue;

      const key = `${store_id}_${collector_id}_${waste_type_id}`;

      const existing = aggregationMap.get(key);
      const quantity = new Decimal(collection.actual_qty.toString());
      const unit_price = 0; // 後で waste_type_masters から取得
      const amount = quantity.mul(unit_price);

      if (existing) {
        existing.total_quantity = existing.total_quantity.add(quantity);
        existing.total_amount = existing.total_amount.add(amount);
        existing.collection_count += 1;
      } else {
        aggregationMap.set(key, {
          store_id,
          collector_id,
          waste_type_id,
          item_label: request.waste_types?.name || '不明',
          total_quantity: quantity,
          unit: collection.actual_unit,
          unit_price,
          total_amount: amount,
          collection_count: 1,
        });
      }
    }

    // Prismaトランザクションで報告書と明細を作成
    let report
    try {
      report = await prisma.$transaction(async (tx) => {
        // 親レポート作成
        const newReport = await tx.annual_waste_reports.create({
          data: {
            org_id: user.org_id,
            fiscal_year: validatedData.fiscal_year,
            report_type: validatedData.report_type,
            report_period_from: periodFrom,
            report_period_to: periodTo,
            status: 'DRAFT',
            created_by: user.id,
          },
        });

        // 明細作成
        const items = Array.from(aggregationMap.values());
        
        if (items.length > 0) {
          await tx.annual_waste_report_items.createMany({
            data: items.map((item) => ({
              report_id: newReport.id,
              store_id: item.store_id,
              collector_id: item.collector_id,
              waste_type_id: item.waste_type_id,
              item_label: item.item_label,
              total_quantity: item.total_quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              total_amount: item.total_amount,
              collection_count: item.collection_count,
              created_by: user.id,
            })),
          });
        }

        // 作成した報告書を明細付きで返す
        return tx.annual_waste_reports.findUnique({
          where: { id: newReport.id },
          include: {
            items: {
              include: {
                store: true,
                collector: true,
                waste_type: true,
              },
            },
          },
        });
      });
    } catch (dbError) {
      console.error('[POST /api/annual-waste-reports/generate] Prismaトランザクションエラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    return NextResponse.json({
      message: '年間報告書を生成しました',
      report,
      summary: {
        total_items: aggregationMap.size,
        total_collections: collections.length,
        period_from: periodFrom.toISOString(),
        period_to: periodTo.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('年間報告書生成エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * ダッシュボード統計データ API
 * 
 * GET /api/statistics/dashboard
 * 
 * KPI、月次推移、店舗別統計などのダッシュボード用統計データを取得
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

// バリデーションスキーマ
const DashboardStatsQuerySchema = z.object({
  org_id: z.string().uuid('Invalid organization ID').optional(),
  collector_id: z.string().uuid().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

// GET /api/statistics/dashboard
export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  
  const params = {
    org_id: searchParams.get('org_id') || authUser.org_id,
    collector_id: searchParams.get('collector_id') || undefined,
    from_date: searchParams.get('from_date') || undefined,
    to_date: searchParams.get('to_date') || undefined,
  };

  // バリデーション
  let validatedParams
  try {
    validatedParams = DashboardStatsQuerySchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: '不正なパラメータです' }, { status: 400 });
  }

  // 権限チェック
  const targetOrgId = validatedParams.org_id || authUser.org_id;
  if (!targetOrgId) {
    return NextResponse.json({ error: '組織IDが必要です' }, { status: 400 });
  }
  
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json(
      { error: 'この組織の統計を閲覧する権限がありません' },
      { status: 403 }
    );
  }

  // org_idを確定
  validatedParams.org_id = targetOrgId;

  try {

    // 日付範囲のデフォルト（過去6ヶ月）
    const toDate = validatedParams.to_date
      ? new Date(validatedParams.to_date)
      : new Date();
    const fromDate = validatedParams.from_date
      ? new Date(validatedParams.from_date)
      : new Date(toDate.getFullYear(), toDate.getMonth() - 6, 1);

    // === KPI データ取得 ===

    // 1. 今月の請求サマリー
    const currentMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    const currentBillingSummaries = await prisma.billing_summaries.findMany({
      where: {
        org_id: validatedParams.org_id,
        billing_month: currentMonth,
        ...(validatedParams.collector_id && { collector_id: validatedParams.collector_id }),
      },
    });

    const currentMonthBilling = currentBillingSummaries.reduce(
      (acc, summary) => ({
        total_amount: acc.total_amount + summary.total_amount,
        total_items: acc.total_items + summary.total_items_count,
        fixed_amount: acc.fixed_amount + summary.total_fixed_amount,
        metered_amount: acc.metered_amount + summary.total_metered_amount,
        other_amount: acc.other_amount + summary.total_other_amount,
      }),
      {
        total_amount: 0,
        total_items: 0,
        fixed_amount: 0,
        metered_amount: 0,
        other_amount: 0,
      }
    );

    // 2. 今月の回収実績
    const currentCollections = await prisma.collections.aggregate({
      where: {
        org_id: validatedParams.org_id,
        collected_at: {
          gte: currentMonth,
          lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
        },
      },
      _count: true,
      _sum: {
        actual_qty: true,
      },
    });

    // 3. アクティブな店舗数
    const activeStores = await prisma.stores.count({
      where: {
        org_id: validatedParams.org_id,
        deleted_at: null,
      },
    });

    // 4. 今月の収集依頼数
    const currentRequests = await prisma.collection_requests.count({
      where: {
        org_id: validatedParams.org_id,
        created_at: {
          gte: currentMonth,
          lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
        },
        ...(validatedParams.collector_id && { collector_id: validatedParams.collector_id }),
      },
    });

    // === 月次推移データ取得 ===

    const monthlyBillingTrends = await prisma.billing_summaries.findMany({
      where: {
        org_id: validatedParams.org_id,
        billing_month: {
          gte: fromDate,
          lte: toDate,
        },
        ...(validatedParams.collector_id && { collector_id: validatedParams.collector_id }),
      },
      orderBy: {
        billing_month: 'asc',
      },
    });

    // 月ごとに集計
    const monthlyTrendsMap = new Map<string, {
      month: string;
      total_amount: number;
      fixed_amount: number;
      metered_amount: number;
      other_amount: number;
      items_count: number;
    }>();

    monthlyBillingTrends.forEach((summary) => {
      const monthKey = summary.billing_month.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyTrendsMap.get(monthKey) || {
        month: monthKey,
        total_amount: 0,
        fixed_amount: 0,
        metered_amount: 0,
        other_amount: 0,
        items_count: 0,
      };

      monthlyTrendsMap.set(monthKey, {
        month: monthKey,
        total_amount: existing.total_amount + summary.total_amount,
        fixed_amount: existing.fixed_amount + summary.total_fixed_amount,
        metered_amount: existing.metered_amount + summary.total_metered_amount,
        other_amount: existing.other_amount + summary.total_other_amount,
        items_count: existing.items_count + summary.total_items_count,
      });
    });

    const monthlyTrends = Array.from(monthlyTrendsMap.values());

    // === 店舗別統計 ===

    const storeStats = await prisma.$queryRaw<
      Array<{
        store_id: string;
        store_name: string;
        collection_count: bigint;
        total_quantity: number | null;
        total_amount: number | null;
      }>
    >`
      SELECT 
        s.id as store_id,
        s.name as store_name,
        COUNT(DISTINCT c.id) as collection_count,
        SUM(c.actual_qty) as total_quantity,
        SUM(bi.amount) as total_amount
      FROM app.stores s
      LEFT JOIN app.collections c ON c.store_id = s.id 
        AND c.actual_pickup_date >= ${fromDate}
        AND c.actual_pickup_date <= ${toDate}
        AND c.deleted_at IS NULL
        AND c.status IN ('COMPLETED', 'VERIFIED')
      LEFT JOIN app.billing_items bi ON bi.collection_id = c.id
        AND bi.deleted_at IS NULL
        AND bi.status != 'CANCELLED'
      WHERE s.org_id = ${validatedParams.org_id}::uuid
        AND s.deleted_at IS NULL
        ${validatedParams.collector_id ? prisma.$queryRawUnsafe(`AND c.collector_id = '${validatedParams.collector_id}'::uuid`) : prisma.$queryRawUnsafe('')}
      GROUP BY s.id, s.name
      ORDER BY total_amount DESC NULLS LAST
      LIMIT 10
    `;

    // BigInt を Number に変換
    const storeStatsFormatted = storeStats.map((stat) => ({
      store_id: stat.store_id,
      store_name: stat.store_name,
      collection_count: Number(stat.collection_count),
      total_quantity: stat.total_quantity || 0,
      total_amount: stat.total_amount || 0,
    }));

    // === 廃棄物種別内訳 ===

    const wasteTypeBreakdown = await prisma.$queryRaw<
      Array<{
        waste_type_name: string;
        collection_count: bigint;
        total_quantity: number | null;
        total_amount: number | null;
      }>
    >`
      SELECT 
        COALESCE(wtm.waste_type_name, 'その他') as waste_type_name,
        COUNT(DISTINCT c.id) as collection_count,
        SUM(c.actual_qty) as total_quantity,
        SUM(bi.amount) as total_amount
      FROM app.collections c
      LEFT JOIN app.waste_type_masters wtm ON wtm.id = c.waste_type_id
        AND wtm.deleted_at IS NULL
      LEFT JOIN app.billing_items bi ON bi.collection_id = c.id
        AND bi.deleted_at IS NULL
        AND bi.status != 'CANCELLED'
      WHERE c.org_id = ${validatedParams.org_id}::uuid
        AND c.actual_pickup_date >= ${fromDate}
        AND c.actual_pickup_date <= ${toDate}
        AND c.deleted_at IS NULL
        AND c.status IN ('COMPLETED', 'VERIFIED')
        ${validatedParams.collector_id ? prisma.$queryRawUnsafe(`AND c.collector_id = '${validatedParams.collector_id}'::uuid`) : prisma.$queryRawUnsafe('')}
      GROUP BY waste_type_name
      ORDER BY total_amount DESC NULLS LAST
    `;

    // BigInt を Number に変換
    const wasteTypeBreakdownFormatted = wasteTypeBreakdown.map((stat) => ({
      waste_type_name: stat.waste_type_name,
      collection_count: Number(stat.collection_count),
      total_quantity: stat.total_quantity || 0,
      total_amount: stat.total_amount || 0,
    }));

    // === レスポンス ===

    return NextResponse.json(
      {
        kpi: {
          current_month_billing: currentMonthBilling,
          current_month_collections: {
            count: currentCollections._count,
            total_quantity: currentCollections._sum.actual_qty || 0,
          },
          active_stores: activeStores,
          current_month_requests: currentRequests,
        },
        monthly_trends: monthlyTrends,
        store_stats: storeStatsFormatted,
        waste_type_breakdown: wasteTypeBreakdownFormatted,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Dashboard Statistics] GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


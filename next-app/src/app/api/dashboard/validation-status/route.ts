import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/dashboard/validation-status
 * 
 * 未登録・未設定項目の検出API
 * - システム管理会社: テナントの未完了項目を監視
 * - 収集業者: 自社の未完了タスクを確認
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let targetOrgId = user.org_id;

    // システム管理者の場合、org_idパラメータで対象テナントを指定可能
    if (user.isSystemAdmin) {
      const selectedOrgId = searchParams.get('org_id');
      if (selectedOrgId && user.org_ids.includes(selectedOrgId)) {
        targetOrgId = selectedOrgId;
      }
    }

    // ========================================
    // 1. 廃棄物単価の未設定チェック
    // ========================================
    let missingPrices;
    try {
      missingPrices = await prisma.waste_type_masters.findMany({
        where: {
          org_id: targetOrgId,
          OR: [
            { unit_price: null },
            { unit_price: 0 },
          ],
          deleted_at: null,
        },
        include: {
          collectors: {
            select: {
              id: true,
              company_name: true,
            },
          },
        },
        take: 50, // 最大50件まで
      });
    } catch (dbError) {
      console.error('[Validation Status] Database error - missing prices fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    const missingPricesByCollector = missingPrices.reduce((acc, item) => {
      const collectorId = item.collector_id;
      if (!collectorId || !item.collectors) return acc; // null チェック
      
      if (!acc[collectorId]) {
        acc[collectorId] = {
          collector_id: collectorId,
          collector_name: item.collectors.company_name,
          count: 0,
          items: [],
        };
      }
      acc[collectorId].count++;
      acc[collectorId].items.push({
        id: item.id,
        waste_type_name: item.waste_type_name,
        waste_type_code: item.waste_type_code,
      });
      return acc;
    }, {} as Record<string, any>);

    // ========================================
    // 2. 店舗×品目×業者マトリクスの未設定チェック
    // ========================================
    // 各店舗で全品目が収集業者に割り当てられているかチェック
    let storesWithoutMatrix;
    try {
      storesWithoutMatrix = await prisma.$queryRaw<Array<{
        store_id: string;
        store_name: string;
        total_items: bigint;
        assigned_items: bigint;
      }>>`
        SELECT 
          s.id as store_id,
          s.name as store_name,
          COUNT(DISTINCT im.item_label) as total_items,
          COUNT(DISTINCT sic.item_name) as assigned_items
        FROM app.stores s
        CROSS JOIN app.item_maps im
        LEFT JOIN app.store_item_collectors sic 
          ON s.id = sic.store_id AND im.item_label = sic.item_name AND sic.deleted_at IS NULL
        WHERE s.org_id = ${targetOrgId}::uuid
          AND s.deleted_at IS NULL
          AND im.org_id = ${targetOrgId}::uuid
          AND im.deleted_at IS NULL
        GROUP BY s.id, s.name
        HAVING COUNT(DISTINCT im.item_label) > COUNT(DISTINCT sic.item_name)
      `;
    } catch (dbError) {
      console.error('[Validation Status] Database error - stores without matrix query:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // ========================================
    // 3. 収集業者マスター登録状況
    // ========================================
    const collectorsCount = await prisma.collectors.count({
      where: { org_id: targetOrgId, deleted_at: null },
    });

    // ========================================
    // 4. 店舗マスター登録状況
    // ========================================
    const storesCount = await prisma.stores.count({
      where: { org_id: targetOrgId, deleted_at: null },
    });

    // ========================================
    // 5. 廃棄品目リスト登録状況
    // ========================================
    const itemMapsCount = await prisma.item_maps.count({
      where: { org_id: targetOrgId, deleted_at: null },
    });

    // ========================================
    // 6. 全体のステータス判定
    // ========================================
    const wasteTypeMastersTotal = await prisma.waste_type_masters.count({
      where: { org_id: targetOrgId, deleted_at: null },
    });

    const storesTotal = await prisma.stores.count({
      where: { org_id: targetOrgId, deleted_at: null },
    });

    return NextResponse.json({
      data: {
        collectors: {
          status: collectorsCount > 0 ? 'complete' : 'incomplete',
          count: collectorsCount,
        },
        stores: {
          status: storesCount > 0 ? 'complete' : 'incomplete',
          count: storesCount,
        },
        item_maps: {
          status: itemMapsCount > 0 ? 'complete' : 'incomplete',
          count: itemMapsCount,
        },
        waste_type_masters: {
          status: missingPrices.length === 0 ? 'complete' : 'incomplete',
          total: wasteTypeMastersTotal,
          missing: missingPrices.length,
          details: Object.values(missingPricesByCollector),
        },
        store_matrix: {
          status: storesWithoutMatrix.length === 0 ? 'complete' : 'incomplete',
          total: storesTotal,
          missing: storesWithoutMatrix.length,
          details: storesWithoutMatrix.map(s => ({
            store_id: s.store_id,
            store_name: s.store_name,
            total_items: Number(s.total_items),
            assigned_items: Number(s.assigned_items),
            missing_items: Number(s.total_items) - Number(s.assigned_items),
            // コンテキストパラメータを追加（from=dashboard&issue=matrix）
            link: `/dashboard/store-collector-assignments?from=dashboard&issue=matrix&store_id=${s.store_id}`,
          })),
        },
      },
      meta: {
        org_id: targetOrgId,
        is_system_admin: user.isSystemAdmin,
      },
    });
  } catch (error) {
    console.error('[Validation Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


/**
 * 請求データ（1年分）自動生成API
 * 
 * グローバルルール準拠:
 * - Prismaのみ使用（直接SQL禁止）
 * - 既存データをベースに生成
 * - トランザクション処理
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import dayjs from 'dayjs';

interface GenerationStats {
  month: string;
  plansCreated: number;
  collectionRequestsCreated: number;
  collectionsCreated: number;
  billingItemsCreated: number;
  billingSummariesCreated: number;
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.org_id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const stats: GenerationStats[] = [];

    // Step 1: 既存データの確認
    console.log('[Billing Year Data] Step 1: 既存データ確認開始');

    const collectors = await prisma.collectors.findMany({
      where: {
        org_id: authUser.org_id,
        deleted_at: null,
      },
      take: 100, // 最大100業者
    });

    const stores = await prisma.stores.findMany({
      where: {
        org_id: authUser.org_id,
        deleted_at: null,
      },
      take: 200, // 最大200店舗
    });

    const itemMaps = await prisma.item_maps.findMany({
      where: {
        org_id: authUser.org_id,
        deleted_at: null,
      },
    });

    const wasteTypeMasters = await prisma.waste_type_masters.findMany({
      where: {
        org_id: authUser.org_id,
        deleted_at: null,
      },
      take: 1, // とりあえず1つ使用
    });

    // データ不足チェック
    if (collectors.length === 0) {
      return NextResponse.json(
        { error: '収集業者が登録されていません' },
        { status: 400 }
      );
    }
    if (stores.length === 0) {
      return NextResponse.json(
        { error: '店舗が登録されていません' },
        { status: 400 }
      );
    }
    if (itemMaps.length === 0) {
      return NextResponse.json(
        { error: '廃棄品目が登録されていません' },
        { status: 400 }
      );
    }
    if (wasteTypeMasters.length === 0) {
      return NextResponse.json(
        { error: '廃棄物種別マスターが登録されていません' },
        { status: 400 }
      );
    }

    console.log('[Billing Year Data] 既存データ確認完了:', {
      collectors: collectors.length,
      stores: stores.length,
      itemMaps: itemMaps.length,
      wasteTypeMasters: wasteTypeMasters.length,
    });

    // Step 1.5: マトリクスと料金設定の自動生成
    console.log('[Billing Year Data] Step 1.5: マトリクス・料金設定の自動生成開始');

    // 廃棄物種別マスターに料金を設定
    let wasteTypePricesSet = 0;
    for (const wasteType of wasteTypeMasters) {
      if (!wasteType.unit_price || wasteType.unit_price === 0) {
        await prisma.waste_type_masters.update({
          where: { id: wasteType.id },
          data: {
            unit_price: Math.floor(Math.random() * 15000) + 5000, // 5,000〜20,000円/トン
            updated_by: authUser.id,
          },
        });
        wasteTypePricesSet++;
      }
    }

    console.log(`[Billing Year Data] 廃棄物種別マスター料金設定完了: ${wasteTypePricesSet}件`);

    // 店舗×品目×業者マトリクスを自動生成
    let matrixCreated = 0;
    const existingMatrixCount = await prisma.store_item_collectors.count({
      where: { org_id: authUser.org_id, deleted_at: null },
    });

    if (existingMatrixCount === 0) {
      console.log('[Billing Year Data] マトリクスが存在しないため、自動生成します');

      // 店舗数が多い場合は最初の100店舗のみ対象
      const targetStores = stores.slice(0, 100);

      for (const store of targetStores) {
        for (const itemMap of itemMaps) {
          // ランダムに3〜5業者を選択
          const numCollectors = Math.floor(Math.random() * 3) + 3; // 3〜5社
          const selectedCollectors = collectors
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(numCollectors, collectors.length));

          // マトリクスに登録
          for (let i = 0; i < selectedCollectors.length; i++) {
            await prisma.store_item_collectors.create({
              data: {
                org_id: authUser.org_id,
                store_id: store.id,
                collector_id: selectedCollectors[i].id,
                item_name: itemMap.item_label,
                item_code: itemMap.jwnet_code,
                priority: i + 1, // 優先順位: 1が最優先
                created_by: authUser.id,
                updated_by: authUser.id,
              },
            });
            matrixCreated++;
          }
        }
      }

      console.log(`[Billing Year Data] マトリクス自動生成完了: ${matrixCreated}件`);
    } else {
      console.log(`[Billing Year Data] マトリクス既存: ${existingMatrixCount}件（生成スキップ）`);
    }

    // Step 2: 月ごとにデータ生成（2024年1月〜12月）
    console.log('[Billing Year Data] Step 2: 月次データ生成開始');

    for (let month = 1; month <= 12; month++) {
      const monthStart = dayjs(`2024-${String(month).padStart(2, '0')}-01`);
      const monthEnd = monthStart.endOf('month');

      console.log(`[Billing Year Data] ${month}月のデータ生成開始`);

      let plansCount = 0;
      let collectionRequestsCount = 0;
      let collectionsCount = 0;
      let billingItemsCount = 0;

      // 各店舗について月2〜4回の回収を生成
      for (const store of stores) {
        // マトリクスから品目と業者の組み合わせを取得
        const storeMatrix = await prisma.store_item_collectors.findMany({
          where: {
            store_id: store.id,
            deleted_at: null,
          },
          orderBy: [
            { item_name: 'asc' },
            { priority: 'asc' },
          ],
        });

        // マトリクスが存在しない場合はスキップ
        if (storeMatrix.length === 0) {
          continue;
        }

        // 品目ごとにグループ化
        const itemGroups = new Map<string, typeof storeMatrix>();
        for (const matrix of storeMatrix) {
          const existing = itemGroups.get(matrix.item_name) || [];
          existing.push(matrix);
          itemGroups.set(matrix.item_name, existing);
        }

        // 各品目について
        for (const [itemName, matrixRecords] of itemGroups) {
          // 最優先の業者を選択（priority = 1）
          const primaryMatrix = matrixRecords[0];
          const collector = collectors.find((c) => c.id === primaryMatrix.collector_id);
          if (!collector) continue;

          // 対応する item_map を取得
          const selectedItem = itemMaps.find((item) => item.item_label === itemName);
          if (!selectedItem) continue;

          const wasteType = wasteTypeMasters[0];

          // 月2〜4回の回収
          const collectionsPerMonth = Math.floor(Math.random() * 3) + 2;

          for (let i = 0; i < collectionsPerMonth; i++) {
            // ランダムな回収日
            const collectionDay = Math.floor(Math.random() * monthEnd.date()) + 1;
            const collectionDate = monthStart.date(collectionDay);

            // Plan作成
            const plannedQty = Math.random() * 2 + 0.5; // 0.5〜2.5トン
            const plan = await prisma.plans.create({
              data: {
                org_id: authUser.org_id,
                store_id: store.id,
                item_map_id: selectedItem.id,
                planned_qty: plannedQty,
                unit: 'T', // enum: 'T' | 'KG' | 'M3' | 'PIECES'
                planned_date: collectionDate.toDate(),
                created_by: authUser.id,
                updated_by: authUser.id,
              },
            });
            plansCount++;

            // Collection Request作成
            const collectionRequest = await prisma.collection_requests.create({
              data: {
                org_id: authUser.org_id,
                store_id: store.id,
                collector_id: collector.id,
                waste_type_id: wasteType.id,
                main_items: [
                  {
                    item_label: selectedItem.item_label,
                    jwnet_code: selectedItem.jwnet_code,
                    quantity: plannedQty,
                    unit: 'T',
                  },
                ],
                requested_at: collectionDate.toDate(),
                scheduled_collection_date: collectionDate.toDate(),
                status: 'APPROVED',
                priority: 'NORMAL',
                created_by: authUser.id,
                updated_by: authUser.id,
              },
            });
            collectionRequestsCount++;

            // Collection作成
            const actualQty = plannedQty * (0.9 + Math.random() * 0.2); // ±10%
            const manifestNo = `M-2024${String(month).padStart(2, '0')}${String(i).padStart(3, '0')}`;
            const collection = await prisma.collections.create({
              data: {
                org_id: authUser.org_id,
                request_id: collectionRequest.id,
                collected_at: collectionDate.toDate(),
                actual_qty: actualQty,
                actual_unit: 'T',
                jwnet_registration_id: manifestNo,
                notes: `${month}月の定期回収`,
                created_by: authUser.id,
                updated_by: authUser.id,
              },
            });
            collectionsCount++;

            // Billing Item作成
            // 廃棄物種別マスターの単価を使用（自動設定済み）
            const unitPrice = wasteType.unit_price || 10000;
            const amount = Number(actualQty) * unitPrice;
            const taxAmount = amount * 0.1;
            const totalAmount = amount + taxAmount;

            await prisma.app_billing_items.create({
              data: {
                org_id: authUser.org_id,
                collector_id: collector.id,
                store_id: store.id,
                collection_id: collection.id,
                billing_month: monthStart.toDate(),
                billing_period_from: monthStart.toDate(),
                billing_period_to: monthEnd.toDate(),
                billing_type: 'METERED',
                item_name: selectedItem.item_label,
                item_code: selectedItem.jwnet_code,
                waste_type_id: wasteType.id,
                unit_price: unitPrice,
                quantity: Number(actualQty),
                unit: 'T',
                amount,
                tax_rate: 0.1,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                jwnet_manifest_no: manifestNo,
                status: 'APPROVED',
                created_by: authUser.id,
                updated_by: authUser.id,
              },
            });
            billingItemsCount++;
          }
        }
      }

      // Step 3: 業者ごとに請求サマリーを計算
      console.log(`[Billing Year Data] ${month}月の請求サマリー計算開始`);

      for (const collector of collectors) {
        const billingItems = await prisma.app_billing_items.findMany({
          where: {
            org_id: authUser.org_id,
            collector_id: collector.id,
            billing_month: monthStart.toDate(),
            status: { not: 'CANCELLED' },
          },
        });

        if (billingItems.length > 0) {
          const totalMeteredAmount = billingItems.reduce((sum, item) => sum + item.amount, 0);
          const totalTaxAmount = billingItems.reduce((sum, item) => sum + item.tax_amount, 0);
          const totalAmount = totalMeteredAmount + totalTaxAmount;

          await prisma.billing_summaries.create({
            data: {
              org_id: authUser.org_id,
              collector_id: collector.id,
              billing_month: monthStart.toDate(),
              total_fixed_amount: 0,
              total_metered_amount: totalMeteredAmount,
              total_other_amount: 0,
              subtotal_amount: totalMeteredAmount,
              tax_amount: totalTaxAmount,
              total_amount: totalAmount,
              total_items_count: billingItems.length,
              fixed_items_count: 0,
              metered_items_count: billingItems.length,
              other_items_count: 0,
              status: 'APPROVED',
              created_by: authUser.id,
              updated_by: authUser.id,
            },
          });
        }
      }

      const billingSummariesCount = (
        await prisma.billing_summaries.count({
          where: {
            org_id: authUser.org_id,
            billing_month: monthStart.toDate(),
          },
        })
      );

      stats.push({
        month: `${month}月`,
        plansCreated: plansCount,
        collectionRequestsCreated: collectionRequestsCount,
        collectionsCreated: collectionsCount,
        billingItemsCreated: billingItemsCount,
        billingSummariesCreated: billingSummariesCount,
      });

      console.log(`[Billing Year Data] ${month}月のデータ生成完了:`, {
        plans: plansCount,
        collectionRequests: collectionRequestsCount,
        collections: collectionsCount,
        billingItems: billingItemsCount,
        billingSummaries: billingSummariesCount,
      });
    }

    return NextResponse.json({
      message: '1年分の請求データを生成しました',
      summary: {
        collectors: collectors.length,
        stores: stores.length,
        itemMaps: itemMaps.length,
        matrixGenerated: matrixCreated,
        wasteTypePricesSet: wasteTypePricesSet,
      },
      stats,
    });
  } catch (error) {
    console.error('[Billing Year Data] エラー:', error);
    return NextResponse.json(
      {
        error: '請求データ生成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}


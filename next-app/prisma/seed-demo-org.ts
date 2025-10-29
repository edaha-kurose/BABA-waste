/**
 * デモ組織用マスターデータ作成スクリプト
 * 
 * 対象: デモ組織 (ID: 12345678-1234-1234-1234-123456789012)
 * 作成内容:
 * - 廃棄物種別マスター
 * - 店舗×品目×収集業者の紐付け
 * - 回収実績データ
 * - 請求データ
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const ORG_ID = '12345678-1234-1234-1234-123456789012'; // デモ組織
const ADMIN_AUTH_USER_ID = '1a9eb299-e83a-49fe-bf3c-48aa37646d6d'; // admin@test.com

async function main() {
  console.log('🚀 デモ組織マスターデータ作成開始\n');
  console.log('対象組織: デモ組織');
  console.log(`ORG_ID: ${ORG_ID}\n`);
  console.log('='.repeat(80));

  // Step 0: 組織確認
  const organization = await prisma.organizations.findUnique({
    where: { id: ORG_ID },
  });

  if (!organization) {
    console.error('❌ デモ組織が見つかりません。');
    process.exit(1);
  }

  console.log(`✅ 組織: ${organization.name}\n`);

  // Step 1: 既存データ確認
  console.log('📋 Step 1: 既存データ確認\n');

  const collectors = await prisma.collectors.findMany({
    where: { org_id: ORG_ID, deleted_at: null },
    take: 5,
  });

  const itemMaps = await prisma.item_maps.findMany({
    where: { org_id: ORG_ID, deleted_at: null },
    take: 10,
  });

  const stores = await prisma.stores.findMany({
    where: { org_id: ORG_ID, deleted_at: null },
    take: 10,
  });

  console.log(`  収集業者: ${collectors.length}件`);
  console.log(`  品目マップ: ${itemMaps.length}件`);
  console.log(`  店舗: ${stores.length}件\n`);

  if (collectors.length === 0 || itemMaps.length === 0) {
    console.error('❌ 収集業者または品目マップが不足しています。');
    console.error('   先に基本マスターデータを作成してください。');
    process.exit(1);
  }

  // Step 2: 廃棄物種別マスター作成
  console.log('📋 Step 2: 廃棄物種別マスター作成\n');

  let wasteTypeCount = 0;

  for (const collector of collectors) {
    for (const item of itemMaps) {
      // 既存チェック
      const existing = await prisma.waste_type_masters.findUnique({
        where: {
          org_id_collector_id_waste_type_code: {
            org_id: ORG_ID,
            collector_id: collector.id,
            waste_type_code: `WT-${item.jwnet_code || 'UNKNOWN'}`,
          },
        },
      });

      if (!existing) {
        await prisma.waste_type_masters.create({
          data: {
            org_id: ORG_ID,
            collector_id: collector.id,
            waste_type_code: `WT-${item.jwnet_code || 'UNKNOWN'}`,
            waste_type_name: item.item_label,
            waste_category: item.hazard ? '特別管理産業廃棄物' : '産業廃棄物',
            waste_classification: item.hazard ? '危険物' : '一般',
            jwnet_waste_code: item.jwnet_code,
            unit_code: item.default_unit,
            unit_price: 50 + Math.floor(Math.random() * 50), // 50〜100円/kg
            billing_category: 'collection',
            billing_type_default: 'actual_quantity',
            created_by: ADMIN_AUTH_USER_ID,
            updated_by: ADMIN_AUTH_USER_ID,
          },
        });
        wasteTypeCount++;
      }
    }
  }

  console.log(`  ✅ 廃棄物種別マスター: ${wasteTypeCount}件作成\n`);

  // Step 3: 店舗×品目×収集業者の紐付け
  console.log('📋 Step 3: 店舗×品目×収集業者の紐付け作成\n');

  let matrixCount = 0;

  for (const store of stores) {
    for (const item of itemMaps) {
      // 各品目に対して、全収集業者を割り当て（優先度順）
      for (let i = 0; i < collectors.length && i < 3; i++) {
        const collector = collectors[i];

        // 既存チェック
        const existing = await prisma.store_item_collectors.findUnique({
          where: {
            org_id_store_id_item_name_collector_id: {
              org_id: ORG_ID,
              store_id: store.id,
              item_name: item.item_label,
              collector_id: collector.id,
            },
          },
        });

        if (!existing) {
          await prisma.store_item_collectors.create({
            data: {
              org_id: ORG_ID,
              store_id: store.id,
              item_name: item.item_label,
              item_code: item.jwnet_code,
              collector_id: collector.id,
              priority: i + 1,
              is_active: true,
              created_by: ADMIN_AUTH_USER_ID,
              updated_by: ADMIN_AUTH_USER_ID,
            },
          });
          matrixCount++;
        }
      }
    }
  }

  console.log(`  ✅ 店舗×品目×収集業者: ${matrixCount}件作成\n`);

  // Step 4: 過去3ヶ月の回収実績作成
  console.log('📋 Step 4: 回収実績作成（過去3ヶ月分）\n');

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  let planCount = 0;
  let actualCount = 0;

  // 各店舗で週2回、3ヶ月分の回収を実施
  for (const store of stores.slice(0, 5)) { // 最初の5店舗のみ
    for (let week = 0; week < 12; week++) { // 3ヶ月 = 12週
      for (let dayOfWeek = 0; dayOfWeek < 2; dayOfWeek++) { // 週2回
        const scheduledDate = new Date(threeMonthsAgo);
        scheduledDate.setDate(scheduledDate.getDate() + week * 7 + dayOfWeek * 3);

        // 各回で2〜3品目を回収
        const itemsToCollect = itemMaps.slice(0, 2 + Math.floor(Math.random() * 2));

        for (const item of itemsToCollect) {
          // 収集予定作成（upsertで重複を回避）
          const plan = await prisma.plans.upsert({
            where: {
              org_id_store_id_planned_date_item_map_id: {
                org_id: ORG_ID,
                store_id: store.id,
                planned_date: scheduledDate,
                item_map_id: item.id,
              },
            },
            create: {
              org_id: ORG_ID,
              store_id: store.id,
              planned_date: scheduledDate,
              item_map_id: item.id,
              planned_qty: new Decimal(Math.floor(Math.random() * 100) + 20), // 20〜120kg
              unit: item.default_unit,
              created_by: ADMIN_AUTH_USER_ID,
              updated_by: ADMIN_AUTH_USER_ID,
            },
            update: {}, // 既存の場合は更新しない
          });
          planCount++;

          // 回収実績確認・作成
          const existingActual = await prisma.actuals.findUnique({
            where: { plan_id: plan.id },
          });

          if (!existingActual) {
            // 回収実績作成（実績 = 予定 * 0.8〜1.2）
            const actualQty = plan.planned_qty.mul(new Decimal(0.8 + Math.random() * 0.4));

            await prisma.actuals.create({
              data: {
                org_id: ORG_ID,
                plan_id: plan.id,
                actual_qty: actualQty,
                unit: plan.unit,
                confirmed_at: scheduledDate, // 確定済み
                created_by: ADMIN_AUTH_USER_ID,
                updated_by: ADMIN_AUTH_USER_ID,
              },
            });
            actualCount++;
          }
        }
      }
    }
  }

  console.log(`  ✅ 収集予定: ${planCount}件作成`);
  console.log(`  ✅ 回収実績: ${actualCount}件作成\n`);

  // Step 5: 請求明細作成
  console.log('📋 Step 5: 請求明細作成\n');

  const allActuals = await prisma.actuals.findMany({
    where: {
      org_id: ORG_ID,
      deleted_at: null,
    },
    include: {
      plans: {
        include: {
          stores: true,
          item_maps: true,
        },
      },
    },
    take: 200,
  });

  // confirmed_at が null でない実績のみフィルタ
  const confirmedActuals = allActuals.filter(a => a.confirmed_at !== null);

  let billingCount = 0;

  for (const actual of confirmedActuals) {
    if (!actual.plans || !actual.plans.stores || !actual.plans.item_maps) {
      continue;
    }

    const plan = actual.plans;

    // 収集業者を store_item_collectors から取得（優先度1位）
    const storeItemCollector = await prisma.store_item_collectors.findFirst({
      where: {
        org_id: ORG_ID,
        store_id: plan.store_id,
        item_name: plan.item_maps.item_label,
        priority: 1,
        deleted_at: null,
      },
    });

    if (!storeItemCollector) {
      continue;
    }

    const collectorId = storeItemCollector.collector_id;

    // 単価マスター取得
    const wasteTypeMaster = await prisma.waste_type_masters.findFirst({
      where: {
        org_id: ORG_ID,
        collector_id: collectorId,
        jwnet_waste_code: plan.item_maps.jwnet_code,
        deleted_at: null,
      },
    });

    if (!wasteTypeMaster) {
      continue;
    }

    // 請求期間
    const billingMonth = new Date(actual.confirmed_at!);
    billingMonth.setDate(1); // 月初
    billingMonth.setHours(0, 0, 0, 0);

    const billingPeriodFrom = new Date(billingMonth);
    const billingPeriodTo = new Date(billingMonth);
    billingPeriodTo.setMonth(billingPeriodTo.getMonth() + 1);
    billingPeriodTo.setDate(0); // 月末

    const unitPrice = new Decimal(wasteTypeMaster.unit_price || 0);
    const subtotalAmount = actual.actual_qty.mul(unitPrice);
    const taxAmount = subtotalAmount.mul(new Decimal(0.1)); // 10%
    const totalAmount = subtotalAmount.add(taxAmount);

    await prisma.app_billing_items.create({
      data: {
        org_id: ORG_ID,
        collector_id: collectorId,
        store_id: plan.stores.id,
        billing_month: billingMonth,
        billing_period_from: billingPeriodFrom,
        billing_period_to: billingPeriodTo,
        billing_type: 'actual_quantity',
        item_name: plan.item_maps.item_label,
        quantity: actual.actual_qty,
        unit: actual.unit,
        unit_price: unitPrice.toNumber(),
        subtotal_amount: subtotalAmount.toNumber(),
        tax_amount: taxAmount.toNumber(),
        total_amount: totalAmount.toNumber(),
        status: 'DRAFT',
        notes: `回収実績ID: ${actual.id}`,
        created_by: ADMIN_AUTH_USER_ID,
        updated_by: ADMIN_AUTH_USER_ID,
      },
    });
    billingCount++;
  }

  console.log(`  ✅ 請求明細: ${billingCount}件作成\n`);

  console.log('='.repeat(80));
  console.log('🎉 デモ組織マスターデータ作成完了\n');
  console.log('作成データサマリー:');
  console.log(`  - 廃棄物種別マスター: ${wasteTypeCount}件`);
  console.log(`  - 店舗×品目×収集業者: ${matrixCount}件`);
  console.log(`  - 収集予定: ${planCount}件`);
  console.log(`  - 回収実績: ${actualCount}件`);
  console.log(`  - 請求明細: ${billingCount}件\n`);
  console.log('次のステップ:');
  console.log('  1. ブラウザをリロード');
  console.log('  2. システムガイド画面で「0件登録済み」が解消されたことを確認');
  console.log('  3. 請求管理画面でデータが表示されることを確認\n');
}

main().finally(() => prisma.$disconnect());


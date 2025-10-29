/**
 * 回収実績から請求明細を生成するスクリプト
 * グローバルルール準拠: Prismaスキーマに完全準拠
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '00000000-0000-0000-0000-000000000001'; // テスト組織A（管理者用）
const ADMIN_USER_ID = '1a9eb299-e83a-49fe-bf3c-48aa37646d6d';

async function main() {
  console.log('📊 回収実績から請求明細生成\n');
  console.log('='.repeat(80));

  // Step 1: 組織確認
  const org = await prisma.organizations.findUnique({
    where: { id: ORG_ID },
  });

  if (!org) {
    throw new Error(`組織が見つかりません: ${ORG_ID}`);
  }

  console.log(`✅ 組織: ${org.name}\n`);

  // Step 2: 収集業者確認
  const collector = await prisma.collectors.findFirst({
    where: { org_id: ORG_ID, deleted_at: null },
  });

  if (!collector) {
    throw new Error('収集業者が見つかりません');
  }

  console.log(`✅ 収集業者: ${collector.company_name}\n`);

  // Step 3: 単価マスター作成（まだない場合）
  console.log('📋 単価マスター確認/作成...');
  const existingWasteTypes = await prisma.waste_type_masters.count({
    where: { org_id: ORG_ID, collector_id: collector.id },
  });

  if (existingWasteTypes === 0) {
    console.log('  単価マスターが存在しないため作成します...');
    
    // 品目マップを取得
    const itemMaps = await prisma.item_maps.findMany({
      where: { org_id: ORG_ID, deleted_at: null },
    });

    for (const item of itemMaps) {
      await prisma.waste_type_masters.create({
        data: {
          org_id: ORG_ID,
          collector_id: collector.id,
          waste_type_code: `WT-${item.jwnet_code || item.id.substring(0, 4)}`,
          waste_type_name: item.item_label,
          waste_category: item.hazard ? '特別管理産業廃棄物' : '産業廃棄物',
          waste_classification: item.hazard ? '危険物' : '一般',
          jwnet_waste_code: item.jwnet_code,
          unit_code: item.default_unit || 'KG',
          unit_price: 50 + Math.floor(Math.random() * 30), // 50-80円/単位
          billing_category: 'collection',
          billing_type_default: 'actual_quantity',
          created_by: ADMIN_USER_ID,
          updated_by: ADMIN_USER_ID,
        },
      });
    }
    console.log(`  ✅ 単価マスター: ${itemMaps.length}件作成\n`);
  } else {
    console.log(`  ✅ 単価マスター: ${existingWasteTypes}件存在\n`);
  }

  // Step 4: 回収実績取得
  console.log('📋 回収実績取得...');
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
    take: 300, // 最大300件
  });

  // 確定済みのみフィルタ
  const actuals = allActuals.filter(a => a.confirmed_at !== null);

  console.log(`  ✅ 確定済み実績: ${actuals.length}件\n`);

  // Step 5: 請求明細生成
  console.log('📋 請求明細生成...');
  let createdCount = 0;
  let skippedCount = 0;

  const billingMonth = new Date('2025-10-01'); // 10月分として生成

  for (const actual of actuals) {
    if (!actual.plans) {
      skippedCount++;
      continue;
    }

    const plan = actual.plans;

    // 単価マスター取得
    const wasteType = await prisma.waste_type_masters.findFirst({
      where: {
        org_id: ORG_ID,
        collector_id: collector.id,
      },
    });

    if (!wasteType) {
      console.log(`  ⚠️  単価マスターなし: ${plan.item_maps?.item_label}`);
      skippedCount++;
      continue;
    }

    // 既存の請求明細確認（重複防止）
    const existing = await prisma.app_billing_items.findFirst({
      where: {
        org_id: ORG_ID,
        collector_id: collector.id,
        store_id: plan.store_id,
        billing_month: billingMonth,
        item_name: wasteType.waste_type_name,
      },
    });

    if (existing) {
      skippedCount++;
      continue;
    }

    // 金額計算
    const quantity = Number(actual.actual_qty);
    const unitPrice = Number(wasteType.unit_price || 50);
    const amount = quantity * unitPrice;
    const taxRate = 0.10;
    const taxAmount = amount * taxRate;
    const totalAmount = amount + taxAmount;

    // 請求明細作成
    try {
      await prisma.app_billing_items.create({
        data: {
          org_id: ORG_ID,
          collector_id: collector.id,
          store_id: plan.store_id,
          billing_month: billingMonth,
          billing_period_from: new Date('2025-10-01'),
          billing_period_to: new Date('2025-10-31'),
          billing_type: 'actual_quantity',
          item_name: wasteType.waste_type_name,
          item_code: wasteType.waste_type_code,
          waste_type_id: wasteType.id,
          unit_price: unitPrice,
          quantity: quantity,
          unit: actual.unit,
          amount: amount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'DRAFT',
          created_by: ADMIN_USER_ID,
          updated_by: ADMIN_USER_ID,
        },
      });
      createdCount++;
    } catch (error: any) {
      console.error(`  ❌ エラー: ${error.message}`);
      skippedCount++;
    }
  }

  console.log(`  ✅ 請求明細作成: ${createdCount}件`);
  console.log(`  ⚠️  スキップ: ${skippedCount}件\n`);

  // Step 6: 請求サマリー更新
  console.log('📋 請求サマリー更新...');
  const billingItems = await prisma.app_billing_items.findMany({
    where: {
      org_id: ORG_ID,
      collector_id: collector.id,
      billing_month: billingMonth,
    },
  });

  if (billingItems.length > 0) {
    const totalAmount = billingItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalTax = billingItems.reduce((sum, item) => sum + Number(item.tax_amount), 0);
    const grandTotal = billingItems.reduce((sum, item) => sum + Number(item.total_amount), 0);

    // 既存のサマリーを検索
    const existingSummary = await prisma.billing_summaries.findFirst({
      where: {
        org_id: ORG_ID,
        collector_id: collector.id,
        billing_month: billingMonth,
      },
    });

    if (existingSummary) {
      // 更新
      await prisma.billing_summaries.update({
        where: { id: existingSummary.id },
        data: {
          total_fixed_amount: 0,
          total_metered_amount: totalAmount,
          total_other_amount: 0,
          subtotal_amount: totalAmount,
          tax_amount: totalTax,
          total_amount: grandTotal,
          total_items_count: billingItems.length,
          fixed_items_count: 0,
          metered_items_count: billingItems.length,
          other_items_count: 0,
          updated_at: new Date(),
          updated_by: ADMIN_USER_ID,
        },
      });
      console.log('  ✅ 請求サマリー更新完了\n');
    } else {
      // 新規作成
      await prisma.billing_summaries.create({
        data: {
          org_id: ORG_ID,
          collector_id: collector.id,
          billing_month: billingMonth,
          total_fixed_amount: 0,
          total_metered_amount: totalAmount,
          total_other_amount: 0,
          subtotal_amount: totalAmount,
          tax_amount: totalTax,
          total_amount: grandTotal,
          total_items_count: billingItems.length,
          fixed_items_count: 0,
          metered_items_count: billingItems.length,
          other_items_count: 0,
          status: 'DRAFT',
          created_by: ADMIN_USER_ID,
          updated_by: ADMIN_USER_ID,
        },
      });
      console.log('  ✅ 請求サマリー作成完了\n');
    }
  }

  console.log('='.repeat(80));
  console.log('🎉 請求明細生成完了\n');
  console.log('次のステップ:');
  console.log('  1. node scripts/diagnose-billing-data.mjs - データ確認');
  console.log('  2. http://localhost:3001/dashboard/billing - 請求管理画面確認');
  console.log('');
}

main()
  .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


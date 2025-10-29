/**
 * デモ組織の回収実績から請求明細生成
 * 対象組織: デモ組織 (12345678-1234-1234-1234-123456789012)
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const ORG_ID = '12345678-1234-1234-1234-123456789012'; // デモ組織
const ADMIN_APP_USER_ID = '579c9ffd-c3c0-4b1a-8e7e-8c6845c3165d'; // admin@test.com の app_user_id

async function main() {
  console.log('📊 デモ組織の請求明細生成\n');
  console.log('='.repeat(80));

  // Step 1: 回収実績取得
  console.log('📋 Step 1: 回収実績取得中...');
  const actuals = await prisma.actuals.findMany({
    where: {
      org_id: ORG_ID,
      confirmed_at: { not: null },
      deleted_at: null,
    },
    include: {
      plans: {
        include: {
          stores: true,
          item_maps: true,
          collectors: true,
        },
      },
    },
  });
  console.log(`  ✅ 確定済み実績: ${actuals.length}件\n`);

  if (actuals.length === 0) {
    console.error('❌ 回収実績が存在しません');
    console.log('   推奨: pnpm prisma:seed:production-full を先に実行してください');
    process.exit(1);
  }

  // Step 2: 請求明細生成
  console.log('📋 Step 2: 請求明細生成中...');
  
  let createdCount = 0;
  let skippedCount = 0;

  for (const actual of actuals) {
    if (!actual.plans || !actual.plans.stores || !actual.plans.item_maps || !actual.plans.collectors) {
      console.warn(`  ⚠️  スキップ: 関連データ不足 (実績ID: ${actual.id})`);
      skippedCount++;
      continue;
    }

    // 単価マスター取得
    const wasteTypeMaster = await prisma.waste_type_masters.findFirst({
      where: {
        org_id: ORG_ID,
        collector_id: actual.plans.collectors.id,
        jwnet_waste_code: actual.plans.item_maps.jwnet_code,
        deleted_at: null,
      },
    });

    if (!wasteTypeMaster) {
      console.warn(`  ⚠️  スキップ: 単価マスター未設定 (品目: ${actual.plans.item_maps.item_label}, 業者: ${actual.plans.collectors.company_name})`);
      skippedCount++;
      continue;
    }

    const unitPrice = new Decimal(wasteTypeMaster.unit_price || 0);
    const subtotalAmount = new Decimal(actual.actual_qty).mul(unitPrice);
    const taxAmount = subtotalAmount.mul(0.1);
    const totalAmount = subtotalAmount.add(taxAmount);

    // 請求明細作成
    await prisma.app_billing_items.create({
      data: {
        org_id: ORG_ID,
        collector_id: actual.plans.collectors.id,
        store_id: actual.plans.stores.id,
        billing_month: new Date(actual.confirmed_at!.getFullYear(), actual.confirmed_at!.getMonth(), 1),
        billing_type: 'actual_quantity',
        item_name: actual.plans.item_maps.item_label,
        quantity: actual.actual_qty,
        unit: actual.unit,
        unit_price: unitPrice.toNumber(),
        subtotal_amount: subtotalAmount.toNumber(),
        tax_amount: taxAmount.toNumber(),
        total_amount: totalAmount.toNumber(),
        status: 'DRAFT',
        notes: `回収実績ID: ${actual.id}`,
        created_by: ADMIN_APP_USER_ID,
        updated_by: ADMIN_APP_USER_ID,
      },
    });
    createdCount++;

    if (createdCount % 500 === 0) {
      console.log(`  作成: ${createdCount}/${actuals.length}`);
    }
  }

  console.log(`  ✅ 請求明細作成: ${createdCount}件`);
  console.log(`  ⚠️  スキップ: ${skippedCount}件\n`);

  // Step 3: 請求サマリー更新
  console.log('📋 Step 3: 請求サマリー更新中...');
  
  const collectors = await prisma.collectors.findMany({
    where: { org_id: ORG_ID, deleted_at: null },
  });

  let summaryCount = 0;
  for (const collector of collectors) {
    for (let month = 0; month < 12; month++) {
      const billingMonth = new Date(2024, month, 1);
      const startOfMonth = new Date(2024, month, 1);
      const endOfMonth = new Date(2024, month + 1, 0, 23, 59, 59);

      const monthlyBillingItems = await prisma.app_billing_items.findMany({
        where: {
          org_id: ORG_ID,
          collector_id: collector.id,
          billing_month: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          deleted_at: null,
        },
      });

      if (monthlyBillingItems.length === 0) continue;

      const totalSubtotal = monthlyBillingItems.reduce((sum, item) => sum + item.subtotal_amount, 0);
      const totalTax = monthlyBillingItems.reduce((sum, item) => sum + item.tax_amount, 0);
      const totalAmount = monthlyBillingItems.reduce((sum, item) => sum + item.total_amount, 0);

      await prisma.billing_summaries.upsert({
        where: {
          org_id_collector_id_billing_month: {
            org_id: ORG_ID,
            collector_id: collector.id,
            billing_month: billingMonth,
          },
        },
        update: {
          total_metered_amount: totalSubtotal,
          subtotal_amount: totalSubtotal,
          tax_amount: totalTax,
          total_amount: totalAmount,
          total_items_count: monthlyBillingItems.length,
          metered_items_count: monthlyBillingItems.length,
          updated_by: ADMIN_APP_USER_ID,
        },
        create: {
          org_id: ORG_ID,
          collector_id: collector.id,
          billing_month: billingMonth,
          total_fixed_amount: 0,
          total_metered_amount: totalSubtotal,
          total_other_amount: 0,
          subtotal_amount: totalSubtotal,
          tax_amount: totalTax,
          total_amount: totalAmount,
          total_items_count: monthlyBillingItems.length,
          fixed_items_count: 0,
          metered_items_count: monthlyBillingItems.length,
          other_items_count: 0,
          status: 'DRAFT',
          created_by: ADMIN_APP_USER_ID,
          updated_by: ADMIN_APP_USER_ID,
        },
      });
      summaryCount++;
    }
  }
  console.log(`  ✅ 請求サマリー作成: ${summaryCount}件\n`);

  console.log('='.repeat(80));
  console.log('🎉 請求明細生成完了\n');
  console.log('次のステップ:');
  console.log('  1. http://localhost:3001/dashboard/billing - 請求管理画面確認');
  console.log('  2. デモ組織を選択');
  console.log('  3. 収集業者を選択');
  console.log('  4. 請求明細が表示されることを確認');
  console.log('');
}

main().finally(() => prisma.$disconnect());


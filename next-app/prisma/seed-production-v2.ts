/**
 * 本番想定簡略版シードスクリプト
 * グローバルルール準拠: Prismaスキーマに完全準拠
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '12345678-1234-1234-1234-123456789012';
const ADMIN_USER_ID = '1a9eb299-e83a-49fe-bf3c-48aa37646d6d';

async function main() {
  console.log('🚀 本番想定シード（簡略版）\n');

  const org = await prisma.organizations.findUnique({ where: { id: ORG_ID } });
  if (!org) throw new Error(`組織なし: ${ORG_ID}`);
  
  console.log(`✅ 組織: ${org.name}\n`);

  // 収集業者
  console.log('📋 収集業者作成...');
  const collectors = await Promise.all([
    prisma.collectors.create({
      data: {
        org_id: ORG_ID,
        company_name: '東京エコ運輸株式会社',
        contact_person: '営業担当',
        address: '東京都千代田区1-2-3',
        phone: '03-1234-5678',
        email: 'info@tokyo-eco.example.com',
        license_number: '第001-2024号',
        service_areas: ['東京都', '埼玉県'],
        created_by: ADMIN_USER_ID,
        updated_by: ADMIN_USER_ID,
      },
    }),
    prisma.collectors.create({
      data: {
        org_id: ORG_ID,
        company_name: '関東リサイクルセンター',
        contact_person: '営業担当',
        address: '埼玉県さいたま市1-2-3',
        phone: '048-1234-5678',
        email: 'info@kanto-recycle.example.com',
        license_number: '第002-2024号',
        service_areas: ['埼玉県', '群馬県'],
        created_by: ADMIN_USER_ID,
        updated_by: ADMIN_USER_ID,
      },
    }),
  ]);
  console.log(`  ✅ ${collectors.length}件\n`);

  // 店舗
  console.log('📋 店舗作成...');
  const stores = await Promise.all([
    prisma.stores.create({
      data: {
        org_id: ORG_ID,
        store_code: 'ST-001',
        name: '本社ビル',
        address: '東京都千代田区○○1-2-3',
        area: '関東',
        emitter_no: 'EMIT-ST-001',
        created_by: ADMIN_USER_ID,
        updated_by: ADMIN_USER_ID,
      },
    }),
    prisma.stores.create({
      data: {
        org_id: ORG_ID,
        store_code: 'ST-002',
        name: '新宿支店',
        address: '東京都新宿区○○1-2-3',
        area: '関東',
        emitter_no: 'EMIT-ST-002',
        created_by: ADMIN_USER_ID,
        updated_by: ADMIN_USER_ID,
      },
    }),
  ]);
  console.log(`  ✅ ${stores.length}件\n`);

  // 品目
  console.log('📋 品目マスター作成...');
  const items = await Promise.all([
    prisma.item_maps.create({
      data: {
        org_id: ORG_ID,
        item_label: '一般廃棄物（可燃ごみ）',
        default_unit: 'KG',
        jwnet_code: '0101',
        hazard: false,
        created_by: ADMIN_USER_ID,
        updated_by: ADMIN_USER_ID,
      },
    }),
    prisma.item_maps.create({
      data: {
        org_id: ORG_ID,
        item_label: '産業廃棄物（廃プラスチック）',
        default_unit: 'KG',
        jwnet_code: '0201',
        hazard: false,
        created_by: ADMIN_USER_ID,
        updated_by: ADMIN_USER_ID,
      },
    }),
  ]);
  console.log(`  ✅ ${items.length}件\n`);

  // 単価マスター
  console.log('📋 単価マスター作成...');
  let wasteTypeCount = 0;
  for (const collector of collectors) {
    for (const item of items) {
      await prisma.waste_type_masters.create({
        data: {
          org_id: ORG_ID,
          collector_id: collector.id,
          waste_type_code: `WT-${item.jwnet_code}`,
          waste_type_name: item.item_label,
          waste_category: item.hazard ? '特別管理産業廃棄物' : '産業廃棄物',
          waste_classification: item.hazard ? '危険物' : '一般',
          jwnet_waste_code: item.jwnet_code,
          unit_code: 'KG',
          unit_price: 50 + Math.floor(Math.random() * 20),
          billing_category: 'collection',
          billing_type_default: 'actual_quantity',
          created_by: ADMIN_USER_ID,
          updated_by: ADMIN_USER_ID,
        },
      });
      wasteTypeCount++;
    }
  }
  console.log(`  ✅ ${wasteTypeCount}件\n`);

  // 収集予定
  console.log('📋 収集予定作成...');
  const plans = [];
  for (let day = 0; day < 10; day++) {
    for (const store of stores) {
      for (const item of items) {
        const scheduledDate = new Date('2025-10-01');
        scheduledDate.setDate(scheduledDate.getDate() + day);
        
        const plan = await prisma.plans.create({
          data: {
            org_id: ORG_ID,
            store_id: store.id,
            item_map_id: item.id,
            collector_id: collectors[0].id,
            scheduled_date: scheduledDate,
            planned_qty: (20 + Math.floor(Math.random() * 30)).toString(),
            unit: 'KG',
            status: 'CONFIRMED',
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
        });
        plans.push(plan);
      }
    }
  }
  console.log(`  ✅ ${plans.length}件\n`);

  // 回収実績 (70%)
  console.log('📋 回収実績作成...');
  const actualsCount = Math.floor(plans.length * 0.7);
  for (let i = 0; i < actualsCount; i++) {
    const plan = plans[i];
    await prisma.actuals.create({
      data: {
        org_id: ORG_ID,
        plan_id: plan.id,
        actual_qty: (Number(plan.planned_qty) * (0.9 + Math.random() * 0.2)).toFixed(2),
        unit: plan.unit,
        vehicle_no: `車両-${i % 10}`,
        driver_name: '運転手A',
        weighing_ticket_no: `計量-${Date.now()}-${i}`,
        photo_urls: [],
        confirmed_at: new Date(),
        created_by: ADMIN_USER_ID,
        updated_by: ADMIN_USER_ID,
      },
    });
  }
  console.log(`  ✅ ${actualsCount}件\n`);

  // 請求明細
  console.log('📋 請求明細生成...');
  const billingMonth = new Date('2025-10-01');
  let billingCount = 0;

  for (let i = 0; i < actualsCount; i++) {
    const plan = plans[i];
    const actual = await prisma.actuals.findUnique({
      where: { plan_id: plan.id },
    });

    if (actual) {
      const wasteType = await prisma.waste_type_masters.findFirst({
        where: {
          org_id: ORG_ID,
          collector_id: plan.collector_id,
        },
      });

      if (wasteType) {
        const qty = Number(actual.actual_qty);
        const price = Number(wasteType.unit_price);
        const amount = qty * price;
        const tax = amount * 0.10;

        await prisma.app_billing_items.create({
          data: {
            org_id: ORG_ID,
            collector_id: plan.collector_id,
            store_id: plan.store_id,
            billing_month: billingMonth,
            billing_period_from: new Date('2025-10-01'),
            billing_period_to: new Date('2025-10-31'),
            billing_type: 'actual_quantity',
            item_name: wasteType.waste_type_name,
            item_code: wasteType.waste_type_code,
            waste_type_id: wasteType.id,
            unit_price: price,
            quantity: qty,
            unit: actual.unit,
            amount: amount,
            tax_rate: 0.10,
            tax_amount: tax,
            total_amount: amount + tax,
            status: 'DRAFT',
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
        });
        billingCount++;
      }
    }
  }
  console.log(`  ✅ ${billingCount}件\n`);

  // 請求サマリー
  console.log('📋 請求サマリー生成...');
  for (const collector of collectors) {
    const items = await prisma.app_billing_items.findMany({
      where: {
        org_id: ORG_ID,
        collector_id: collector.id,
        billing_month: billingMonth,
      },
    });

    if (items.length > 0) {
      const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
      const totalTax = items.reduce((sum, item) => sum + Number(item.tax_amount), 0);

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
          total_amount: totalAmount + totalTax,
          total_items_count: items.length,
          fixed_items_count: 0,
          metered_items_count: items.length,
          other_items_count: 0,
          status: 'DRAFT',
          created_by: ADMIN_USER_ID,
          updated_by: ADMIN_USER_ID,
        },
      });
    }
  }
  console.log(`  ✅ ${collectors.length}件\n`);

  console.log('🎉 シード完了\n');
  console.log('次: node scripts/diagnose-billing-data.mjs');
}

main()
  .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


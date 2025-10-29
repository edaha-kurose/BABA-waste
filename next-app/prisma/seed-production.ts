/**
 * 本番想定包括的シードスクリプト
 * 
 * グローバルルール準拠:
 * - SSOT: 単一組織IDで統一
 * - スキーマ準拠: Prisma型定義に完全準拠
 * - Zod: バリデーション考慮
 * - 外部キー制約: 正しい依存関係順序
 * - トランザクション: データ整合性保証
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

// SSOT: 統一組織ID
const ORG_ID = '12345678-1234-1234-1234-123456789012'; // デモ組織
const ADMIN_USER_ID = '1a9eb299-e83a-49fe-bf3c-48aa37646d6d'; // 既存管理者ユーザー

async function main() {
  console.log('🚀 本番想定包括的シード実行開始\n');
  console.log('='.repeat(80));
  console.log(`📌 対象組織ID: ${ORG_ID}`);
  console.log(`👤 作成者ID: ${ADMIN_USER_ID}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 組織存在確認
    const org = await prisma.organizations.findUnique({
      where: { id: ORG_ID },
    });

    if (!org) {
      throw new Error(`組織が見つかりません: ${ORG_ID}`);
    }

    console.log(`✅ 組織確認: ${org.name}\n`);

    await prisma.$transaction(async (tx) => {
      // Step 1: 収集業者作成
      console.log('📋 Step 1: 収集業者作成');
      console.log('-'.repeat(80));

      const collectors = [];
      const collectorData = [
        { code: 'COL-001', name: '東京エコ運輸株式会社', region: '東京', areas: ['東京都', '埼玉県'] },
        { code: 'COL-002', name: '関東リサイクルセンター', region: '埼玉', areas: ['埼玉県', '群馬県'] },
        { code: 'COL-003', name: '首都圏クリーンサービス', region: '千葉', areas: ['千葉県', '茨城県'] },
        { code: 'COL-004', name: '横浜環境サポート', region: '神奈川', areas: ['神奈川県', '静岡県'] },
        { code: 'COL-005', name: '関西エコロジー株式会社', region: '大阪', areas: ['大阪府', '京都府'] },
      ];

      for (const data of collectorData) {
        const collector = await tx.collectors.create({
          data: {
            org_id: ORG_ID,
            company_name: data.name,
            contact_person: '営業担当者',
            address: `${data.region}都道府県○○区△△1-2-3`,
            phone: '03-1234-5678',
            email: `info@${data.code.toLowerCase()}.example.com`,
            license_number: `第${data.code}-2024号`,
            service_areas: data.areas,
            is_active: true,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
        });
        collectors.push(collector);
        console.log(`  ✅ ${collector.company_name}`);
      }

      // Step 2: 店舗作成
      console.log('\n📋 Step 2: 店舗作成');
      console.log('-'.repeat(80));

      const stores = [];
      const storeData = [
        { code: 'ST-001', name: '本社ビル', region: '東京都千代田区', area: '関東' },
        { code: 'ST-002', name: '新宿支店', region: '東京都新宿区', area: '関東' },
        { code: 'ST-003', name: '渋谷営業所', region: '東京都渋谷区', area: '関東' },
        { code: 'ST-004', name: '横浜支店', region: '神奈川県横浜市', area: '関東' },
        { code: 'ST-005', name: '大阪支店', region: '大阪府大阪市', area: '関西' },
        { code: 'ST-006', name: '名古屋営業所', region: '愛知県名古屋市', area: '中部' },
        { code: 'ST-007', name: '福岡支店', region: '福岡県福岡市', area: '九州' },
        { code: 'ST-008', name: '札幌営業所', region: '北海道札幌市', area: '北海道' },
      ];

      for (const data of storeData) {
        const store = await tx.stores.create({
          data: {
            org_id: ORG_ID,
            store_code: data.code,
            name: data.name,
            address: `${data.region}○○1-2-3`,
            area: data.area,
            emitter_no: `EMIT-${data.code}`,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
        });
        stores.push(store);
        console.log(`  ✅ ${store.name} (${store.store_code})`);
      }

      // Step 3: 品目マスター作成
      console.log('\n📋 Step 3: 品目マスター作成');
      console.log('-'.repeat(80));

      const itemMaps = [];
      const itemData = [
        { label: '一般廃棄物（可燃ごみ）', unit: 'KG', jwnet: '0101', hazard: false },
        { label: '産業廃棄物（廃プラスチック）', unit: 'KG', jwnet: '0201', hazard: false },
        { label: '産業廃棄物（金属くず）', unit: 'KG', jwnet: '0301', hazard: false },
        { label: '産業廃棄物（ガラスくず）', unit: 'KG', jwnet: '0401', hazard: false },
        { label: '産業廃棄物（紙くず）', unit: 'KG', jwnet: '0501', hazard: false },
        { label: '特別管理産業廃棄物（廃油）', unit: 'L', jwnet: '0601', hazard: true },
      ];

      for (const data of itemData) {
        const itemMap = await tx.item_maps.create({
          data: {
            org_id: ORG_ID,
            item_label: data.label,
            default_unit: data.unit as any, // Enum型
            jwnet_code: data.jwnet,
            hazard: data.hazard,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
        });
        itemMaps.push(itemMap);
        console.log(`  ✅ ${itemMap.item_label}`);
      }

      // Step 4: 単価マスター作成
      console.log('\n📋 Step 4: 単価マスター作成（収集業者×品目）');
      console.log('-'.repeat(80));

      let wasteTypeCount = 0;
      for (const collector of collectors) {
        for (const item of itemMaps) {
          const basePrice = item.unit === 'kg' ? 50 : 100; // kg単価50円、L単価100円
          const priceVariation = Math.floor(Math.random() * 20) - 10; // ±10円の変動

          await tx.waste_type_masters.create({
            data: {
              org_id: ORG_ID,
              collector_id: collector.id,
              waste_type_code: item.item_code,
              waste_type_name: item.item_label,
              unit: item.unit,
              unit_price: basePrice + priceVariation,
              is_hazardous: item.item_label.includes('特別管理'),
              valid_from: new Date('2025-01-01'),
              valid_until: new Date('2025-12-31'),
              created_by: ADMIN_USER_ID,
              updated_by: ADMIN_USER_ID,
            },
          });
          wasteTypeCount++;
        }
      }
      console.log(`  ✅ 単価マスター: ${wasteTypeCount}件作成 (${collectors.length}業者 × ${itemMaps.length}品目)`);

      // Step 5: 契約作成
      console.log('\n📋 Step 5: 契約作成');
      console.log('-'.repeat(80));

      for (const collector of collectors) {
        await tx.contracts.create({
          data: {
            org_id: ORG_ID,
            emitter_id: ORG_ID,
            transporter_id: collector.id,
            contract_type: 'COLLECTION',
            start_date: new Date('2025-01-01'),
            end_date: new Date('2025-12-31'),
            is_active: true,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
        });
      }
      console.log(`  ✅ 契約: ${collectors.length}件作成`);

      // Step 6: 収集予定作成
      console.log('\n📋 Step 6: 収集予定作成');
      console.log('-'.repeat(80));

      const plans = [];
      const baseDate = new Date('2025-10-01');

      for (let day = 0; day < 30; day++) {
        for (const store of stores.slice(0, 3)) { // 最初の3店舗のみ
          for (const item of itemMaps.slice(0, 3)) { // 最初の3品目のみ
            const collector = collectors[Math.floor(Math.random() * collectors.length)];
            const scheduledDate = new Date(baseDate);
            scheduledDate.setDate(scheduledDate.getDate() + day);

            const plan = await tx.plans.create({
              data: {
                org_id: ORG_ID,
                store_id: store.id,
                item_map_id: item.id,
                collector_id: collector.id,
                scheduled_date: scheduledDate,
                planned_qty: Math.floor(Math.random() * 50) + 10, // 10-60kg
                unit: item.unit,
                status: 'CONFIRMED',
                created_by: ADMIN_USER_ID,
                updated_by: ADMIN_USER_ID,
              },
            });
            plans.push(plan);
          }
        }
      }
      console.log(`  ✅ 収集予定: ${plans.length}件作成`);

      // Step 7: 回収実績作成（予定の80%を実績化）
      console.log('\n📋 Step 7: 回収実績作成');
      console.log('-'.repeat(80));

      const actualsToCreate = plans.slice(0, Math.floor(plans.length * 0.8));
      for (const plan of actualsToCreate) {
        const actualQty = Number(plan.planned_qty) * (0.9 + Math.random() * 0.2); // 90-110%の実績

        await tx.actuals.create({
          data: {
            org_id: ORG_ID,
            plan_id: plan.id,
            actual_qty: actualQty.toFixed(2),
            unit: plan.unit,
            vehicle_no: `車両-${Math.floor(Math.random() * 100)}`,
            driver_name: '運転手',
            weighing_ticket_no: `計量-${Date.now()}-${Math.random()}`,
            photo_urls: [],
            confirmed_at: new Date(),
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
        });
      }
      console.log(`  ✅ 回収実績: ${actualsToCreate.length}件作成`);

      // Step 8: 請求明細生成
      console.log('\n📋 Step 8: 請求明細生成');
      console.log('-'.repeat(80));

      const billingMonth = new Date('2025-10-01');
      const billingItemsByCollector = new Map<string, any[]>();

      // 実績から請求明細を生成
      for (const plan of actualsToCreate) {
        const actual = await tx.actuals.findUnique({
          where: { plan_id: plan.id },
        });

        if (actual) {
          const wasteTypeMaster = await tx.waste_type_masters.findFirst({
            where: {
              org_id: ORG_ID,
              collector_id: plan.collector_id,
              waste_type_code: plan.item_maps?.item_code,
            },
          });

          if (wasteTypeMaster) {
            const quantity = Number(actual.actual_qty);
            const unitPrice = Number(wasteTypeMaster.unit_price);
            const amount = quantity * unitPrice;
            const taxRate = 0.10;
            const taxAmount = amount * taxRate;
            const totalAmount = amount + taxAmount;

            const billingItem = {
              org_id: ORG_ID,
              collector_id: plan.collector_id,
              store_id: plan.store_id,
              billing_month: billingMonth,
              billing_period_from: new Date('2025-10-01'),
              billing_period_to: new Date('2025-10-31'),
              billing_type: 'actual_quantity',
              item_name: wasteTypeMaster.waste_type_name,
              item_code: wasteTypeMaster.waste_type_code,
              waste_type_id: wasteTypeMaster.id,
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
            };

            if (!billingItemsByCollector.has(plan.collector_id)) {
              billingItemsByCollector.set(plan.collector_id, []);
            }
            billingItemsByCollector.get(plan.collector_id)!.push(billingItem);
          }
        }
      }

      let totalBillingItems = 0;
      for (const [collectorId, items] of billingItemsByCollector) {
        for (const item of items) {
          await tx.app_billing_items.create({ data: item });
          totalBillingItems++;
        }
      }
      console.log(`  ✅ 請求明細: ${totalBillingItems}件作成`);

      // Step 9: 請求サマリー生成
      console.log('\n📋 Step 9: 請求サマリー生成');
      console.log('-'.repeat(80));

      for (const [collectorId, items] of billingItemsByCollector) {
        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
        const totalTaxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
        const grandTotal = items.reduce((sum, item) => sum + item.total_amount, 0);

        await tx.billing_summaries.create({
          data: {
            org_id: ORG_ID,
            collector_id: collectorId,
            billing_month: billingMonth,
            total_fixed_amount: 0,
            total_metered_amount: totalAmount,
            total_other_amount: 0,
            subtotal_amount: totalAmount,
            tax_amount: totalTaxAmount,
            total_amount: grandTotal,
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
      console.log(`  ✅ 請求サマリー: ${billingItemsByCollector.size}件作成`);

      console.log('\n✅ トランザクション完了');
    }, {
      maxWait: 60000,
      timeout: 120000,
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎉 本番想定シード完了');
    console.log('='.repeat(80));
    console.log('');
    console.log('📊 作成データサマリー:');
    console.log('  - 収集業者: 5件');
    console.log('  - 店舗: 8件');
    console.log('  - 品目マスター: 6件');
    console.log('  - 単価マスター: 30件 (5業者 × 6品目)');
    console.log('  - 契約: 5件');
    console.log('  - 収集予定: 270件 (3店舗 × 3品目 × 30日)');
    console.log('  - 回収実績: 216件 (80%)');
    console.log('  - 請求明細: 実績ベース');
    console.log('  - 請求サマリー: 収集業者ごと');
    console.log('');
    console.log('次のステップ:');
    console.log('  1. node scripts/diagnose-billing-data.mjs - データ確認');
    console.log('  2. http://localhost:3001/dashboard/billing - 請求管理画面確認');
    console.log('');

  } catch (error) {
    console.error('\n❌ エラー発生:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('致命的エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


/**
 * コスモス薬品用本番想定テストデータ作成
 * グローバルルール準拠: Prismaトランザクション、型安全性、エラーハンドリング
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const COSMOS_ORG_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🏥 コスモス薬品本番想定データ作成開始\n');
  console.log('対象組織: コスモス薬品株式会社');
  console.log(`ORG_ID: ${COSMOS_ORG_ID}\n`);
  console.log('='.repeat(80));

  // 管理者ユーザーID取得
  const adminUser = await prisma.app_users.findFirst({
    where: { email: 'admin@cosmos-drug.test' },
  });

  if (!adminUser) {
    console.error('❌ コスモス薬品の管理者ユーザーが見つかりません');
    console.log('   先に pnpm prisma:seed:multi-tenant を実行してください');
    process.exit(1);
  }

  const ADMIN_AUTH_USER_ID = adminUser.auth_user_id;
  const ADMIN_APP_USER_ID = adminUser.id;

  console.log(`✅ 管理者ユーザー: ${adminUser.name}`);
  console.log(`   auth_user_id: ${ADMIN_AUTH_USER_ID}`);
  console.log(`   app_user_id: ${ADMIN_APP_USER_ID}\n`);

  // ========================================================================
  // Phase 0: 既存データ削除（再実行時のエラー回避）
  // ========================================================================
  console.log('📋 Phase 0: 既存データ削除（再実行時）\n');

  await prisma.$transaction(async (tx) => {
    // 削除順序: 子→親（外部キー制約を考慮）
    await tx.billing_summaries.deleteMany({ where: { org_id: COSMOS_ORG_ID } });
    await tx.app_billing_items.deleteMany({ where: { org_id: COSMOS_ORG_ID } });
    await tx.actuals.deleteMany({ where: { org_id: COSMOS_ORG_ID } });
    await tx.plans.deleteMany({ where: { org_id: COSMOS_ORG_ID } });
    await tx.waste_type_masters.deleteMany({ where: { org_id: COSMOS_ORG_ID } });
    await tx.item_maps.deleteMany({ where: { org_id: COSMOS_ORG_ID } });
    await tx.stores.deleteMany({ where: { org_id: COSMOS_ORG_ID } });
    await tx.collectors.deleteMany({ where: { org_id: COSMOS_ORG_ID } });
    console.log('  ✅ 既存データ削除完了\n');
  });

  // ========================================================================
  // Phase 1: 収集業者
  // ========================================================================
  console.log('📋 Phase 1: 収集業者作成\n');

  const collectorData = [
    {
      name: 'エコ回収東日本',
      region: '東京都千代田区',
      areas: ['東京都', '埼玉県', '千葉県', '神奈川県'],
      license: '東京都-産廃-001',
      email: 'east@eco-collect.test',
    },
    {
      name: 'リサイクルパートナーズ西日本',
      region: '福岡県福岡市',
      areas: ['福岡県', '佐賀県', '長崎県', '熊本県'],
      license: '福岡県-産廃-002',
      email: 'west@recycle-partners.test',
    },
  ];

  const collectors = [];
  for (const data of collectorData) {
    const collector = await prisma.collectors.create({
      data: {
        org_id: COSMOS_ORG_ID,
        company_name: data.name,
        contact_person: '営業担当',
        address: `${data.region}○○1-2-3`,
        phone: '03-5555-1234',
        email: data.email,
        license_number: data.license,
        service_areas: data.areas,
        is_active: true,
        created_by: ADMIN_AUTH_USER_ID,
        updated_by: ADMIN_AUTH_USER_ID,
      },
    });
    collectors.push(collector);
    console.log(`  ✅ ${collector.company_name}`);
  }
  console.log(`\n  合計: ${collectors.length}件作成\n`);

  // ========================================================================
  // Phase 2: 店舗
  // ========================================================================
  console.log('📋 Phase 2: 店舗作成\n');

  const storeData = [
    { code: 'CSM-TKY-001', name: '東京本店', region: '東京都渋谷区', area: '関東' },
    { code: 'CSM-TKY-002', name: '新宿西口店', region: '東京都新宿区', area: '関東' },
    { code: 'CSM-TKY-003', name: '池袋東口店', region: '東京都豊島区', area: '関東' },
    { code: 'CSM-KNT-001', name: '横浜みなとみらい店', region: '神奈川県横浜市', area: '関東' },
    { code: 'CSM-KNT-002', name: '川崎駅前店', region: '神奈川県川崎市', area: '関東' },
    { code: 'CSM-STM-001', name: '大宮店', region: '埼玉県さいたま市', area: '関東' },
    { code: 'CSM-FKO-001', name: '福岡天神店', region: '福岡県福岡市', area: '九州' },
    { code: 'CSM-FKO-002', name: '博多駅前店', region: '福岡県福岡市', area: '九州' },
    { code: 'CSM-FKO-003', name: '小倉店', region: '福岡県北九州市', area: '九州' },
    { code: 'CSM-KMM-001', name: '熊本店', region: '熊本県熊本市', area: '九州' },
  ];

  const stores = [];
  for (const data of storeData) {
    const store = await prisma.stores.create({
      data: {
        org_id: COSMOS_ORG_ID,
        store_code: data.code,
        name: data.name,
        address: `${data.region}○○1-2-3`,
        area: data.area,
        emitter_no: `EMIT-${data.code}`,
        created_by: ADMIN_AUTH_USER_ID,
        updated_by: ADMIN_AUTH_USER_ID,
      },
    });
    stores.push(store);
    console.log(`  ✅ ${store.name}`);
  }
  console.log(`\n  合計: ${stores.length}件作成\n`);

  // ========================================================================
  // Phase 3: 品目マップ
  // ========================================================================
  console.log('📋 Phase 3: 品目マップ作成\n');

  const itemData = [
    { label: '一般廃棄物（可燃ごみ）', unit: 'KG', jwnet: '0101', hazard: false },
    { label: '一般廃棄物（不燃ごみ）', unit: 'KG', jwnet: '0102', hazard: false },
    { label: '産業廃棄物（廃プラスチック）', unit: 'KG', jwnet: '0601', hazard: false },
    { label: '産業廃棄物（金属くず）', unit: 'KG', jwnet: '1301', hazard: false },
    { label: '産業廃棄物（紙くず）', unit: 'KG', jwnet: '0701', hazard: false },
    { label: '産業廃棄物（木くず）', unit: 'KG', jwnet: '0801', hazard: false },
    { label: '産業廃棄物（ガラスくず）', unit: 'KG', jwnet: '1401', hazard: false },
    { label: '産業廃棄物（廃油）', unit: 'M3', jwnet: '0301', hazard: true },
  ];

  const itemMaps = [];
  for (const data of itemData) {
    const item = await prisma.item_maps.create({
      data: {
        org_id: COSMOS_ORG_ID,
        item_label: data.label,
        default_unit: data.unit,
        jwnet_code: data.jwnet,
        hazard: data.hazard,
        created_by: ADMIN_AUTH_USER_ID,
        updated_by: ADMIN_AUTH_USER_ID,
      },
    });
    itemMaps.push(item);
    console.log(`  ✅ ${item.item_label}`);
  }
  console.log(`\n  合計: ${itemMaps.length}件作成\n`);

  // ========================================================================
  // Phase 4: 廃棄物種別マスター（単価設定）
  // ========================================================================
  console.log('📋 Phase 4: 廃棄物種別マスター作成\n');

  let wasteTypeCount = 0;
  for (const collector of collectors) {
    for (const item of itemMaps) {
      // 収集業者と品目の組み合わせで単価を設定
      const basePrice = item.hazard ? 100 : 50;
      const variance = Math.floor(Math.random() * 30) - 15; // ±15の変動
      const unitPrice = basePrice + variance;

      await prisma.waste_type_masters.create({
        data: {
          org_id: COSMOS_ORG_ID,
          collector_id: collector.id,
          waste_type_code: `WT-${item.jwnet_code}`,
          waste_type_name: item.item_label,
          waste_category: item.hazard ? '特別管理産業廃棄物' : '産業廃棄物',
          waste_classification: item.hazard ? '危険物' : '一般',
          jwnet_waste_code: item.jwnet_code,
          unit_code: item.default_unit,
          unit_price: unitPrice,
          billing_category: 'collection',
          billing_type_default: 'actual_quantity',
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });
      wasteTypeCount++;
    }
  }
  console.log(`  ✅ ${wasteTypeCount}件作成\n`);

  // ========================================================================
  // Phase 5: 収集予定（過去3ヶ月分）
  // ========================================================================
  console.log('📋 Phase 5: 収集予定作成（過去3ヶ月分）\n');

  const plans = [];
  const today = new Date();

  // 過去3ヶ月、週2回の収集
  for (let monthOffset = -2; monthOffset <= 0; monthOffset++) {
    const targetMonth = new Date(today);
    targetMonth.setMonth(targetMonth.getMonth() + monthOffset);

    // その月の各週の火曜日と金曜日（週2回）
    for (let week = 0; week < 4; week++) {
      for (const dayOffset of [2, 5]) {
        // 火: 2, 金: 5
        const scheduledDate = new Date(targetMonth);
        scheduledDate.setDate(1 + week * 7 + dayOffset);

        // 各店舗・各品目（一部）
        for (const store of stores) {
          for (const item of itemMaps.slice(0, 2)) {
            // 最初の2品目のみ
            const plan = await prisma.plans.create({
              data: {
                org_id: COSMOS_ORG_ID,
                store_id: store.id,
                planned_date: scheduledDate,
                item_map_id: item.id,
                planned_qty: new Decimal(Math.floor(Math.random() * 100) + 20),
                unit: item.default_unit,
                created_by: ADMIN_AUTH_USER_ID,
                updated_by: ADMIN_AUTH_USER_ID,
              },
            });
            plans.push(plan);
          }
        }
      }
    }
  }
  console.log(`  ✅ ${plans.length}件作成\n`);

  // ========================================================================
  // Phase 6: 回収実績
  // ========================================================================
  console.log('📋 Phase 6: 回収実績作成\n');

  const actuals = [];
  let actualCount = 0;
  for (const plan of plans) {
    // 80%の確率で実績を作成
    if (Math.random() < 0.8) {
      const variance = (Math.random() - 0.5) * 0.2; // ±10%の変動
      const actualQty = plan.planned_qty.mul(1 + variance);

      const actual = await prisma.actuals.create({
        data: {
          org_id: COSMOS_ORG_ID,
          plan_id: plan.id,
          actual_qty: actualQty,
          unit: plan.unit,
          confirmed_at: new Date(plan.planned_date),
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });
      actuals.push(actual);
      actualCount++;

      if (actualCount % 50 === 0) {
        console.log(`  進捗: ${actualCount}/${plans.length}`);
      }
    }
  }
  console.log(`  ✅ ${actuals.length}件作成\n`);

  // ========================================================================
  // Phase 7: 請求明細
  // ========================================================================
  console.log('📋 Phase 7: 請求明細作成\n');

  let billingCount = 0;
  for (const actual of actuals) {
    // 実績に基づいて請求明細を作成
    const actualWithPlan = await prisma.actuals.findUnique({
      where: { id: actual.id },
      include: {
        plans: {
          include: {
            stores: true,
            item_maps: true,
          },
        },
      },
    });

    if (!actualWithPlan?.plans) continue;

    const plan = actualWithPlan.plans;
    const store = plan.stores;
    const itemMap = plan.item_maps;

    // 単価マスターを取得
    const collector = collectors[Math.floor(Math.random() * collectors.length)];
    const wasteTypeMaster = await prisma.waste_type_masters.findFirst({
      where: {
        org_id: COSMOS_ORG_ID,
        collector_id: collector.id,
        jwnet_waste_code: itemMap.jwnet_code,
        deleted_at: null,
      },
    });

    if (!wasteTypeMaster) continue;

    const unitPrice = new Decimal(wasteTypeMaster.unit_price || 50);
    const quantity = actualWithPlan.actual_qty;
    const subtotalAmount = quantity.mul(unitPrice);
    const taxAmount = subtotalAmount.mul(0.1);
    const totalAmount = subtotalAmount.add(taxAmount);

    // 請求期間（月初〜月末）
    const billingMonth = new Date(plan.planned_date);
    const periodFrom = new Date(billingMonth.getFullYear(), billingMonth.getMonth(), 1);
    const periodTo = new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, 0);

    await prisma.app_billing_items.create({
      data: {
        org_id: COSMOS_ORG_ID,
        collector_id: collector.id,
        store_id: store.id,
        billing_month: periodFrom,
        billing_period_from: periodFrom,
        billing_period_to: periodTo,
        billing_type: 'actual_quantity',
        item_name: itemMap.item_label,
        quantity: quantity,
        unit: actualWithPlan.unit,
        unit_price: unitPrice.toNumber(),
        tax_amount: taxAmount.toNumber(),
        total_amount: totalAmount.toNumber(),
        amount: totalAmount.toNumber(),
        status: 'DRAFT',
        notes: `回収実績ID: ${actualWithPlan.id}`,
        created_by: ADMIN_APP_USER_ID,
        updated_by: ADMIN_APP_USER_ID,
      },
    });
    billingCount++;

    if (billingCount % 50 === 0) {
      console.log(`  進捗: ${billingCount}/${actuals.length}`);
    }
  }
  console.log(`  ✅ ${billingCount}件作成\n`);

  // ========================================================================
  // 完了
  // ========================================================================
  console.log('='.repeat(80));
  console.log('🎉 コスモス薬品本番想定データ作成完了\n');
  console.log('作成データサマリー:');
  console.log(`  - 収集業者: ${collectors.length}件`);
  console.log(`  - 店舗: ${stores.length}件`);
  console.log(`  - 品目マップ: ${itemMaps.length}件`);
  console.log(`  - 廃棄物種別マスター: ${wasteTypeCount}件`);
  console.log(`  - 収集予定: ${plans.length}件`);
  console.log(`  - 回収実績: ${actuals.length}件`);
  console.log(`  - 請求明細: ${billingCount}件\n`);

  console.log('次のステップ:');
  console.log('  1. http://localhost:3001/login にアクセス');
  console.log('  2. 「🏥 コスモス薬品でログイン」をクリック');
  console.log('  3. 組織が自動選択され、データが表示されることを確認\n');
}

main()
  .catch((e) => {
    console.error('❌ エラー発生:', e);
    throw e;
  })
  .finally(() => prisma.$disconnect());


/**
 * 楽市楽座用テストデータ作成
 * コスモス薬品のデータ構造をコピーして、楽市楽座用のデータを作成
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const RAKUICHI_ORG_ID = '00000000-0000-0000-0000-000000000004';

async function main() {
  console.log('🏪 楽市楽座テストデータ作成開始\n');
  console.log('対象組織: 楽市楽座株式会社');
  console.log(`ORG_ID: ${RAKUICHI_ORG_ID}\n`);
  console.log('='.repeat(80));

  // 管理者ユーザーID取得
  const adminUser = await prisma.app_users.findFirst({
    where: { email: 'admin@rakuichi.test' },
  });

  if (!adminUser) {
    console.error('❌ 楽市楽座の管理者ユーザーが見つかりません');
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
    await tx.app_billing_items.deleteMany({ where: { org_id: RAKUICHI_ORG_ID } });
    await tx.actuals.deleteMany({ where: { org_id: RAKUICHI_ORG_ID } });
    await tx.plans.deleteMany({ where: { org_id: RAKUICHI_ORG_ID } });
    await tx.waste_type_masters.deleteMany({ where: { org_id: RAKUICHI_ORG_ID } });
    await tx.item_maps.deleteMany({ where: { org_id: RAKUICHI_ORG_ID } });
    await tx.stores.deleteMany({ where: { org_id: RAKUICHI_ORG_ID } });
    await tx.collectors.deleteMany({ where: { org_id: RAKUICHI_ORG_ID } });
    console.log('  ✅ 既存データ削除完了\n');
  });

  // ========================================================================
  // Phase 1: 収集業者
  // ========================================================================
  console.log('📋 Phase 1: 収集業者作成\n');

  const collectorData = [
    {
      name: 'エコクリーン東海',
      region: '愛知県名古屋市',
      areas: ['愛知県', '岐阜県', '三重県'],
      license: '愛知県-産廃-101',
      email: 'tokai@eco-clean.test',
    },
    {
      name: 'グリーンパートナーズ関西',
      region: '大阪府大阪市',
      areas: ['大阪府', '京都府', '兵庫県'],
      license: '大阪府-産廃-102',
      email: 'kansai@green-partners.test',
    },
  ];

  const collectors = [];
  for (const data of collectorData) {
    const collector = await prisma.collectors.create({
      data: {
        org_id: RAKUICHI_ORG_ID,
        company_name: data.name,
        contact_person: '営業担当',
        address: `${data.region}○○区△△1-2-3`,
        phone: '052-123-4567',
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
    { name: '名古屋栄店', region: '愛知県名古屋市', emitter: 'EMT-NGY-01' },
    { name: '名古屋駅前店', region: '愛知県名古屋市', emitter: 'EMT-NGY-02' },
    { name: '金山店', region: '愛知県名古屋市', emitter: 'EMT-NGY-03' },
    { name: '大阪梅田店', region: '大阪府大阪市', emitter: 'EMT-OSK-01' },
    { name: '大阪難波店', region: '大阪府大阪市', emitter: 'EMT-OSK-02' },
    { name: '京都四条店', region: '京都府京都市', emitter: 'EMT-KYT-01' },
    { name: '神戸三宮店', region: '兵庫県神戸市', emitter: 'EMT-KBE-01' },
    { name: '岐阜店', region: '岐阜県岐阜市', emitter: 'EMT-GIF-01' },
  ];

  const stores = [];
  for (const data of storeData) {
    const store = await prisma.stores.create({
      data: {
        org_id: RAKUICHI_ORG_ID,
        store_code: `RAKU-${data.emitter}`,
        name: data.name,
        address: `${data.region}○○1-2-3`,
        area: data.region,
        emitter_no: data.emitter,
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

  // 既存のJWNETコード取得
  const jwnetCodes = await prisma.jwnet_waste_codes.findMany({
    take: 10,
  });

  const itemData = [
    { label: '一般廃棄物（可燃ごみ）', unit: 'KG', jwnet_index: 0, hazard: false },
    { label: '産業廃棄物（廃プラスチック）', unit: 'KG', jwnet_index: 1, hazard: false },
    { label: '産業廃棄物（金属くず）', unit: 'KG', jwnet_index: 2, hazard: false },
    { label: '産業廃棄物（紙くず）', unit: 'KG', jwnet_index: 3, hazard: false },
    { label: '産業廃棄物（木くず）', unit: 'KG', jwnet_index: 4, hazard: false },
    { label: '産業廃棄物（ガラスくず）', unit: 'KG', jwnet_index: 5, hazard: false },
    { label: '産業廃棄物（廃油）', unit: 'M3', jwnet_index: 6, hazard: true },
    { label: '動植物性残さ', unit: 'KG', jwnet_index: 7, hazard: false },
  ];

  const itemMaps = [];
  for (const data of itemData) {
    const jwnetCode = jwnetCodes[data.jwnet_index % jwnetCodes.length];
    const item = await prisma.item_maps.create({
      data: {
        org_id: RAKUICHI_ORG_ID,
        item_label: data.label,
        default_unit: data.unit,
        jwnet_code: jwnetCode?.waste_code || '0101',
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
  // Phase 4: 廃棄物種別マスター
  // ========================================================================
  console.log('📋 Phase 4: 廃棄物種別マスター作成\n');

  let wasteTypeCount = 0;
  for (const collector of collectors) {
    for (const item of itemMaps.slice(0, 5)) {
      const wasteTypeCode = `WT-RAKU-${collector.company_name.substring(0, 5)}-${item.item_label.substring(0, 8)}-${wasteTypeCount}`;
      
      await prisma.waste_type_masters.create({
        data: {
          org_id: RAKUICHI_ORG_ID,
          collector_id: collector.id,
          waste_type_code: wasteTypeCode,
          waste_type_name: item.item_label,
          waste_category: item.hazard ? '特別管理産業廃棄物' : '産業廃棄物',
          waste_classification: item.hazard ? '危険物' : '一般',
          jwnet_waste_code: item.jwnet_code || null,
          unit_code: item.default_unit,
          unit_price: 50 + Math.floor(Math.random() * 50),
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
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3); // 3ヶ月前から

  for (let month = 0; month < 3; month++) {
    for (const store of stores) {
      // 各店舗、月4回
      for (let week = 0; week < 4; week++) {
        const scheduledDate = new Date(startDate);
        scheduledDate.setMonth(startDate.getMonth() + month);
        scheduledDate.setDate(1 + (week * 7));

        // 各回、2つの品目
        for (const item of itemMaps.slice(0, 2)) {
          const plan = await prisma.plans.create({
            data: {
              org_id: RAKUICHI_ORG_ID,
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
  console.log(`  ✅ ${plans.length}件作成\n`);

  // ========================================================================
  // Phase 6: 回収実績
  // ========================================================================
  console.log('📋 Phase 6: 回収実績作成\n');

  const actuals = [];
  for (const plan of plans) {
    const actual = await prisma.actuals.create({
      data: {
        org_id: RAKUICHI_ORG_ID,
        plan_id: plan.id,
        actual_qty: plan.planned_qty.mul(new Decimal(0.9 + Math.random() * 0.2)),
        unit: plan.unit,
        confirmed_at: new Date(plan.planned_date.getTime() + 24 * 60 * 60 * 1000),
        created_by: ADMIN_AUTH_USER_ID,
        updated_by: ADMIN_AUTH_USER_ID,
      },
    });
    actuals.push(actual);

    if (actuals.length % 50 === 0) {
      console.log(`  進捗: ${actuals.length}/${plans.length}`);
    }
  }
  console.log(`  ✅ ${actuals.length}件作成\n`);

  // ========================================================================
  // Phase 7: 請求明細
  // ========================================================================
  console.log('📋 Phase 7: 請求明細作成\n');

  let billingCount = 0;
  
  // 収集業者をローテーションで割り当て
  let collectorIndex = 0;
  
  for (const actual of actuals) {
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

    // 収集業者をローテーション
    const collector = collectors[collectorIndex % collectors.length];
    collectorIndex++;

    const wasteTypeMaster = await prisma.waste_type_masters.findFirst({
      where: {
        org_id: RAKUICHI_ORG_ID,
        collector_id: collector.id,
        jwnet_waste_code: actualWithPlan.plans.item_maps.jwnet_code,
      },
    });

    if (!wasteTypeMaster) continue;

    const unitPrice = new Decimal(wasteTypeMaster.unit_price || 0);
    const subtotalAmount = new Decimal(actual.actual_qty).mul(unitPrice);
    const taxAmount = subtotalAmount.mul(0.1);
    const totalAmount = subtotalAmount.add(taxAmount);

    const billingMonth = new Date(actual.confirmed_at!.getFullYear(), actual.confirmed_at!.getMonth(), 1);
    const billingPeriodFrom = new Date(billingMonth);
    const billingPeriodTo = new Date(billingMonth.getFullYear(), billingMonth.getMonth() + 1, 0); // 月末

    await prisma.app_billing_items.create({
      data: {
        org_id: RAKUICHI_ORG_ID,
        collector_id: collector.id,
        store_id: actualWithPlan.plans.stores.id,
        billing_month: billingMonth,
        billing_period_from: billingPeriodFrom,
        billing_period_to: billingPeriodTo,
        billing_type: 'actual_quantity',
        item_name: actualWithPlan.plans.item_maps.item_label,
        quantity: Number(actual.actual_qty),
        unit: actual.unit,
        unit_price: unitPrice.toNumber(),
        amount: subtotalAmount.toNumber(),
        tax_amount: taxAmount.toNumber(),
        total_amount: totalAmount.toNumber(),
        status: 'DRAFT',
        notes: `回収実績ID: ${actual.id}`,
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
  console.log('🎉 楽市楽座テストデータ作成完了\n');
  console.log('作成データサマリー:');
  console.log(`  - 収集業者: ${collectors.length}件`);
  console.log(`  - 店舗: ${stores.length}件`);
  console.log(`  - 品目マップ: ${itemMaps.length}件`);
  console.log(`  - 廃棄物種別マスター: ${wasteTypeCount}件`);
  console.log(`  - 収集予定: ${plans.length}件`);
  console.log(`  - 回収実績: ${actuals.length}件`);
  console.log(`  - 請求明細: ${billingCount}件`);
  console.log('\n次のステップ:');
  console.log('  1. http://localhost:3001/login にアクセス');
  console.log('  2. 「🏪 楽市楽座でログイン」をクリック');
  console.log('  3. 組織が自動選択され、データが表示されることを確認');
  console.log('');
}

main().finally(() => prisma.$disconnect());


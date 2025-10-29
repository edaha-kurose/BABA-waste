/**
 * 本番相当の大量テストデータ作成
 * 対象組織: デモ組織 (12345678-1234-1234-1234-123456789012)
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const ORG_ID = '12345678-1234-1234-1234-123456789012'; // デモ組織
const ADMIN_AUTH_USER_ID = '1a9eb299-e83a-49fe-bf3c-48aa37646d6d'; // admin@test.com の auth_user_id

async function main() {
  console.log('🚀 本番相当データ作成開始\n');
  console.log('対象組織: デモ組織');
  console.log(`ORG_ID: ${ORG_ID}\n`);
  console.log('='.repeat(80));

  // ========================================================================
  // Phase 0: JWNETコード作成（トランザクション外）
  // ========================================================================
  console.log('\n📋 Phase 0: JWNETコード作成（全組織共通）\n');
  const jwnetCodes = [];
  const wasteCategories = [
    { code: '0101', name: '燃え殻' },
    { code: '0201', name: '汚泥' },
    { code: '0301', name: '廃油' },
    { code: '0401', name: '廃酸' },
    { code: '0501', name: '廃アルカリ' },
    { code: '0601', name: '廃プラスチック類' },
    { code: '0701', name: '紙くず' },
    { code: '0801', name: '木くず' },
    { code: '0901', name: '繊維くず' },
    { code: '1001', name: '動植物性残さ' },
    { code: '1101', name: '動物系固形不要物' },
    { code: '1201', name: 'ゴムくず' },
    { code: '1301', name: '金属くず' },
    { code: '1401', name: 'ガラスくず、コンクリートくず及び陶磁器くず' },
    { code: '1501', name: '鉱さい' },
    { code: '1601', name: 'がれき類' },
    { code: '1701', name: '動物のふん尿' },
    { code: '1801', name: '動物の死体' },
    { code: '1901', name: 'ばいじん' },
    { code: '2001', name: '13号廃棄物（処分するために処理したもの）' },
  ];

  for (let i = 0; i < 50; i++) { // 200→50に削減
    const baseCategory = wasteCategories[i % wasteCategories.length];
    const variant = Math.floor(i / wasteCategories.length) + 1;
    
    const wasteCode = `${baseCategory.code}-${String(variant).padStart(2, '0')}`;
    
    // 既存のコードをチェック
    const existing = await prisma.jwnet_waste_codes.findUnique({
      where: { waste_code: wasteCode },
    });
    
    if (existing) {
      jwnetCodes.push(existing);
    } else {
      const jwnetCode = await prisma.jwnet_waste_codes.create({
        data: {
          waste_code: wasteCode,
          waste_name: `${baseCategory.name} (タイプ${variant})`,
          waste_category: baseCategory.name,
          waste_type: '普通',
          unit_code: 'KG',
          unit_name: 'キログラム',
        },
      });
      jwnetCodes.push(jwnetCode);
    }
  }
  console.log(`  ✅ ${jwnetCodes.length}件作成\n`);

  // ========================================================================
  // Phase 1: 初期設定データ
  // ========================================================================
  console.log('\n📋 Phase 1: 初期設定データ作成\n');

  // 1-2. 収集業者 (5件)
  console.log('1-2. 収集業者作成中...');
  const collectorData = [
      { name: 'エコ回収東日本', region: '東京都', areas: ['東京都', '埼玉県', '千葉県', '神奈川県'], license: '東京都-産廃-001', email: 'east@eco-collect.jp' },
      { name: 'グリーンリサイクル西日本', region: '大阪府', areas: ['大阪府', '京都府', '兵庫県', '奈良県'], license: '大阪府-産廃-002', email: 'west@green-recycle.jp' },
      { name: '環境サービス中部', region: '愛知県', areas: ['愛知県', '岐阜県', '三重県', '静岡県'], license: '愛知県-産廃-003', email: 'chubu@kankyo-service.jp' },
      { name: 'クリーンテック九州', region: '福岡県', areas: ['福岡県', '熊本県', '大分県', '佐賀県'], license: '福岡県-産廃-004', email: 'kyushu@clean-tech.jp' },
      { name: 'リサイクルパートナーズ北日本', region: '宮城県', areas: ['宮城県', '岩手県', '青森県', '秋田県'], license: '宮城県-産廃-005', email: 'north@recycle-partners.jp' },
    ];

    const collectors = [];
    for (const data of collectorData) {
      const collector = await prisma.collectors.create({
        data: {
          org_id: ORG_ID,
          company_name: data.name,
          contact_person: '営業担当',
          address: `${data.region}○○区△△1-2-3`,
          phone: '03-1234-5678',
          email: data.email,
          license_number: data.license,
          service_areas: data.areas,
          is_active: true,
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });
      collectors.push(collector);
    }
    console.log(`  ✅ ${collectors.length}件作成\n`);

    // 1-3. 店舗 (10件)
    console.log('1-3. 店舗作成中...');
    const storeData = [
      { region: '東京都', prefix: 'TKY' },
      { region: '大阪府', prefix: 'OSK' },
      { region: '愛知県', prefix: 'ACH' },
      { region: '福岡県', prefix: 'FKO' },
      { region: '宮城県', prefix: 'MYG' },
    ];

    const stores = [];
    for (let i = 0; i < 10; i++) {
      const region = storeData[i % storeData.length];
      const storeNumber = Math.floor(i / storeData.length) + 1;
      
      const store = await prisma.stores.create({
        data: {
          org_id: ORG_ID,
          store_code: `${region.prefix}-${String(storeNumber).padStart(3, '0')}`,
          name: `${region.region}店舗${storeNumber}`,
          address: `${region.region}○○市△△区××1-2-3`,
          area: region.region,
          emitter_no: `EMIT-${region.prefix}-${storeNumber}`,
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });
      stores.push(store);
    }
    console.log(`  ✅ ${stores.length}件作成\n`);

    // ========================================================================
    // Phase 2: マスター設定データ
    // ========================================================================
    console.log('\n📋 Phase 2: マスター設定データ作成\n');

    // 2-1. 品目マップ (20件)
    console.log('2-1. 品目マップ作成中...');
    const itemData = [
      { label: '一般廃棄物（可燃ごみ）', unit: 'KG', jwnet_index: 0, hazard: false },
      { label: '一般廃棄物（不燃ごみ）', unit: 'KG', jwnet_index: 1, hazard: false },
      { label: '産業廃棄物（廃プラスチック）', unit: 'KG', jwnet_index: 6, hazard: false },
      { label: '産業廃棄物（金属くず）', unit: 'KG', jwnet_index: 13, hazard: false },
      { label: '産業廃棄物（紙くず）', unit: 'KG', jwnet_index: 7, hazard: false },
      { label: '産業廃棄物（木くず）', unit: 'KG', jwnet_index: 8, hazard: false },
      { label: '産業廃棄物（ガラスくず）', unit: 'KG', jwnet_index: 14, hazard: false },
      { label: '産業廃棄物（がれき類）', unit: 'KG', jwnet_index: 16, hazard: false },
      { label: '産業廃棄物（汚泥）', unit: 'KG', jwnet_index: 2, hazard: false },
      { label: '産業廃棄物（廃油）', unit: 'M3', jwnet_index: 3, hazard: true },
      { label: '動植物性残さ', unit: 'KG', jwnet_index: 10, hazard: false },
      { label: 'ゴムくず', unit: 'KG', jwnet_index: 12, hazard: false },
    ];

    const itemMaps = [];
    for (const data of itemData) {
      const jwnetCode = jwnetCodes[data.jwnet_index % jwnetCodes.length];
      const item = await prisma.item_maps.create({
        data: {
          org_id: ORG_ID,
          item_label: data.label,
          default_unit: data.unit,
          jwnet_code: jwnetCode.waste_code,
          hazard: data.hazard,
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });
      itemMaps.push(item);
    }
    console.log(`  ✅ ${itemMaps.length}件作成\n`);

    // 2-2. 廃棄物種別マスター (50件)
    console.log('2-2. 廃棄物種別マスター作成中...');
    let wasteTypeCount = 0;
    for (const collector of collectors) {
      for (const item of itemMaps.slice(0, 10)) { // 各業者10種類
        await prisma.waste_type_masters.create({
          data: {
            org_id: ORG_ID,
            collector_id: collector.id,
            waste_type_code: `WT-${collector.company_name.substring(0, 3)}-${item.item_label.substring(0, 5)}`,
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

    // 2-3. 店舗×品目×業者の紐付け (250件)
    console.log('2-3. 店舗×品目×業者の紐付け作成中...');
    let assignmentCount = 0;
    for (const store of stores) {
      // 各店舗に5つの品目
      const storeItems = itemMaps.slice(0, 5);
      for (const item of storeItems) {
        // 各品目に担当業者を割り当て
        const collector = collectors[assignmentCount % collectors.length];
        
        await prisma.store_item_collectors.create({
          data: {
            org_id: ORG_ID,
            store_id: store.id,
            item_map_id: item.id,
            collector_id: collector.id,
            priority: 1,
            created_by: ADMIN_AUTH_USER_ID,
            updated_by: ADMIN_AUTH_USER_ID,
          },
        });
        assignmentCount++;
      }
    }
    console.log(`  ✅ ${assignmentCount}件作成\n`);

    // ========================================================================
    // Phase 3: 日常運用データ（1年分）
    // ========================================================================
    console.log('\n📋 Phase 3: 日常運用データ作成（1年分）\n');

    // 3-1. 収集予定（6,000件: 50店舗×月4回×12ヶ月）
    console.log('3-1. 収集予定作成中...');
    const plans = [];
    const startDate = new Date('2024-01-01');
    
    for (let month = 0; month < 12; month++) {
      for (const store of stores) {
        // 各店舗、月4回
        for (let week = 0; week < 4; week++) {
          const scheduledDate = new Date(startDate);
          scheduledDate.setMonth(month);
          scheduledDate.setDate(1 + (week * 7));
          
          // 各回、2つの品目
          for (const item of itemMaps.slice(0, 2)) {
            const collector = collectors[plans.length % collectors.length];
            
            const plan = await prisma.plans.create({
              data: {
                org_id: ORG_ID,
                store_id: store.id,
                planned_date: scheduledDate,
                item_map_id: item.id,
                collector_id: collector.id,
                planned_qty: new Decimal(Math.floor(Math.random() * 100) + 10),
                unit: item.default_unit,
                status: 'CONFIRMED',
                created_by: ADMIN_AUTH_USER_ID,
                updated_by: ADMIN_AUTH_USER_ID,
              },
            });
            plans.push(plan);
          }
        }
      }
      console.log(`  月: ${month + 1}/12 完了`);
    }
    console.log(`  ✅ ${plans.length}件作成\n`);

    // 3-2. 回収実績（6,000件: 全予定から）
    console.log('3-2. 回収実績作成中...');
    const actuals = [];
    for (const plan of plans) {
      const actual = await prisma.actuals.create({
        data: {
          org_id: ORG_ID,
          plan_id: plan.id,
          actual_qty: plan.planned_qty.mul(new Decimal(0.9 + Math.random() * 0.2)), // 90〜110%
          unit: plan.unit,
          confirmed_at: new Date(plan.planned_date.getTime() + 24 * 60 * 60 * 1000), // 翌日確定
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });
      actuals.push(actual);
      
      if (actuals.length % 1000 === 0) {
        console.log(`  実績: ${actuals.length}/${plans.length} 作成完了`);
      }
    }
    console.log(`  ✅ ${actuals.length}件作成\n`);

  console.log('\n' + '='.repeat(80));
  console.log('🎉 本番相当データ作成完了\n');
  console.log('次のステップ:');
  console.log('  1. pnpm prisma:seed:billing-actuals-demo - 請求明細生成（6,000件）');
  console.log('  2. http://localhost:3001/dashboard - ブラウザで確認');
  console.log('');
}

main().finally(() => prisma.$disconnect());


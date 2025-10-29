// ============================================================================
// 完全版Seedスクリプト: 請求機能に必須のマスターデータ + トランザクションデータ
// ============================================================================

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '12345678-1234-1234-1234-123456789012'; // デモ組織
const ADMIN_AUTH_USER_ID = '1a9eb299-e83a-49fe-bf3c-48aa37646d6d';

const log = {
  section: (msg: string) => console.log(`\n${'='.repeat(60)}\n${msg}`),
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
};

async function main() {
  log.section('🌱 完全版シード開始');

  try {
    // ============================================================================
    // 1. 収集業者取得
    // ============================================================================
    log.section('🚚 収集業者確認');
    
    const collector = await prisma.collectors.findFirst({
      where: { org_id: ORG_ID },
    });

    if (!collector) {
      throw new Error('収集業者が見つかりません。先にseed-final.tsを実行してください');
    }

    log.success(`収集業者: ${collector.company_name}`);

    // ============================================================================
    // 2. 廃棄物種別マスター作成（単価設定込み）
    // ============================================================================
    log.section('🗑️  廃棄物種別マスター作成');

    const wasteTypes = [
      { code: 'W01', name: '燃え殻', category: '燃え殻', classification: '産業廃棄物', unit: 'TON', unit_price: 15000, is_hazardous: false },
      { code: 'W02', name: '汚泥', category: '汚泥', classification: '産業廃棄物', unit: 'TON', unit_price: 20000, is_hazardous: false },
      { code: 'W03', name: '廃油', category: '廃油', classification: '産業廃棄物', unit: 'L', unit_price: 50, is_hazardous: true },
      { code: 'W04', name: '廃酸', category: '廃酸', classification: '産業廃棄物', unit: 'L', unit_price: 60, is_hazardous: true },
      { code: 'W05', name: '廃アルカリ', category: '廃アルカリ', classification: '産業廃棄物', unit: 'L', unit_price: 60, is_hazardous: true },
      { code: 'W06', name: '廃プラスチック類', category: '廃プラスチック', classification: '産業廃棄物', unit: 'KG', unit_price: 30, is_hazardous: false },
      { code: 'W07', name: '紙くず', category: '紙くず', classification: '産業廃棄物', unit: 'KG', unit_price: 10, is_hazardous: false },
      { code: 'W08', name: '木くず', category: '木くず', classification: '産業廃棄物', unit: 'TON', unit_price: 8000, is_hazardous: false },
      { code: 'W09', name: '繊維くず', category: '繊維くず', classification: '産業廃棄物', unit: 'KG', unit_price: 15, is_hazardous: false },
      { code: 'W10', name: '動植物性残さ', category: '動植物性残さ', classification: '産業廃棄物', unit: 'KG', unit_price: 20, is_hazardous: false },
      { code: 'W11', name: 'ゴムくず', category: 'ゴムくず', classification: '産業廃棄物', unit: 'KG', unit_price: 25, is_hazardous: false },
      { code: 'W12', name: '金属くず', category: '金属くず', classification: '産業廃棄物', unit: 'TON', unit_price: 5000, is_hazardous: false },
      { code: 'W13', name: 'ガラス・陶磁器くず', category: 'ガラス', classification: '産業廃棄物', unit: 'TON', unit_price: 12000, is_hazardous: false },
      { code: 'W14', name: '鉱さい', category: '鉱さい', classification: '産業廃棄物', unit: 'TON', unit_price: 18000, is_hazardous: false },
      { code: 'W15', name: 'がれき類', category: 'がれき類', classification: '産業廃棄物', unit: 'TON', unit_price: 7000, is_hazardous: false },
      { code: 'W16', name: 'ばいじん', category: 'ばいじん', classification: '特別管理産業廃棄物', unit: 'TON', unit_price: 25000, is_hazardous: true },
      { code: 'W17', name: '蛍光灯', category: '蛍光灯', classification: '特別管理産業廃棄物', unit: 'PCS', unit_price: 100, is_hazardous: true },
      { code: 'W18', name: '電池', category: '電池', classification: '特別管理産業廃棄物', unit: 'KG', unit_price: 80, is_hazardous: true },
      { code: 'W19', name: '混合廃棄物', category: '混合廃棄物', classification: '産業廃棄物', unit: 'TON', unit_price: 22000, is_hazardous: false },
      { code: 'W20', name: '一般廃棄物', category: '一般廃棄物', classification: '一般廃棄物', unit: 'KG', unit_price: 25, is_hazardous: false },
    ];

    const createdWasteTypes = [];
    for (const wt of wasteTypes) {
      const created = await prisma.waste_type_masters.upsert({
        where: {
          org_id_collector_id_waste_type_code: {
            org_id: ORG_ID,
            collector_id: collector.id,
            waste_type_code: wt.code,
          },
        },
        create: {
          org_id: ORG_ID,
          collector_id: collector.id,
          waste_type_code: wt.code,
          waste_type_name: wt.name,
          waste_category: wt.category,
          waste_classification: wt.classification,
          unit_code: wt.unit,
          unit_price: wt.unit_price,
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
        update: {
          waste_type_name: wt.name,
          waste_category: wt.category,
          waste_classification: wt.classification,
          unit_code: wt.unit,
          unit_price: wt.unit_price,
          deleted_at: null,
          updated_at: new Date(),
        },
      });
      createdWasteTypes.push(created);
    }

    log.success(`廃棄物種別マスター: ${createdWasteTypes.length}件`);

    // ============================================================================
    // 3. 契約マスター作成
    // ============================================================================
    log.section('📄 契約マスター作成');

    const stores = await prisma.stores.findMany({
      where: { org_id: ORG_ID },
      take: 10,
    });

    if (stores.length === 0) {
      throw new Error('店舗が見つかりません。先にseed-final.tsを実行してください');
    }

    // contractsテーブルにunique制約がないため、既存チェック後に作成
    const existingContracts = await prisma.contracts.findMany({
      where: {
        org_id: ORG_ID,
        emitter_id: ORG_ID,
      },
    });

    const contracts = [];
    if (existingContracts.length === 0) {
      // デモ用に1件作成（排出事業者=収集業者=デモ組織）
      const contract = await prisma.contracts.create({
        data: {
          org_id: ORG_ID,
          emitter_id: ORG_ID, // 排出事業者（デモ組織）
          transporter_id: ORG_ID, // 収集運搬業者（デモ組織）
          disposer_id: null,
          scope: { description: '産業廃棄物の収集運搬' },
          valid_from: new Date('2024-01-01'),
          valid_to: new Date('2024-12-31'),
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });
      contracts.push(contract);
    } else {
      contracts.push(...existingContracts);
    }

    log.success(`契約マスター: ${contracts.length}件`);

    // ============================================================================
    // 4. 請求明細作成（実績データから生成）
    // ============================================================================
    log.section('💰 請求明細作成');

    const allActuals = await prisma.actuals.findMany({
      where: {
        org_id: ORG_ID,
      },
      include: {
        plans: {
          include: {
            stores: true,
            item_maps: true,
          },
        },
      },
      take: 100,
    });

    // confirmed_atがnullでないものだけフィルタ
    const actuals = allActuals.filter((a) => a.confirmed_at !== null);

    log.info(`実績データ: ${actuals.length}件`);

    const billingItems = [];
    for (const actual of actuals) {
      if (!actual.plans || !actual.confirmed_at) continue;

      const store = actual.plans.stores;
      const itemMap = actual.plans.item_maps;

      // 対応する廃棄物種別マスターを検索
      const wasteType = createdWasteTypes.find((wt) =>
        itemMap.item_label.includes(wt.waste_type_name.substring(0, 3))
      ) || createdWasteTypes[0];

      const quantity = Number(actual.actual_qty);
      const unitPrice = Number(wasteType.unit_price || 0);
      const amount = quantity * unitPrice;
      const taxRate = 0.1;
      const taxAmount = Math.floor(amount * taxRate);
      const totalAmount = amount + taxAmount;

      const billingMonth = new Date(
        actual.confirmed_at.getFullYear(),
        actual.confirmed_at.getMonth(),
        1
      );

      const billingItem = await prisma.app_billing_items.create({
        data: {
          org_id: ORG_ID,
          collector_id: collector.id,
          store_id: store.id,
          collection_id: null,
          billing_month: billingMonth,
          billing_period_from: actual.confirmed_at,
          billing_period_to: actual.confirmed_at,
          billing_type: 'standard',
          item_name: `${itemMap.item_label} 収集運搬`,
          waste_type_id: wasteType.id,
          quantity: quantity,
          unit: wasteType.unit_code,
          unit_price: unitPrice,
          amount: amount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });

      billingItems.push(billingItem);
    }

    log.success(`請求明細: ${billingItems.length}件`);

    // ============================================================================
    // 5. データ確認
    // ============================================================================
    log.section('📊 データ確認');

    const counts = {
      waste_type_masters: await prisma.waste_type_masters.count({
        where: { org_id: ORG_ID },
      }),
      contracts: await prisma.contracts.count({
        where: { org_id: ORG_ID },
      }),
      app_billing_items: await prisma.app_billing_items.count({
        where: { org_id: ORG_ID },
      }),
    };

    log.info(`廃棄物種別マスター: ${counts.waste_type_masters}件`);
    log.info(`契約: ${counts.contracts}件`);
    log.info(`請求明細: ${counts.app_billing_items}件`);

    if (
      counts.waste_type_masters > 0 &&
      counts.contracts > 0 &&
      counts.app_billing_items > 0
    ) {
      log.success('✅ 全ての必須マスターデータが作成されました！');
    } else {
      log.error('⚠️  一部のデータが不足しています');
    }
  } catch (error) {
    log.error(`エラー: ${error}`);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

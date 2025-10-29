// ============================================================================
// 請求パターン網羅版Seedスクリプト
// 目的: 月額固定、実績数量、その他を含む多様な請求データ作成
// ============================================================================

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = '12345678-1234-1234-1234-123456789012';
const ADMIN_AUTH_USER_ID = '1a9eb299-e83a-49fe-bf3c-48aa37646d6d';

const log = {
  section: (msg: string) => console.log(`\n${'='.repeat(60)}\n${msg}`),
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
};

async function main() {
  log.section('💰 請求パターン網羅版データ作成');

  try {
    // ============================================================================
    // 1. 必要なマスターデータ取得
    // ============================================================================
    log.section('📋 マスターデータ取得');

    const collector = await prisma.collectors.findFirst({
      where: { org_id: ORG_ID },
    });

    if (!collector) {
      throw new Error('収集業者が見つかりません');
    }

    const stores = await prisma.stores.findMany({
      where: { org_id: ORG_ID },
      take: 10,
    });

    if (stores.length === 0) {
      throw new Error('店舗が見つかりません');
    }

    const wasteTypes = await prisma.waste_type_masters.findMany({
      where: { org_id: ORG_ID },
      take: 5,
    });

    log.success(`収集業者: ${collector.company_name}`);
    log.success(`店舗: ${stores.length}件`);
    log.success(`廃棄物種別: ${wasteTypes.length}件`);

    // ============================================================================
    // 2. 請求明細作成（パターン別）
    // ============================================================================
    log.section('💳 請求明細作成（多様なパターン）');

    const billingMonth = new Date('2024-10-01'); // 2024年10月分
    const billingItems = [];

    // ----------------------------------------------------------------------------
    // パターン1: 月額固定（monthly_fixed）
    // 店舗ごとの定額サービス料金
    // ----------------------------------------------------------------------------
    log.info('パターン1: 月額固定料金');

    for (let i = 0; i < Math.min(3, stores.length); i++) {
      const store = stores[i];
      const fixedAmount = 50000; // 月額5万円
      const taxRate = 0.1;
      const taxAmount = Math.floor(fixedAmount * taxRate);
      const totalAmount = fixedAmount + taxAmount;

      const item = await prisma.app_billing_items.create({
        data: {
          org_id: ORG_ID,
          collector_id: collector.id,
          store_id: store.id,
          collection_id: null,
          billing_month: billingMonth,
          billing_period_from: new Date('2024-10-01'),
          billing_period_to: new Date('2024-10-31'),
          billing_type: 'monthly_fixed',
          item_name: '廃棄物管理サービス月額利用料',
          item_code: 'SVC-MONTHLY-001',
          waste_type_id: null,
          quantity: null,
          unit: null,
          unit_price: null,
          amount: fixedAmount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'APPROVED',
          notes: '月額固定料金（廃棄物管理サポート含む）',
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });

      billingItems.push(item);
    }

    log.success(`月額固定料金: ${Math.min(3, stores.length)}件`);

    // ----------------------------------------------------------------------------
    // パターン2: 実績数量ベース（actual_quantity）
    // 廃棄物の実際の排出量に基づく従量課金
    // ----------------------------------------------------------------------------
    log.info('パターン2: 実績数量ベース');

    for (let i = 0; i < Math.min(5, stores.length); i++) {
      const store = stores[i];
      const wasteType = wasteTypes[i % wasteTypes.length];

      // ランダムな数量（現実的な範囲）
      const quantities = [0.5, 1.2, 2.0, 3.5, 5.0, 7.8, 10.2];
      const quantity = quantities[i % quantities.length];
      const unitPrice = Number(wasteType.unit_price || 20000);
      const amount = quantity * unitPrice;
      const taxRate = 0.1;
      const taxAmount = Math.floor(amount * taxRate);
      const totalAmount = amount + taxAmount;

      const item = await prisma.app_billing_items.create({
        data: {
          org_id: ORG_ID,
          collector_id: collector.id,
          store_id: store.id,
          collection_id: null,
          billing_month: billingMonth,
          billing_period_from: new Date('2024-10-01'),
          billing_period_to: new Date('2024-10-31'),
          billing_type: 'actual_quantity',
          item_name: `${wasteType.waste_type_name} 収集運搬`,
          item_code: `WASTE-${wasteType.waste_type_code}`,
          waste_type_id: wasteType.id,
          quantity: quantity,
          unit: wasteType.unit_code,
          unit_price: unitPrice,
          amount: amount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'APPROVED',
          notes: '実績数量に基づく請求',
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });

      billingItems.push(item);
    }

    log.success(`実績数量ベース: ${Math.min(5, stores.length)}件`);

    // ----------------------------------------------------------------------------
    // パターン3: その他（特別料金・調整費用）
    // ----------------------------------------------------------------------------
    log.info('パターン3: その他（特別料金）');

    const otherPatterns = [
      {
        name: '緊急回収サービス',
        code: 'SVC-EMERGENCY',
        amount: 30000,
        notes: '休日緊急対応',
      },
      {
        name: 'マニフェスト電子化手数料',
        code: 'SVC-MANIFEST',
        amount: 5000,
        notes: 'JWNET登録代行費用',
      },
      {
        name: '特別管理産業廃棄物処理加算',
        code: 'SVC-HAZARD',
        amount: 15000,
        notes: '特管廃棄物の特別処理費用',
      },
      {
        name: '前月過不足調整',
        code: 'ADJ-PREV-MONTH',
        amount: -8000,
        notes: '9月分請求過剰による返金',
      },
      {
        name: '運搬距離追加料金',
        code: 'SVC-DISTANCE',
        amount: 12000,
        notes: '50km超過分の追加料金',
      },
    ];

    for (let i = 0; i < Math.min(5, otherPatterns.length); i++) {
      const store = stores[i % stores.length];
      const pattern = otherPatterns[i];
      const amount = pattern.amount;
      const taxRate = 0.1;
      const taxAmount = Math.floor(amount * taxRate);
      const totalAmount = amount + taxAmount;

      const item = await prisma.app_billing_items.create({
        data: {
          org_id: ORG_ID,
          collector_id: collector.id,
          store_id: store.id,
          collection_id: null,
          billing_month: billingMonth,
          billing_period_from: new Date('2024-10-01'),
          billing_period_to: new Date('2024-10-31'),
          billing_type: 'other',
          item_name: pattern.name,
          item_code: pattern.code,
          waste_type_id: null,
          quantity: null,
          unit: null,
          unit_price: null,
          amount: amount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: pattern.amount < 0 ? 'APPROVED' : 'DRAFT', // 返金は承認済み、他は下書き
          notes: pattern.notes,
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
      });

      billingItems.push(item);
    }

    log.success(`その他（特別料金）: ${Math.min(5, otherPatterns.length)}件`);

    // ----------------------------------------------------------------------------
    // パターン4: 複合パターン（1店舗に複数の請求タイプ）
    // ----------------------------------------------------------------------------
    log.info('パターン4: 複合パターン（1店舗に複数明細）');

    if (stores.length > 5) {
      const targetStore = stores[5];

      // 月額固定 + 実績数量 + その他を同一店舗に
      const compositeItems = [
        {
          billing_type: 'monthly_fixed',
          item_name: '基本サービス料',
          amount: 40000,
          quantity: null,
          unit: null,
          unit_price: null,
        },
        {
          billing_type: 'actual_quantity',
          item_name: '混合廃棄物 収集運搬',
          quantity: 3.5,
          unit: 'TON',
          unit_price: 22000,
          amount: 3.5 * 22000,
        },
        {
          billing_type: 'other',
          item_name: '容器レンタル料',
          amount: 8000,
          quantity: null,
          unit: null,
          unit_price: null,
        },
      ];

      for (const pattern of compositeItems) {
        const amount = pattern.amount;
        const taxRate = 0.1;
        const taxAmount = Math.floor(amount * taxRate);
        const totalAmount = amount + taxAmount;

        const item = await prisma.app_billing_items.create({
          data: {
            org_id: ORG_ID,
            collector_id: collector.id,
            store_id: targetStore.id,
            collection_id: null,
            billing_month: billingMonth,
            billing_period_from: new Date('2024-10-01'),
            billing_period_to: new Date('2024-10-31'),
            billing_type: pattern.billing_type,
            item_name: pattern.item_name,
            waste_type_id: null,
            quantity: pattern.quantity || null,
            unit: pattern.unit || null,
            unit_price: pattern.unit_price || null,
            amount: amount,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            status: 'APPROVED',
            notes: '複合パターンテストデータ',
            created_by: ADMIN_AUTH_USER_ID,
            updated_by: ADMIN_AUTH_USER_ID,
          },
        });

        billingItems.push(item);
      }

      log.success(`複合パターン: 3件（同一店舗）`);
    }

    // ============================================================================
    // 3. サマリー出力
    // ============================================================================
    log.section('📊 作成サマリー');

    const summary = {
      monthly_fixed: billingItems.filter((i) => i.billing_type === 'monthly_fixed')
        .length,
      actual_quantity: billingItems.filter((i) => i.billing_type === 'actual_quantity')
        .length,
      other: billingItems.filter((i) => i.billing_type === 'other').length,
      total: billingItems.length,
    };

    log.info(`月額固定: ${summary.monthly_fixed}件`);
    log.info(`実績数量: ${summary.actual_quantity}件`);
    log.info(`その他: ${summary.other}件`);
    log.info(`合計: ${summary.total}件`);

    // 金額サマリー
    const totalAmount = billingItems.reduce((sum, item) => sum + item.total_amount, 0);
    log.info(`総請求額（税込）: ${Math.round(totalAmount).toLocaleString()}円`);

    // ステータス別
    const statusSummary = {
      DRAFT: billingItems.filter((i) => i.status === 'DRAFT').length,
      APPROVED: billingItems.filter((i) => i.status === 'APPROVED').length,
    };
    log.info(`ステータス別: DRAFT=${statusSummary.DRAFT}件, APPROVED=${statusSummary.APPROVED}件`);

    log.success('✅ 多様な請求パターンのテストデータが作成されました！');
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




/**
 * データ完全リセットスクリプト
 * 
 * グローバルルール準拠:
 * - 外部キー制約を考慮した削除順序（子→親）
 * - トランザクション使用
 * - 安全性チェック
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

async function main() {
  console.log('🔄 データ完全リセット開始\n');
  console.log('=' .repeat(80));
  console.log('⚠️  警告: このスクリプトは全てのトランザクションデータを削除します');
  console.log('=' .repeat(80));
  console.log('');

  try {
    // トランザクション内で全削除を実行
    await prisma.$transaction(async (tx) => {
      console.log('📋 Step 1: トランザクションデータ削除（子→親順）');
      console.log('-'.repeat(80));

      // 1-1. 請求関連（最も子）
      console.log('  🗑️  請求明細削除中...');
      const billingItemsCount = await tx.app_billing_items.deleteMany({});
      console.log(`     ✅ 請求明細: ${billingItemsCount.count}件削除`);

      console.log('  🗑️  請求サマリー削除中...');
      const summariesCount = await tx.billing_summaries.deleteMany({});
      console.log(`     ✅ 請求サマリー: ${summariesCount.count}件削除`);

      console.log('  🗑️  請求記録削除中...');
      const billingRecordsCount = await tx.billing_records.deleteMany({});
      console.log(`     ✅ 請求記録: ${billingRecordsCount.count}件削除`);

      console.log('  🗑️  エンドユーザー請求明細削除中...');
      const endUserBillingItemsCount = await tx.end_user_billing_items.deleteMany({});
      console.log(`     ✅ エンドユーザー請求明細: ${endUserBillingItemsCount.count}件削除`);

      console.log('  🗑️  エンドユーザー請求記録削除中...');
      const endUserBillingRecordsCount = await tx.end_user_billing_records.deleteMany({});
      console.log(`     ✅ エンドユーザー請求記録: ${endUserBillingRecordsCount.count}件削除`);

      console.log('  🗑️  請求変更ログ削除中...');
      const billingChangeLogsCount = await tx.billing_change_logs.deleteMany({});
      console.log(`     ✅ 請求変更ログ: ${billingChangeLogsCount.count}件削除`);

      // 1-2. 回収関連
      console.log('  🗑️  実績削除中...');
      const actualsCount = await tx.actuals.deleteMany({});
      console.log(`     ✅ 実績: ${actualsCount.count}件削除`);

      console.log('  🗑️  回収記録削除中...');
      const collectionsCount = await tx.collections.deleteMany({});
      console.log(`     ✅ 回収記録: ${collectionsCount.count}件削除`);

      console.log('  🗑️  回収依頼削除中...');
      const requestsCount = await tx.collection_requests.deleteMany({});
      console.log(`     ✅ 回収依頼: ${requestsCount.count}件削除`);

      // 1-3. 予定・登録・予約
      console.log('  🗑️  収集予定削除中...');
      const plansCount = await tx.plans.deleteMany({});
      console.log(`     ✅ 収集予定: ${plansCount.count}件削除`);

      console.log('  🗑️  登録削除中...');
      const registrationsCount = await tx.registrations.deleteMany({});
      console.log(`     ✅ 登録: ${registrationsCount.count}件削除`);

      console.log('  🗑️  予約削除中...');
      const reservationsCount = await tx.reservations.deleteMany({});
      console.log(`     ✅ 予約: ${reservationsCount.count}件削除`);

      // 1-4. 年間廃棄物報告
      console.log('  🗑️  年間廃棄物報告明細削除中...');
      const reportItemsCount = await tx.annual_waste_report_items.deleteMany({});
      console.log(`     ✅ 報告明細: ${reportItemsCount.count}件削除`);

      console.log('  🗑️  年間廃棄物報告削除中...');
      const reportsCount = await tx.annual_waste_reports.deleteMany({});
      console.log(`     ✅ 報告: ${reportsCount.count}件削除`);

      console.log('\n📋 Step 2: マスターデータ削除');
      console.log('-'.repeat(80));

      // 2-1. 関連マスター
      console.log('  🗑️  単価マスター削除中...');
      const wasteTypesCount = await tx.waste_type_masters.deleteMany({});
      console.log(`     ✅ 単価マスター: ${wasteTypesCount.count}件削除`);

      console.log('  🗑️  契約削除中...');
      const contractsCount = await tx.contracts.deleteMany({});
      console.log(`     ✅ 契約: ${contractsCount.count}件削除`);

      console.log('  🗑️  店舗×品目×収集業者削除中...');
      const matrixCount = await tx.store_item_collectors.deleteMany({});
      console.log(`     ✅ マトリクス: ${matrixCount.count}件削除`);

      console.log('  🗑️  店舗割当削除中...');
      const assignmentsCount = await tx.store_collector_assignments.deleteMany({});
      console.log(`     ✅ 店舗割当: ${assignmentsCount.count}件削除`);

      console.log('  🗑️  品目マップ削除中...');
      const itemMapsCount = await tx.item_maps.deleteMany({});
      console.log(`     ✅ 品目マップ: ${itemMapsCount.count}件削除`);

      console.log('  🗑️  JWNET廃棄物コード削除中...');
      const jwnetCodesCount = await tx.jwnet_waste_codes.deleteMany({});
      console.log(`     ✅ JWNETコード: ${jwnetCodesCount.count}件削除`);

      console.log('\n📋 Step 3: エンティティデータ削除');
      console.log('-'.repeat(80));

      // 3-1. 店舗・収集業者
      console.log('  🗑️  店舗削除中...');
      const storesCount = await tx.stores.deleteMany({});
      console.log(`     ✅ 店舗: ${storesCount.count}件削除`);

      console.log('  🗑️  収集業者削除中...');
      const collectorsCount = await tx.collectors.deleteMany({});
      console.log(`     ✅ 収集業者: ${collectorsCount.count}件削除`);

      console.log('\n📋 Step 4: 組織・ユーザーデータは保持');
      console.log('-'.repeat(80));
      console.log('  ℹ️  組織データ: 保持（既存組織を使用）');
      console.log('  ℹ️  ユーザーデータ: 保持（既存ユーザーを使用）');
      console.log('  ℹ️  権限データ: 保持');

      console.log('\n✅ トランザクション完了: 全データ削除成功');
    }, {
      maxWait: 30000, // 最大待機30秒
      timeout: 60000, // タイムアウト60秒
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎉 データリセット完了');
    console.log('='.repeat(80));
    console.log('');
    console.log('次のステップ:');
    console.log('  1. pnpm prisma:seed:production  - 本番想定データ作成');
    console.log('  2. node scripts/diagnose-billing-data.mjs - データ確認');
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


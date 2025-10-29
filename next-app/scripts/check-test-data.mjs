import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 テストデータ確認中...\n');

  const counts = {
    // マスターデータ
    organizations: await prisma.organizations.count(),
    stores: await prisma.stores.count(),
    collectors: await prisma.collectors.count(),
    item_maps: await prisma.item_maps.count(),
    waste_type_masters: await prisma.waste_type_masters.count(),
    
    // 請求関連
    app_billing_items: await prisma.app_billing_items.count(),
    billing_summaries: await prisma.billing_summaries.count(),
    contracts: await prisma.contracts.count(),
    
    // トランザクションデータ
    plans: await prisma.plans.count(),
    reservations: await prisma.reservations.count(),
    registrations: await prisma.registrations.count(),
    actuals: await prisma.actuals.count(),
  };

  console.log('【マスターデータ】');
  console.log(`  組織: ${counts.organizations}件`);
  console.log(`  店舗: ${counts.stores}件`);
  console.log(`  収集業者: ${counts.collectors}件`);
  console.log(`  品目マップ: ${counts.item_maps}件`);
  console.log(`  廃棄物種別マスター: ${counts.waste_type_masters}件`);

  console.log('\n【請求関連】');
  console.log(`  請求明細: ${counts.app_billing_items}件`);
  console.log(`  請求サマリー: ${counts.billing_summaries}件`);
  console.log(`  契約: ${counts.contracts}件`);

  console.log('\n【トランザクションデータ】');
  console.log(`  収集予定: ${counts.plans}件`);
  console.log(`  予約: ${counts.reservations}件`);
  console.log(`  登録: ${counts.registrations}件`);
  console.log(`  実績: ${counts.actuals}件`);

  console.log('\n【問題のあるテーブル】');
  const issues = [];
  if (counts.waste_type_masters === 0) issues.push('❌ 廃棄物種別マスター（単価設定）が空');
  if (counts.app_billing_items === 0) issues.push('❌ 請求明細が空');
  if (counts.contracts === 0) issues.push('❌ 契約が空');
  if (counts.collectors === 0) issues.push('❌ 収集業者が空');

  if (issues.length > 0) {
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('  ✅ 全てのテーブルにデータが存在します');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


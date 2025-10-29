import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function main() {
  console.log('🔍 請求データ診断ツール\n');
  console.log('='.repeat(80));

  // Step 1: 組織データ確認
  console.log('\n【Step 1】組織データ確認');
  console.log('-'.repeat(80));
  
  const organizations = await prisma.organizations.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      org_type: true,
      deleted_at: true,
    },
    take: 10,
  });
  
  console.log(`組織総数: ${organizations.length}件`);
  organizations.forEach((org, i) => {
    console.log(`  ${i + 1}. ${org.name} (${org.code}) - Type: ${org.org_type}, Deleted: ${org.deleted_at ? 'YES' : 'NO'}`);
    console.log(`     ID: ${org.id}`);
  });

  // 最初の有効な組織IDを取得
  const activeOrg = organizations.find(o => !o.deleted_at);
  if (!activeOrg) {
    console.error('\n❌ 有効な組織が見つかりません');
    return;
  }
  
  const ORG_ID = activeOrg.id;
  console.log(`\n✅ 診断対象組織: ${activeOrg.name} (${ORG_ID})`);

  // Step 2: 収集業者データ確認
  console.log('\n【Step 2】収集業者データ確認');
  console.log('-'.repeat(80));
  
  const collectorsTotal = await prisma.collectors.count();
  const collectorsWithOrg = await prisma.collectors.count({
    where: { org_id: ORG_ID, deleted_at: null },
  });
  const collectorsWithoutOrg = await prisma.collectors.count({
    where: { org_id: { not: ORG_ID }, deleted_at: null },
  });
  
  console.log(`全収集業者数: ${collectorsTotal}件`);
  console.log(`対象組織の収集業者: ${collectorsWithOrg}件`);
  console.log(`他組織の収集業者: ${collectorsWithoutOrg}件`);
  
  if (collectorsWithOrg > 0) {
    const sampleCollectors = await prisma.collectors.findMany({
      where: { org_id: ORG_ID, deleted_at: null },
      select: {
        id: true,
        company_name: true,
        license_number: true,
      },
      take: 5,
    });
    
    console.log('\nサンプル収集業者:');
    sampleCollectors.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.company_name} (${c.license_number || 'N/A'})`);
      console.log(`     ID: ${c.id}`);
    });
  }

  // Step 3: 回収実績データ確認
  console.log('\n【Step 3】回収実績データ確認');
  console.log('-'.repeat(80));
  
  const actualsTotal = await prisma.actuals.count();
  const actualsWithOrg = await prisma.actuals.count({
    where: { org_id: ORG_ID, deleted_at: null },
  });
  
  // 確定済み実績はRaw SQLで取得
  const actualsConfirmedResult = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM app.actuals
    WHERE org_id = ${ORG_ID}::uuid
      AND deleted_at IS NULL
      AND confirmed_at IS NOT NULL
  `;
  const actualsConfirmed = Number(actualsConfirmedResult[0]?.count || 0);
  
  console.log(`全実績数: ${actualsTotal}件`);
  console.log(`対象組織の実績: ${actualsWithOrg}件`);
  console.log(`確定済み実績: ${actualsConfirmed}件`);

  // Step 4: 請求明細データ確認
  console.log('\n【Step 4】請求明細データ確認');
  console.log('-'.repeat(80));
  
  const billingItemsTotal = await prisma.app_billing_items.count();
  const billingItemsWithOrg = await prisma.app_billing_items.count({
    where: { org_id: ORG_ID, deleted_at: null },
  });
  
  console.log(`全請求明細数: ${billingItemsTotal}件`);
  console.log(`対象組織の請求明細: ${billingItemsWithOrg}件`);
  
  if (billingItemsWithOrg > 0) {
    const billingByCollector = await prisma.$queryRaw`
      SELECT 
        collector_id,
        COUNT(*) as count,
        SUM(total_amount) as total
      FROM app.billing_items
      WHERE org_id = ${ORG_ID}::uuid
        AND deleted_at IS NULL
      GROUP BY collector_id
      LIMIT 5
    `;
    
    console.log('\n収集業者別請求明細:');
    for (const row of billingByCollector) {
      const collector = await prisma.collectors.findUnique({
        where: { id: row.collector_id },
        select: { company_name: true },
      });
      console.log(`  - ${collector?.company_name || '不明'}: ${row.count}件, 合計 ¥${Number(row.total).toLocaleString()}`);
    }
  }

  // Step 5: 単価マスターデータ確認
  console.log('\n【Step 5】単価マスターデータ確認');
  console.log('-'.repeat(80));
  
  const wasteTypeMastersTotal = await prisma.waste_type_masters.count();
  const wasteTypeMastersWithOrg = await prisma.waste_type_masters.count({
    where: { org_id: ORG_ID, deleted_at: null },
  });
  
  console.log(`全単価マスター数: ${wasteTypeMastersTotal}件`);
  console.log(`対象組織の単価マスター: ${wasteTypeMastersWithOrg}件`);

  // Step 6: 契約データ確認
  console.log('\n【Step 6】契約データ確認');
  console.log('-'.repeat(80));
  
  const contractsTotal = await prisma.contracts.count();
  const contractsWithOrg = await prisma.contracts.count({
    where: { org_id: ORG_ID, deleted_at: null },
  });
  
  console.log(`全契約数: ${contractsTotal}件`);
  console.log(`対象組織の契約: ${contractsWithOrg}件`);

  // Step 7: 請求サマリーデータ確認
  console.log('\n【Step 7】請求サマリーデータ確認');
  console.log('-'.repeat(80));
  
  const summariesTotal = await prisma.billing_summaries.count();
  const summariesWithOrg = await prisma.billing_summaries.count({
    where: { org_id: ORG_ID },
  });
  
  console.log(`全請求サマリー数: ${summariesTotal}件`);
  console.log(`対象組織の請求サマリー: ${summariesWithOrg}件`);

  // Step 8: データ整合性チェック
  console.log('\n【Step 8】データ整合性チェック');
  console.log('-'.repeat(80));
  
  const issues = [];
  
  if (collectorsWithOrg === 0) {
    issues.push('❌ 収集業者が登録されていません');
  }
  
  if (actualsConfirmed === 0) {
    issues.push('❌ 確定済み回収実績が存在しません');
  }
  
  if (billingItemsWithOrg === 0) {
    issues.push('❌ 請求明細が生成されていません');
  }
  
  if (wasteTypeMastersWithOrg === 0) {
    issues.push('⚠️  単価マスターが設定されていません');
  }
  
  if (contractsWithOrg === 0) {
    issues.push('⚠️  契約が設定されていません');
  }
  
  if (issues.length > 0) {
    console.log('\n【検出された問題】');
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('✅ データ整合性チェック完了: 問題なし');
  }

  // Step 9: 推奨対応
  console.log('\n【Step 9】推奨対応');
  console.log('-'.repeat(80));
  
  if (billingItemsWithOrg === 0 && actualsConfirmed > 0) {
    console.log('📝 推奨: 回収実績から請求明細を生成してください');
    console.log('   コマンド: pnpm run api:call /api/billing-items/generate-from-collections');
  }
  
  if (wasteTypeMastersWithOrg === 0) {
    console.log('📝 推奨: 単価マスターを作成してください');
    console.log('   コマンド: pnpm run prisma:seed:complete');
  }
  
  if (collectorsWithOrg === 0) {
    console.log('📝 推奨: 収集業者を登録してください');
    console.log('   コマンド: pnpm run prisma:seed:collectors');
  }

  console.log('\n' + '='.repeat(80));
  console.log('診断完了\n');
}

main()
  .catch((e) => {
    console.error('診断エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 請求データ構造の詳細確認\n');
  console.log('='.repeat(80));

  // 1. 組織データ
  console.log('\n【1. 組織構造】');
  const orgs = await prisma.organizations.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      org_type: true,
    },
  });

  for (const org of orgs) {
    console.log(`\n  ${org.name} (${org.code})`);
    console.log(`    ID: ${org.id}`);
    console.log(`    Type: ${org.org_type}`);
  }

  // 2. 収集業者の org_id
  console.log('\n\n【2. 収集業者の所属】');
  for (const org of orgs.filter(o => ['BABA-INC', 'COSMOS-DRUG', 'RAKUICHI-RAKUZA'].includes(o.code))) {
    const collectors = await prisma.collectors.count({
      where: { org_id: org.id, deleted_at: null },
    });
    console.log(`  ${org.name}: 収集業者 ${collectors}件`);
  }

  // 3. 請求明細の org_id と collector_id の関係
  console.log('\n\n【3. 請求明細の構造】');
  
  const babaOrg = orgs.find(o => o.code === 'BABA-INC');
  const cosmosOrg = orgs.find(o => o.code === 'COSMOS-DRUG');
  const rakuichiOrg = orgs.find(o => o.code === 'RAKUICHI-RAKUZA');

  for (const org of [babaOrg, cosmosOrg, rakuichiOrg].filter(Boolean)) {
    const billingItems = await prisma.app_billing_items.findMany({
      where: { org_id: org.id, deleted_at: null },
      include: {
        collectors: { select: { company_name: true, org_id: true } },
        stores: { select: { name: true, org_id: true } },
      },
      take: 3,
    });

    console.log(`\n  ${org.name} (org_id: ${org.id})`);
    console.log(`    請求明細: ${await prisma.app_billing_items.count({ where: { org_id: org.id, deleted_at: null } })}件`);
    
    if (billingItems.length > 0) {
      const sample = billingItems[0];
      console.log(`\n    【サンプル請求明細】`);
      console.log(`      品目: ${sample.item_name}`);
      console.log(`      金額: ¥${sample.total_amount.toFixed(0)}`);
      console.log(`      収集業者: ${sample.collectors.company_name}`);
      console.log(`      収集業者の org_id: ${sample.collectors.org_id}`);
      if (sample.stores) {
        console.log(`      店舗: ${sample.stores.name}`);
        console.log(`      店舗の org_id: ${sample.stores.org_id}`);
      }
      
      // 重要: 請求明細の org_id と 収集業者/店舗の org_id が一致しているか？
      if (sample.org_id === sample.collectors.org_id && sample.org_id === sample.stores?.org_id) {
        console.log(`      ✅ org_id が一致: すべて ${org.name} に所属`);
      } else {
        console.log(`      ❌ org_id が不一致:`);
        console.log(`         請求明細: ${sample.org_id}`);
        console.log(`         収集業者: ${sample.collectors.org_id}`);
        console.log(`         店舗: ${sample.stores?.org_id}`);
      }
    }
  }

  // 4. 現在の構造の分析
  console.log('\n\n【4. 構造分析】');
  console.log('='.repeat(80));
  
  const babaCollectors = await prisma.collectors.count({
    where: { org_id: babaOrg.id, deleted_at: null },
  });
  const cosmosCollectors = await prisma.collectors.count({
    where: { org_id: cosmosOrg.id, deleted_at: null },
  });
  const rakuichiCollectors = await prisma.collectors.count({
    where: { org_id: rakuichiOrg.id, deleted_at: null },
  });

  console.log('\n【現在の実装】:');
  console.log(`  BABA株式会社（org_id: ${babaOrg.id}）`);
  console.log(`    - 収集業者: ${babaCollectors}件`);
  console.log(`    - 請求明細: ${await prisma.app_billing_items.count({ where: { org_id: babaOrg.id, deleted_at: null } })}件`);
  console.log('');
  console.log(`  コスモス薬品（org_id: ${cosmosOrg.id}）`);
  console.log(`    - 収集業者: ${cosmosCollectors}件`);
  console.log(`    - 請求明細: ${await prisma.app_billing_items.count({ where: { org_id: cosmosOrg.id, deleted_at: null } })}件`);
  console.log('');
  console.log(`  楽市楽座（org_id: ${rakuichiOrg.id}）`);
  console.log(`    - 収集業者: ${rakuichiCollectors}件`);
  console.log(`    - 請求明細: ${await prisma.app_billing_items.count({ where: { org_id: rakuichiOrg.id, deleted_at: null } })}件`);

  console.log('\n\n【ユーザー様の理解】:');
  console.log('  BABA株式会社（システム管理会社）');
  console.log('    └─ すべてのテナント・収集業者・請求を管理');
  console.log('');
  console.log('  コスモス薬品（テナント = 排出事業者）');
  console.log('    └─ BABA株式会社の管理下');
  console.log('');
  console.log('  楽市楽座（テナント = 排出事業者）');
  console.log('    └─ BABA株式会社の管理下');

  console.log('\n\n【問題点】:');
  if (babaCollectors > 0 && cosmosCollectors > 0 && rakuichiCollectors > 0) {
    console.log('  ❌ 各組織が独立した org_id を持ち、それぞれ独自の収集業者を持っている');
    console.log('  ❌ これは「マルチテナント」ではなく「マルチ組織」の構造');
    console.log('  ❌ 本来の設計意図とズレている可能性が高い');
  }

  console.log('\n\n【正しい構造（推測）】:');
  console.log('  すべてのデータが BABA株式会社の org_id に紐付く:');
  console.log('    - 収集業者: すべて BABA株式会社の org_id');
  console.log('    - 店舗: 各テナントを識別する emitter_id または tenant_id');
  console.log('    - 請求明細: BABA株式会社の org_id + emitter_id で管理');

  console.log('\n' + '='.repeat(80));
}

main().finally(() => prisma.$disconnect());


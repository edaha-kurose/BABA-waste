/**
 * 現在ログイン可能なユーザーのorg_id確認スクリプト
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 ログイン可能ユーザー一覧\n');
  console.log('='.repeat(80));
  
  // auth.users と app.users の結合
  const users = await prisma.$queryRaw`
    SELECT 
      au.id AS auth_user_id,
      au.email,
      u.id AS app_user_id,
      u.name,
      uor.org_id,
      uor.role,
      o.name AS org_name,
      o.code AS org_code
    FROM auth.users au
    LEFT JOIN app.users u ON au.id = u.auth_user_id
    LEFT JOIN app.user_org_roles uor ON u.id = uor.user_id
    LEFT JOIN app.organizations o ON uor.org_id = o.id
    WHERE u.id IS NOT NULL
    ORDER BY au.email
  `;
  
  console.log(`【ログイン可能ユーザー】: ${users.length}件\n`);
  
  users.forEach((user, i) => {
    console.log(`${i + 1}. ${user.email} (${user.name || 'N/A'})`);
    console.log(`   app_user_id: ${user.app_user_id}`);
    console.log(`   org_id: ${user.org_id || 'NULL'}`);
    console.log(`   org_name: ${user.org_name || 'NULL'}`);
    console.log(`   org_code: ${user.org_code || 'NULL'}`);
    console.log(`   role: ${user.role || 'NULL'}`);
    console.log('');
  });
  
  // 各組織のデータ件数確認
  console.log('='.repeat(80));
  console.log('【組織別データ件数】\n');
  
  const organizations = await prisma.organizations.findMany({
    where: { deleted_at: null },
    select: { id: true, name: true, code: true },
  });
  
  for (const org of organizations) {
    console.log(`■ ${org.name} (${org.code})`);
    console.log(`  org_id: ${org.id}`);
    
    const collectors = await prisma.collectors.count({ where: { org_id: org.id, deleted_at: null } });
    const stores = await prisma.stores.count({ where: { org_id: org.id, deleted_at: null } });
    const itemMaps = await prisma.item_maps.count({ where: { org_id: org.id, deleted_at: null } });
    const wasteTypes = await prisma.waste_type_masters.count({ where: { org_id: org.id, deleted_at: null } });
    const plans = await prisma.plans.count({ where: { org_id: org.id, deleted_at: null } });
    const actuals = await prisma.actuals.count({ where: { org_id: org.id, deleted_at: null } });
    const billingItems = await prisma.app_billing_items.count({ where: { org_id: org.id, deleted_at: null } });
    
    console.log(`  - 収集業者: ${collectors}件`);
    console.log(`  - 店舗: ${stores}件`);
    console.log(`  - 品目マップ: ${itemMaps}件`);
    console.log(`  - 単価マスター: ${wasteTypes}件`);
    console.log(`  - 収集予定: ${plans}件`);
    console.log(`  - 回収実績: ${actuals}件`);
    console.log(`  - 請求明細: ${billingItems}件`);
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('推奨アクション:');
  console.log('  1. admin@test.com でログイン');
  console.log('  2. そのユーザーの org_id を確認');
  console.log('  3. その org_id に対してデータ作成を実行');
  console.log('');
}

main()
  .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());




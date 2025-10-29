import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 BABA株式会社（管理会社）のアクセス権限診断\n');
  console.log('='.repeat(80));

  // 1. ユーザー情報確認
  console.log('\n【1. ユーザー情報】');
  const adminUsers = await prisma.app_users.findMany({
    where: {
      email: {
        in: ['admin@test.com', 'admin@cosmos-drug.test', 'admin@rakuichi.test'],
      },
    },
    include: {
      user_org_roles: {
        include: {
          organizations: true,
        },
      },
    },
  });

  for (const user of adminUsers) {
    console.log(`\n  ${user.name} (${user.email})`);
    console.log(`    auth_user_id: ${user.auth_user_id}`);
    console.log(`    app_user_id: ${user.id}`);
    for (const role of user.user_org_roles) {
      console.log(`    - ${role.organizations.name}`);
      console.log(`      org_id: ${role.org_id}`);
      console.log(`      role: ${role.role}`);
    }
  }

  // 2. BABA株式会社でログインした時に見えるべきデータ
  console.log('\n\n【2. BABA株式会社でログインした時に見えるべきデータ】');
  
  const babaOrgId = '12345678-1234-1234-1234-123456789012';
  const cosmosOrgId = '00000000-0000-0000-0000-000000000001';
  const rakuichiOrgId = '00000000-0000-0000-0000-000000000004';

  console.log('\n  BABA株式会社が「システム管理者」として全テナントを管理する場合:');
  console.log('  ┌─ コスモス薬品のデータ');
  console.log('  │   ├─ 収集業者: 2件');
  console.log('  │   ├─ 店舗: 10件');
  console.log('  │   └─ 請求明細: 391件');
  console.log('  ├─ 楽市楽座のデータ');
  console.log('  │   ├─ 収集業者: 2件');
  console.log('  │   ├─ 店舗: 8件');
  console.log('  │   └─ 請求明細: 192件');
  console.log('  └─ BABA株式会社自身のデータ（テスト用）');
  console.log('      ├─ 収集業者: 5件');
  console.log('      ├─ 店舗: 10件');
  console.log('      └─ 請求明細: 680件');

  // 3. 現在の実装での問題点
  console.log('\n\n【3. 現在の実装での問題点】');
  
  const adminUser = adminUsers.find(u => u.email === 'admin@test.com');
  if (adminUser) {
    console.log('\n  admin@test.com でログインした場合:');
    console.log(`    セッション org_id: ${adminUser.user_org_roles[0]?.org_id || 'N/A'}`);
    
    // 現在のAPIロジックシミュレーション
    const currentOrgId = adminUser.user_org_roles[0]?.org_id;
    
    if (currentOrgId === babaOrgId) {
      console.log('\n  ❌ 問題: セッション org_id = BABA株式会社');
      console.log('     → APIクエリ: WHERE org_id = BABA株式会社');
      console.log('     → 結果: BABA株式会社のデータのみ表示（680件）');
      console.log('     → コスモス薬品・楽市楽座のデータは見えない！');
    } else if (currentOrgId === cosmosOrgId) {
      console.log('\n  ❌ 問題: セッション org_id = コスモス薬品');
      console.log('     → APIクエリ: WHERE org_id = コスモス薬品');
      console.log('     → 結果: コスモス薬品のデータのみ表示（391件）');
      console.log('     → 他のテナントのデータは見えない！');
    }
  }

  // 4. 正しい実装方法
  console.log('\n\n【4. 正しい実装方法】');
  console.log('\n  Option A: システム管理者は全テナントのデータを見る');
  console.log('  ```typescript');
  console.log('  // API側のロジック');
  console.log('  const user = await getAuthenticatedUser(request);');
  console.log('  ');
  console.log('  // ユーザーがシステム管理者か確認');
  console.log('  const isSystemAdmin = user.user_org_roles.some(');
  console.log('    r => r.organizations.org_type === "ADMIN"');
  console.log('  );');
  console.log('  ');
  console.log('  if (isSystemAdmin) {');
  console.log('    // 全テナントのデータを取得');
  console.log('    const billingItems = await prisma.app_billing_items.findMany({');
  console.log('      where: { deleted_at: null }, // org_id フィルタなし');
  console.log('    });');
  console.log('  } else {');
  console.log('    // 自分の org_id のデータのみ');
  console.log('    const billingItems = await prisma.app_billing_items.findMany({');
  console.log('      where: { org_id: user.org_id, deleted_at: null },');
  console.log('    });');
  console.log('  }');
  console.log('  ```');

  console.log('\n  Option B: ユーザーが管理する全組織のデータを見る');
  console.log('  ```typescript');
  console.log('  // ユーザーが所属する全組織の org_id を取得');
  console.log('  const orgIds = user.user_org_roles.map(r => r.org_id);');
  console.log('  ');
  console.log('  // 全組織のデータを取得');
  console.log('  const billingItems = await prisma.app_billing_items.findMany({');
  console.log('    where: {');
  console.log('      org_id: { in: orgIds },');
  console.log('      deleted_at: null,');
  console.log('    },');
  console.log('  });');
  console.log('  ```');

  // 5. 現在のセッション設定確認
  console.log('\n\n【5. 現在のセッション設定確認】');
  console.log('\n  調査項目:');
  console.log('  1. getAuthenticatedUser() が返す user.org_id は何か？');
  console.log('  2. BABA株式会社でログイン時のセッション org_id は？');
  console.log('  3. APIクエリで org_id フィルタがどう適用されているか？');

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 次のステップ:');
  console.log('  1. getAuthenticatedUser() の実装を確認');
  console.log('  2. 請求管理画面のAPIクエリを確認');
  console.log('  3. システム管理者判定ロジックを追加');
  console.log('  4. テスト: BABA株式会社でログインして全テナントのデータが見えるか確認');
}

main().finally(() => prisma.$disconnect());




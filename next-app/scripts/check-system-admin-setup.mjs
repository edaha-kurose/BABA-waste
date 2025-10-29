import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// .env.localファイルをロード
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 システム管理者設定確認\n');
  console.log('='.repeat(80));

  // Step 1: 全組織を確認
  console.log('\n【Step 1】全組織一覧');
  console.log('-'.repeat(80));
  const organizations = await prisma.organizations.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      org_type: true,
      is_active: true,
    },
    orderBy: { name: 'asc' },
  });

  organizations.forEach((org, i) => {
    console.log(`${i + 1}. ${org.name} (${org.code})`);
    console.log(`   ID: ${org.id}`);
    console.log(`   Type: ${org.org_type}`);
    console.log(`   Active: ${org.is_active}`);
    console.log('');
  });

  // Step 2: ADMIN型の組織を確認
  console.log('\n【Step 2】システム管理組織（ADMIN型）');
  console.log('-'.repeat(80));
  const adminOrgs = organizations.filter(o => o.org_type === 'ADMIN');
  
  if (adminOrgs.length === 0) {
    console.log('❌ ADMIN型の組織が存在しません');
  } else {
    adminOrgs.forEach(org => {
      console.log(`✅ ${org.name} (${org.id})`);
    });
  }

  // Step 3: admin@test.com ユーザーの設定確認
  console.log('\n【Step 3】admin@test.com ユーザーの設定');
  console.log('-'.repeat(80));
  
  const adminUser = await prisma.app_users.findFirst({
    where: { email: 'admin@test.com' },
    include: {
      user_org_roles: {
        include: {
          organizations: true,
        },
      },
    },
  });

  if (!adminUser) {
    console.log('❌ admin@test.com ユーザーが見つかりません');
  } else {
    console.log(`✅ ユーザーID: ${adminUser.id}`);
    console.log(`   Auth User ID: ${adminUser.auth_user_id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Active: ${adminUser.is_active}`);
    console.log('');
    console.log('   【所属組織】');
    
    if (adminUser.user_org_roles.length === 0) {
      console.log('   ❌ 組織に所属していません');
    } else {
      adminUser.user_org_roles.forEach((role, i) => {
        console.log(`   ${i + 1}. ${role.organizations.name}`);
        console.log(`      Org ID: ${role.org_id}`);
        console.log(`      Org Type: ${role.organizations.org_type}`);
        console.log(`      Role: ${role.role}`);
        console.log(`      Active: ${role.is_active}`);
        console.log('');
      });

      // システム管理者判定
      const isSystemAdmin = adminUser.user_org_roles.some(
        r => r.organizations.org_type === 'ADMIN'
      );
      console.log(`   システム管理者判定: ${isSystemAdmin ? '✅ YES' : '❌ NO'}`);
    }
  }

  // Step 4: 管理可能なテナント（EMITTER型）を確認
  if (adminUser && adminUser.user_org_roles.length > 0) {
    console.log('\n【Step 4】管理可能なテナント（EMITTER型）');
    console.log('-'.repeat(80));
    
    const orgIds = adminUser.user_org_roles.map(r => r.org_id);
    const managedTenants = await prisma.organizations.findMany({
      where: {
        id: { in: orgIds },
        org_type: 'EMITTER',
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        org_type: true,
      },
    });

    if (managedTenants.length === 0) {
      console.log('❌ 管理可能なテナント（EMITTER型）がありません');
      console.log('');
      console.log('【原因】');
      console.log('admin@test.com ユーザーが所属している組織が全て EMITTER 型ではありません。');
      console.log('');
      console.log('【解決策】');
      console.log('1. admin@test.com を EMITTER 型の組織（コスモス薬品、楽市楽座）にも紐付ける');
      console.log('2. または、システム管理組織（BABA株式会社）を ADMIN 型に変更する');
    } else {
      managedTenants.forEach((tenant, i) => {
        console.log(`${i + 1}. ${tenant.name} (${tenant.code})`);
        console.log(`   ID: ${tenant.id}`);
        console.log('');
      });
    }
  }

  console.log('='.repeat(80));
  console.log('確認完了\n');
}

main()
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());




import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// .env.localファイルをロード
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

const ADMIN_AUTH_USER_ID = '1a9eb299-e83a-49fe-bf3c-48aa37646d6d';

async function main() {
  console.log('🔧 システム管理者のテナント紐付け修正\n');
  console.log('='.repeat(80));

  // Step 1: admin@test.comのapp_users.idを取得
  const adminUser = await prisma.app_users.findFirst({
    where: { auth_user_id: ADMIN_AUTH_USER_ID },
  });

  if (!adminUser) {
    console.error('❌ admin@test.com ユーザーが見つかりません');
    process.exit(1);
  }

  console.log(`✅ admin@test.com ユーザーID: ${adminUser.id}\n`);

  // Step 2: コスモス薬品への紐付けを有効化
  console.log('【Step 1】コスモス薬品への紐付けを有効化');
  console.log('-'.repeat(80));
  
  const cosmosOrgId = '00000000-0000-0000-0000-000000000001';
  const cosmosRole = await prisma.user_org_roles.findFirst({
    where: {
      user_id: adminUser.id,
      org_id: cosmosOrgId,
    },
  });

  if (cosmosRole) {
    await prisma.user_org_roles.update({
      where: { id: cosmosRole.id },
      data: { is_active: true },
    });
    console.log('✅ コスモス薬品への紐付けを有効化しました\n');
  } else {
    console.log('⏭️  コスモス薬品への紐付けは存在しません（スキップ）\n');
  }

  // Step 3: 楽市楽座への紐付けを追加
  console.log('【Step 2】楽市楽座への紐付けを追加');
  console.log('-'.repeat(80));
  
  const rakuichiOrgId = '00000000-0000-0000-0000-000000000004';
  const rakuichiRole = await prisma.user_org_roles.findFirst({
    where: {
      user_id: adminUser.id,
      org_id: rakuichiOrgId,
    },
  });

  if (rakuichiRole) {
    console.log('⏭️  楽市楽座への紐付けは既に存在します\n');
    
    if (!rakuichiRole.is_active) {
      await prisma.user_org_roles.update({
        where: { id: rakuichiRole.id },
        data: { is_active: true },
      });
      console.log('✅ 楽市楽座への紐付けを有効化しました\n');
    }
  } else {
    await prisma.user_org_roles.create({
      data: {
        user_id: adminUser.id,
        org_id: rakuichiOrgId,
        role: 'ADMIN',
        is_active: true,
        created_by: adminUser.id,
        updated_by: adminUser.id,
      },
    });
    console.log('✅ 楽市楽座への紐付けを追加しました\n');
  }

  // Step 4: 最終確認
  console.log('【Step 3】最終確認');
  console.log('-'.repeat(80));
  
  const finalRoles = await prisma.user_org_roles.findMany({
    where: {
      user_id: adminUser.id,
      is_active: true,
    },
    include: {
      organizations: {
        select: {
          id: true,
          name: true,
          code: true,
          org_type: true,
        },
      },
    },
  });

  console.log('admin@test.com の所属組織（有効のみ）:');
  finalRoles.forEach((role, i) => {
    console.log(`  ${i + 1}. ${role.organizations.name} (${role.organizations.org_type})`);
    console.log(`     Role: ${role.role}`);
  });

  console.log('');

  // 管理可能なテナント（EMITTER型）
  const managedTenants = finalRoles.filter(
    r => r.organizations.org_type === 'EMITTER'
  );

  console.log(`管理可能なテナント: ${managedTenants.length}件`);
  managedTenants.forEach((role, i) => {
    console.log(`  ${i + 1}. ${role.organizations.name}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎉 修正完了\n');
}

main()
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());




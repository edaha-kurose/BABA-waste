import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 コスモス薬品株式会社を復元\n');
  console.log('='.repeat(80));

  // Step 1: ID: 00000000-0000-0000-0000-000000000001 をコスモス薬品に戻す
  console.log('\n【Step 1】組織情報を復元');
  const cosmosOrg = await prisma.organizations.update({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    data: {
      name: 'コスモス薬品株式会社',
      code: 'COSMOS-DRUG',
      org_type: 'EMITTER',
    },
  });
  console.log(`  ✅ ${cosmosOrg.name} (${cosmosOrg.code})`);

  // Step 2: admin@cosmos-drug.test のユーザーを取得
  console.log('\n【Step 2】コスモス薬品管理者ユーザーを取得');
  const cosmosUser = await prisma.app_users.findUnique({
    where: { email: 'admin@cosmos-drug.test' },
    include: { user_org_roles: true },
  });

  if (!cosmosUser) {
    console.error('  ❌ admin@cosmos-drug.test が見つかりません');
    process.exit(1);
  }
  console.log(`  ✅ ${cosmosUser.name} (${cosmosUser.email})`);

  // Step 3: 誤った紐付け（BABA株式会社）を削除
  console.log('\n【Step 3】誤った紐付けを削除');
  const babaOrgId = '12345678-1234-1234-1234-123456789012';
  const wrongRoles = cosmosUser.user_org_roles.filter(
    (r) => r.org_id === babaOrgId
  );

  for (const role of wrongRoles) {
    await prisma.user_org_roles.delete({
      where: { id: role.id },
    });
    console.log(`  ✅ 削除: BABA株式会社との紐付け`);
  }

  // Step 4: 正しい紐付け（コスモス薬品）を確認または作成
  console.log('\n【Step 4】正しい紐付けを確認/作成');
  const existingCosmosRole = cosmosUser.user_org_roles.find(
    (r) => r.org_id === cosmosOrg.id
  );

  if (!existingCosmosRole) {
    await prisma.user_org_roles.create({
      data: {
        user_id: cosmosUser.id,
        org_id: cosmosOrg.id,
        role: 'ADMIN',
        created_by: cosmosUser.id,
        updated_by: cosmosUser.id,
      },
    });
    console.log(`  ✅ 作成: ${cosmosUser.name} - ${cosmosOrg.name}`);
  } else {
    console.log(`  ℹ️  既に存在: ${cosmosUser.name} - ${cosmosOrg.name}`);
  }

  // Step 5: 最終確認
  console.log('\n【Step 5】最終確認');
  const allUsers = await prisma.app_users.findMany({
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

  console.log('');
  for (const user of allUsers) {
    console.log(`  ${user.name} (${user.email})`);
    for (const role of user.user_org_roles) {
      console.log(`    → ${role.organizations.name} (${role.organizations.org_type || 'なし'})`);
    }
  }

  // Step 6: 組織一覧確認
  console.log('\n【Step 6】組織一覧');
  const importantOrgs = await prisma.organizations.findMany({
    where: {
      id: {
        in: [
          '12345678-1234-1234-1234-123456789012', // BABA
          '00000000-0000-0000-0000-000000000001', // コスモス
          '00000000-0000-0000-0000-000000000004', // 楽市楽座
        ],
      },
    },
  });

  console.log('');
  for (const org of importantOrgs) {
    console.log(`  ${org.name} (${org.code}) - Type: ${org.org_type || 'なし'}`);
    console.log(`    ID: ${org.id}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 復元完了\n');
  console.log('【ログインボタン構成】');
  console.log('  1. 👤 管理者でログイン (admin@test.com)');
  console.log('     → BABA株式会社（システム管理会社）');
  console.log('');
  console.log('  2. 🏥 コスモス薬品でログイン (admin@cosmos-drug.test)');
  console.log('     → コスモス薬品株式会社（テナント企業）');
  console.log('');
  console.log('  3. 🏪 楽市楽座でログイン (admin@rakuichi.test)');
  console.log('     → 楽市楽座株式会社（テナント企業）');
}

main().finally(() => prisma.$disconnect());




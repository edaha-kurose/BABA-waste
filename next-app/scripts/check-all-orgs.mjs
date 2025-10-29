import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 全組織データ確認\n');
  console.log('='.repeat(80));

  const orgs = await prisma.organizations.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      org_type: true,
      is_active: true,
    },
    orderBy: { created_at: 'asc' },
  });

  console.log(`\n【全組織】(${orgs.length}件)\n`);

  for (const org of orgs) {
    console.log(`${org.name} (${org.code})`);
    console.log(`  ID: ${org.id}`);
    console.log(`  Type: ${org.org_type}`);
    console.log(`  Active: ${org.is_active ? 'Yes' : 'No'}`);

    // マスターデータ件数を確認
    const stores = await prisma.stores.count({ where: { org_id: org.id, deleted_at: null } });
    const collectors = await prisma.collectors.count({ where: { org_id: org.id, deleted_at: null } });
    const itemMaps = await prisma.item_maps.count({ where: { org_id: org.id, deleted_at: null } });
    const wasteTypes = await prisma.waste_type_masters.count({ where: { org_id: org.id, deleted_at: null } });
    const billingItems = await prisma.app_billing_items.count({ where: { org_id: org.id, deleted_at: null } });

    console.log(`  データ: 店舗${stores}件, 収集業者${collectors}件, 品目${itemMaps}件, 廃棄物種別${wasteTypes}件, 請求${billingItems}件`);
    console.log('');
  }

  console.log('='.repeat(80));
}

main().finally(() => prisma.$disconnect());




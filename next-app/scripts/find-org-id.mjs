import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 組織ID確認\n');

  const orgs = await prisma.organizations.findMany({
    take: 10,
  });

  console.log('【組織一覧】');
  orgs.forEach((org, i) => {
    console.log(`${i + 1}. ${org.name} (${org.id})`);
  });

  console.log('\n【収集業者のorg_id】');
  const collectorOrgs = await prisma.$queryRaw`
    SELECT DISTINCT org_id, COUNT(*) as count
    FROM app.collectors
    GROUP BY org_id
    ORDER BY count DESC
    LIMIT 5
  `;
  console.log(collectorOrgs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());




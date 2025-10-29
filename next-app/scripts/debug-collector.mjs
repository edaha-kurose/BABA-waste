import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🔍 収集業者デバッグ\n');

  const collectors = await prisma.collectors.findMany({
    where: { org_id: ORG_ID },
    take: 5,
  });

  console.log(`収集業者数（org_id=${ORG_ID}）: ${collectors.length}件\n`);

  if (collectors.length > 0) {
    console.log('【最初の収集業者】');
    console.log(JSON.stringify(collectors[0], null, 2));
  }

  const allCollectors = await prisma.collectors.count();
  console.log(`\n全収集業者数: ${allCollectors}件`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());




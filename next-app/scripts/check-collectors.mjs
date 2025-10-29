import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '12345678-1234-1234-1234-123456789012';

async function main() {
  console.log('📊 収集業者データ確認\n');

  const collectors = await prisma.collectors.findMany({
    where: {
      org_id: ORG_ID,
      deleted_at: null,
    },
  });

  console.log(`【収集業者数】: ${collectors.length}件\n`);

  if (collectors.length === 0) {
    console.log('❌ 収集業者が存在しません');
    console.log('   テストデータを作成してください:');
    console.log('   pnpm prisma:seed');
  } else {
    collectors.forEach((collector, index) => {
      console.log(`${index + 1}. ${collector.company_name}`);
      console.log(`   ID: ${collector.id}`);
      console.log(`   コード: ${collector.code}`);
      console.log('');
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());




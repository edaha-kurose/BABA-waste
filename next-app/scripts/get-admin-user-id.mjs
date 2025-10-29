import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.app_users.findMany({
    where: { email: 'admin@test.com' },
    select: { id: true, email: true, name: true },
  });
  
  console.log('admin@test.com のapp_user_id:');
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());




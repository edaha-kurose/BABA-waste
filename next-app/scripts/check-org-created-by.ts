import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.organizations.findUnique({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    select: { id: true, name: true, created_by: true },
  })
  console.log('組織情報:', org)
}

main()
  .finally(() => prisma.$disconnect())



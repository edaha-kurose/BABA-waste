import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 collection_requests 件数（org別）')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const counts = await prisma.collection_requests.groupBy({
    by: ['org_id'],
    _count: { _all: true },
  })

  const orgIds = counts.map((c) => c.org_id)
  const orgs = await prisma.organizations.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, code: true, name: true },
  })
  const orgMap = new Map(orgs.map((o) => [o.id, o]))

  counts
    .sort((a, b) => b._count._all - a._count._all)
    .forEach((c) => {
      const o = orgMap.get(c.org_id)
      console.log(`${c._count._all.toString().padStart(5)}件  ${o?.code || '-'}  ${o?.name || '-'}  (${c.org_id})`)
    })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤 admin@test.com の所属組織')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const admin = await prisma.app_users.findFirst({
    where: { email: 'admin@test.com' },
    include: { user_org_roles: { include: { organizations: true } } },
  })

  if (!admin) {
    console.log('admin@test.com が見つかりません')
  } else {
    console.log(`app_user_id: ${admin.id}`)
    if (admin.user_org_roles.length === 0) {
      console.log('所属ロールなし')
    } else {
      admin.user_org_roles.forEach((r) => {
        console.log(`- role: ${r.role}  org: ${r.organizations?.code} ${r.organizations?.name} (${r.organizations?.id})`)
      })
    }
  }

  console.log('\n✅ 完了')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())




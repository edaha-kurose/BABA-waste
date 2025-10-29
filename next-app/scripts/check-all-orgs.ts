import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 全組織の割り当てデータを確認中...\n')

  // 全組織を取得
  const orgs = await prisma.organizations.findMany({
    where: { deleted_at: null },
    select: { id: true, name: true, code: true },
  })

  console.log(`📊 組織数: ${orgs.length}\n`)

  for (const org of orgs) {
    const assignments = await prisma.store_collector_assignments.findMany({
      where: {
        org_id: org.id,
        deleted_at: null,
      },
    })

    const uniqueStores = new Set(assignments.map(a => a.store_id)).size

    console.log(`📋 ${org.name} (${org.code})`)
    console.log(`   org_id: ${org.id}`)
    console.log(`   割り当て件数: ${assignments.length}`)
    console.log(`   ユニークな店舗数: ${uniqueStores}`)
    console.log('')
  }

  // 特定の組織の詳細
  const targetOrgId = '00000000-0000-0000-0000-000000000004'
  console.log(`\n🎯 対象組織 (${targetOrgId}) の詳細:\n`)

  const targetAssignments = await prisma.store_collector_assignments.findMany({
    where: {
      org_id: targetOrgId,
      deleted_at: null,
    },
    include: {
      stores: { select: { name: true, store_code: true } },
      collectors: { select: { company_name: true } },
    },
  })

  console.log(`件数: ${targetAssignments.length}`)
  targetAssignments.forEach((a, i) => {
    console.log(`${i + 1}. ${a.stores?.name} - ${a.collectors?.company_name}`)
  })
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



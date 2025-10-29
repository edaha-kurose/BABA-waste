import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const orgId = '00000000-0000-0000-0000-000000000004'

  console.log('🔍 詳細確認中...\n')

  // 全レコード（削除済み含む）
  const allRecords = await prisma.store_collector_assignments.findMany({
    where: { org_id: orgId },
  })
  console.log(`📊 全レコード数（削除済み含む）: ${allRecords.length}`)

  // 有効なレコードのみ
  const activeRecords = await prisma.store_collector_assignments.findMany({
    where: { org_id: orgId, deleted_at: null },
  })
  console.log(`📊 有効なレコード数: ${activeRecords.length}`)

  // APIと同じクエリ（limit/offset付き）
  const apiQuery = await prisma.store_collector_assignments.findMany({
    where: {
      org_id: orgId,
      deleted_at: null,
    },
    include: {
      stores: {
        select: {
          id: true,
          name: true,
          store_code: true,
        },
      },
      collectors: {
        select: {
          id: true,
          company_name: true,
          phone: true,
        },
      },
    },
    orderBy: [{ created_at: 'desc' }],
    take: 100,
    skip: 0,
  })
  console.log(`📊 APIクエリ結果: ${apiQuery.length}件\n`)

  if (apiQuery.length > 0) {
    console.log('✅ 最初の5件:')
    apiQuery.slice(0, 5).forEach((a, i) => {
      console.log(`${i + 1}. ${a.stores?.name} - ${a.collectors?.company_name}`)
    })
  }

  // 削除済みレコードを確認
  const deletedRecords = await prisma.store_collector_assignments.findMany({
    where: { org_id: orgId, deleted_at: { not: null } },
  })
  console.log(`\n📊 削除済みレコード数: ${deletedRecords.length}`)

  if (deletedRecords.length > 0) {
    console.log('⚠️ 削除済みレコード:')
    deletedRecords.forEach((a, i) => {
      console.log(`${i + 1}. ID: ${a.id}, deleted_at: ${a.deleted_at}`)
    })
  }
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



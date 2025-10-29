import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 割り当てAPI のデータを確認中...\n')

  const orgId = '00000000-0000-0000-0000-000000000004'

  // APIと同じクエリを実行
  const assignments = await prisma.store_collector_assignments.findMany({
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
  })

  console.log(`📊 取得件数: ${assignments.length}`)
  console.log('')

  if (assignments.length === 0) {
    console.log('❌ 割り当てデータが見つかりません')
  } else {
    console.log('✅ 割り当てデータ:')
    assignments.slice(0, 5).forEach((a, index) => {
      console.log(`\n${index + 1}. ID: ${a.id}`)
      console.log(`   店舗: ${a.stores?.name || '(なし)'} (${a.stores?.store_code || 'N/A'})`)
      console.log(`   収集業者: ${a.collectors?.company_name || '(なし)'}`)
      console.log(`   is_primary: ${a.is_primary}`)
      console.log(`   deleted_at: ${a.deleted_at || '有効'}`)
    })

    if (assignments.length > 5) {
      console.log(`\n... 他 ${assignments.length - 5} 件`)
    }
  }

  // ユニークな店舗数を確認
  const uniqueStoreIds = new Set(assignments.map(a => a.store_id))
  console.log(`\n📋 ユニークな店舗数: ${uniqueStoreIds.size}`)

  // 店舗総数を確認
  const totalStores = await prisma.stores.count({
    where: { org_id: orgId, deleted_at: null },
  })
  console.log(`📋 組織の店舗総数: ${totalStores}`)
  console.log(`📋 未設定店舗数: ${totalStores - uniqueStoreIds.size}`)
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



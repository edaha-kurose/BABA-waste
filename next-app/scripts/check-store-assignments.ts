import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 店舗・収集業者割り当てデータを確認中...\n')

  // エラーが出ている店舗IDをチェック
  const storeIds = [
    '6bd2c4cb-c0fa-4f41-827d-644ea4704b7e',
    '991e1816-b5f6-4f76-9d57-9a9f5ec1d11c',
    'd5115abc-492f-4f1e-9cea-5a3d523231dc',
  ]

  for (const storeId of storeIds) {
    console.log(`\n📋 店舗ID: ${storeId}`)
    
    const assignments = await prisma.store_collector_assignments.findMany({
      where: { store_id: storeId },
      include: {
        stores: { select: { name: true, store_code: true } },
        collectors: { select: { company_name: true } },
      },
    })

    if (assignments.length === 0) {
      console.log('  ❌ 割り当てレコードなし')
    } else {
      assignments.forEach((a, index) => {
        console.log(`  ${index + 1}. ${a.stores?.name} (${a.stores?.store_code})`)
        console.log(`     収集業者: ${a.collectors?.company_name}`)
        console.log(`     deleted_at: ${a.deleted_at ? '削除済み (' + a.deleted_at.toISOString() + ')' : '有効'}`)
        console.log(`     is_primary: ${a.is_primary}`)
      })
    }
  }

  console.log('\n\n📊 全体統計:')
  const total = await prisma.store_collector_assignments.count()
  const active = await prisma.store_collector_assignments.count({
    where: { deleted_at: null },
  })
  const deleted = await prisma.store_collector_assignments.count({
    where: { deleted_at: { not: null } },
  })

  console.log(`  全レコード数: ${total}`)
  console.log(`  有効: ${active}`)
  console.log(`  論理削除済み: ${deleted}`)
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



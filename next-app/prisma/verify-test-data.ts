import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 テストデータ検証開始...\n')

  // テナント一覧
  const tenants = await prisma.organizations.findMany({
    where: {
      org_type: 'EMITTER',
      deleted_at: null,
    },
  })

  console.log(`📋 テナント数: ${tenants.length}`)
  console.log('─'.repeat(80))

  for (const tenant of tenants) {
    console.log(`\n【${tenant.name}】`)

    // 店舗数
    const storesCount = await prisma.stores.count({
      where: { org_id: tenant.id, deleted_at: null },
    })
    console.log(`  店舗: ${storesCount}件`)

    // 収集業者数
    const collectorsCount = await prisma.collectors.count({
      where: { org_id: tenant.id, deleted_at: null },
    })
    console.log(`  収集業者: ${collectorsCount}件`)

    // 品目数
    const itemMapsCount = await prisma.item_maps.count({
      where: { org_id: tenant.id, deleted_at: null },
    })
    console.log(`  品目: ${itemMapsCount}件`)

    // 店舗・収集業者割り当て数
    const assignmentsCount = await prisma.store_collector_assignments.count({
      where: { org_id: tenant.id, deleted_at: null },
    })
    console.log(`  店舗・収集業者割り当て: ${assignmentsCount}件`)

    // 品目マトリクス数
    const matrixCount = await prisma.store_item_collectors.count({
      where: { org_id: tenant.id, deleted_at: null },
    })
    console.log(`  品目マトリクス: ${matrixCount}件`)

    // 廃棄物単価数
    const wastePricesCount = await prisma.waste_type_masters.count({
      where: { org_id: tenant.id, deleted_at: null },
    })
    console.log(`  廃棄物単価: ${wastePricesCount}件`)

    // 単価未設定数
    const unsetPricesCount = await prisma.waste_type_masters.count({
      where: {
        org_id: tenant.id,
        unit_price: null,
        deleted_at: null,
      },
    })
    console.log(`    └ 単価未設定: ${unsetPricesCount}件`)

    // 実績データ数（コメントアウト：未使用）
    // const actualsCount = await prisma.actuals.count({
    //   where: { org_id: tenant.id, deleted_at: null },
    // })
    // console.log(`  実績データ: ${actualsCount}件`)

    // 請求明細数
    const billingItemsCount = await prisma.app_billing_items.count({
      where: { org_id: tenant.id, deleted_at: null },
    })
    console.log(`  請求明細: ${billingItemsCount}件`)

    // 完了率計算
    const totalStoresItems = storesCount * itemMapsCount
    const completionRate =
      totalStoresItems > 0
        ? Math.round((matrixCount / totalStoresItems) * 100)
        : 0

    console.log(`\n  📊 品目マトリクス完了率: ${completionRate}%`)
    console.log(
      `     (${matrixCount} / ${totalStoresItems} = ${storesCount}店舗 × ${itemMapsCount}品目)`
    )
  }

  console.log('\n' + '─'.repeat(80))
  console.log('✅ 検証完了')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


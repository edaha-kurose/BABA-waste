/**
 * 目的: 組織ごとの item_maps と store_item_collectors の品目を比較
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 組織ごとの品目マッピング確認...\n')

  const TARGET_ORG = '00000000-0000-0000-0000-000000000001'

  // Step 1: 対象組織の item_maps
  console.log(`📋 組織 ${TARGET_ORG} の item_maps:`)
  const itemMaps = await prisma.item_maps.findMany({
    where: {
      org_id: TARGET_ORG,
      deleted_at: null,
    },
    select: {
      item_label: true,
      jwnet_code: true,
    },
    orderBy: { item_label: 'asc' },
  })

  console.log(`  合計: ${itemMaps.length}件`)
  itemMaps.forEach((item, i) => {
    console.log(`  ${i + 1}. "${item.item_label}" → ${item.jwnet_code}`)
  })

  // Step 2: 対象組織の store_item_collectors の品目（ユニーク）
  console.log(`\n📋 組織 ${TARGET_ORG} の store_item_collectors の品目:`)
  const storeItems = await prisma.store_item_collectors.findMany({
    where: {
      org_id: TARGET_ORG,
      deleted_at: null,
    },
    distinct: ['item_name'],
    select: {
      item_name: true,
    },
    orderBy: { item_name: 'asc' },
  })

  console.log(`  合計: ${storeItems.length}件`)
  storeItems.forEach((item, i) => {
    console.log(`  ${i + 1}. "${item.item_name}"`)
  })

  // Step 3: 不一致リスト
  console.log(`\n⚠️  item_maps に存在しない品目:`)
  const itemMapLabels = new Set(itemMaps.map(im => im.item_label))
  const missing = storeItems.filter(si => !itemMapLabels.has(si.item_name))

  if (missing.length === 0) {
    console.log('  ✅ すべて一致しています')
  } else {
    console.log(`  合計: ${missing.length}件`)
    missing.forEach((item, i) => {
      console.log(`  ${i + 1}. "${item.item_name}"`)
    })
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ エラー:', e)
  process.exit(1)
})



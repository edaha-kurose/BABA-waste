/**
 * 目的: item_maps と store_item_collectors の item_name/item_label の不一致を確認
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 データ確認開始...\n')

  // Step 1: item_maps の item_label 一覧
  console.log('📋 item_maps テーブルの item_label 一覧:')
  const itemMaps = await prisma.item_maps.findMany({
    where: { deleted_at: null },
    select: {
      item_label: true,
      jwnet_code: true,
      org_id: true,
    },
    orderBy: { item_label: 'asc' },
  })

  if (itemMaps.length === 0) {
    console.log('  ⚠️  item_maps にデータがありません！')
  } else {
    console.log(`  合計: ${itemMaps.length}件`)
    itemMaps.forEach((item, i) => {
      console.log(`  ${i + 1}. "${item.item_label}" (code: ${item.jwnet_code || 'null'})`)
    })
  }

  // Step 2: store_item_collectors の item_name 一覧（ユニーク）
  console.log('\n📋 store_item_collectors テーブルの item_name 一覧（ユニーク）:')
  const storeItems = await prisma.store_item_collectors.findMany({
    where: { deleted_at: null },
    distinct: ['item_name'],
    select: {
      item_name: true,
    },
    orderBy: { item_name: 'asc' },
  })

  if (storeItems.length === 0) {
    console.log('  ⚠️  store_item_collectors にデータがありません！')
  } else {
    console.log(`  合計: ${storeItems.length}件`)
    storeItems.forEach((item, i) => {
      console.log(`  ${i + 1}. "${item.item_name}"`)
    })
  }

  // Step 3: 不一致チェック
  console.log('\n🔍 不一致チェック:')
  const itemMapLabels = new Set(itemMaps.map(im => im.item_label))
  const missingInItemMaps = storeItems.filter(si => !itemMapLabels.has(si.item_name))

  if (missingInItemMaps.length === 0) {
    console.log('  ✅ すべての item_name が item_maps に存在します')
  } else {
    console.log(`  ⚠️  item_maps に存在しない item_name: ${missingInItemMaps.length}件`)
    missingInItemMaps.forEach((item, i) => {
      console.log(`    ${i + 1}. "${item.item_name}"`)
    })
  }

  // Step 4: item_code が null のレコード数
  console.log('\n📊 item_code が未設定のレコード数:')
  const nullCount = await prisma.store_item_collectors.count({
    where: {
      OR: [
        { item_code: null },
        { item_code: '' },
      ],
      deleted_at: null,
    },
  })
  console.log(`  ${nullCount}件`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ エラー:', e)
  process.exit(1)
})



/**
 * 目的: deleted_at が NULL でない item_maps を確認
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_ORG_ID = '00000000-0000-0000-0000-000000000001'

async function main() {
  console.log('🔍 論理削除された item_maps を確認...\n')

  // deleted_at が NULL でないレコード
  const deletedItems = await prisma.item_maps.findMany({
    where: {
      org_id: TARGET_ORG_ID,
      deleted_at: { not: null },
    },
    select: {
      id: true,
      item_label: true,
      jwnet_code: true,
      deleted_at: true,
    },
    orderBy: { item_label: 'asc' },
  })

  console.log(`📋 論理削除されたレコード: ${deletedItems.length}件`)
  deletedItems.forEach((item, i) => {
    console.log(`  ${i + 1}. "${item.item_label}" (code: ${item.jwnet_code}, deleted_at: ${item.deleted_at?.toISOString()})`)
  })

  // すべてのレコード（deleted_at 問わず）
  console.log('\n📋 すべてのレコード（deleted_at 問わず）:')
  const allItems = await prisma.item_maps.findMany({
    where: {
      org_id: TARGET_ORG_ID,
    },
    select: {
      item_label: true,
      jwnet_code: true,
      deleted_at: true,
    },
    orderBy: { item_label: 'asc' },
  })

  console.log(`  合計: ${allItems.length}件`)
  allItems.forEach((item, i) => {
    const status = item.deleted_at ? '❌ 削除済' : '✅ 有効'
    console.log(`  ${i + 1}. "${item.item_label}" → ${item.jwnet_code} [${status}]`)
  })

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ エラー:', e)
  process.exit(1)
})



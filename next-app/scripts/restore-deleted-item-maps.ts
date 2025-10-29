/**
 * 目的: 論理削除された item_maps を復活させる
 * 
 * グローバルルール準拠: Prisma経由でデータ更新
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_ORG_ID = '00000000-0000-0000-0000-000000000001'
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001'

async function main() {
  console.log('🔧 論理削除された item_maps の復活開始...\n')

  // Step 1: 論理削除されたレコードを取得
  const deletedItems = await prisma.item_maps.findMany({
    where: {
      org_id: TARGET_ORG_ID,
      deleted_at: { not: null },
    },
    select: {
      id: true,
      item_label: true,
      jwnet_code: true,
    },
  })

  console.log(`📊 復活対象: ${deletedItems.length}件\n`)

  if (deletedItems.length === 0) {
    console.log('✅ 復活対象なし')
    await prisma.$disconnect()
    return
  }

  let restoredCount = 0
  let errorCount = 0

  // Step 2: 各レコードを復活
  for (const item of deletedItems) {
    try {
      await prisma.item_maps.update({
        where: { id: item.id },
        data: {
          deleted_at: null,
          updated_at: new Date(),
          // updated_by は外部キー制約があるため、既存値を維持
        },
      })

      restoredCount++
      console.log(`✅ 復活成功: "${item.item_label}" (code: ${item.jwnet_code})`)
    } catch (error) {
      errorCount++
      console.error(`❌ 復活失敗: "${item.item_label}"`, error)
    }
  }

  // Step 3: 結果サマリー
  console.log('\n📋 実行結果:')
  console.log(`  ✅ 復活成功: ${restoredCount}件`)
  console.log(`  ❌ エラー: ${errorCount}件`)
  console.log(`  📊 合計: ${deletedItems.length}件`)

  // Step 4: 検証
  console.log('\n🔍 検証: 有効な item_maps 総数')
  const activeCount = await prisma.item_maps.count({
    where: {
      org_id: TARGET_ORG_ID,
      deleted_at: null,
    },
  })
  console.log(`  有効レコード: ${activeCount}件`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ エラー:', e)
  process.exit(1)
})


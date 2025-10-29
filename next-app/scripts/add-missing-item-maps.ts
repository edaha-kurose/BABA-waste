/**
 * 目的: 組織 00000000-0000-0000-0000-000000000001 の item_maps に不足している品目を追加
 * 
 * グローバルルール準拠: Prisma経由でデータ追加
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_ORG_ID = '00000000-0000-0000-0000-000000000001'
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001' // システム管理者ID

// 他の組織から参照して適切な jwnet_code を設定
const MISSING_ITEMS = [
  { item_label: '一般廃棄物（不燃ごみ）', jwnet_code: '0201-01' },
  { item_label: '一般廃棄物（可燃ごみ）', jwnet_code: '0101-01' },
  { item_label: '産業廃棄物（ガラスくず）', jwnet_code: '1501-01' },
  { item_label: '産業廃棄物（廃プラスチック）', jwnet_code: '0701-01' },
  { item_label: '産業廃棄物（廃油）', jwnet_code: '0301-01' },
  { item_label: '産業廃棄物（木くず）', jwnet_code: '0901-01' },
  { item_label: '産業廃棄物（紙くず）', jwnet_code: '0801-01' },
  { item_label: '産業廃棄物（金属くず）', jwnet_code: '1401-01' },
]

async function main() {
  console.log('🔧 item_maps への品目追加開始...\n')
  console.log(`📋 対象組織: ${TARGET_ORG_ID}`)
  console.log(`📊 追加予定: ${MISSING_ITEMS.length}件\n`)

  let addedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const item of MISSING_ITEMS) {
    try {
      // 既存チェック
      const existing = await prisma.item_maps.findFirst({
        where: {
          org_id: TARGET_ORG_ID,
          item_label: item.item_label,
          deleted_at: null,
        },
      })

      if (existing) {
        console.log(`⚠️  スキップ: "${item.item_label}" は既に存在します`)
        skippedCount++
        continue
      }

      // 新規追加
      await prisma.item_maps.create({
        data: {
          org_id: TARGET_ORG_ID,
          item_label: item.item_label,
          jwnet_code: item.jwnet_code,
          created_by: ADMIN_USER_ID,
          updated_by: ADMIN_USER_ID,
        },
      })

      addedCount++
      console.log(`✅ 追加成功: "${item.item_label}" → ${item.jwnet_code}`)
    } catch (error) {
      errorCount++
      console.error(`❌ 追加失敗: "${item.item_label}"`, error)
    }
  }

  // 結果サマリー
  console.log('\n📋 実行結果:')
  console.log(`  ✅ 追加成功: ${addedCount}件`)
  console.log(`  ⚠️  スキップ: ${skippedCount}件`)
  console.log(`  ❌ エラー: ${errorCount}件`)
  console.log(`  📊 合計: ${MISSING_ITEMS.length}件`)

  // 検証
  console.log('\n🔍 検証: 組織の item_maps 総数')
  const totalCount = await prisma.item_maps.count({
    where: {
      org_id: TARGET_ORG_ID,
      deleted_at: null,
    },
  })
  console.log(`  合計: ${totalCount}件（追加前: 10件 → 追加後: ${totalCount}件）`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ エラー:', e)
  process.exit(1)
})



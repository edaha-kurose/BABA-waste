/**
 * 目的: item_maps の重複を詳細分析し、正しいマッピングを決定
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 item_maps 重複分析開始...\n')

  // Step 1: 組織ごとの item_maps を取得
  const itemMaps = await prisma.item_maps.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      org_id: true,
      item_label: true,
      jwnet_code: true,
      created_at: true,
    },
    orderBy: [
      { org_id: 'asc' },
      { item_label: 'asc' },
      { created_at: 'desc' }, // 最新を優先
    ],
  })

  console.log(`📊 item_maps 総数: ${itemMaps.length}件\n`)

  // Step 2: 組織IDごとにグループ化
  const byOrg = new Map<string, typeof itemMaps>()
  itemMaps.forEach(im => {
    if (!byOrg.has(im.org_id)) {
      byOrg.set(im.org_id, [])
    }
    byOrg.get(im.org_id)!.push(im)
  })

  console.log(`📋 組織数: ${byOrg.size}件\n`)

  // Step 3: 各組織の重複をチェック
  for (const [orgId, items] of byOrg) {
    console.log(`\n🏢 組織ID: ${orgId}`)
    console.log(`  品目数: ${items.length}件`)

    // item_label でグループ化
    const byLabel = new Map<string, typeof items>()
    items.forEach(item => {
      if (!byLabel.has(item.item_label)) {
        byLabel.set(item.item_label, [])
      }
      byLabel.get(item.item_label)!.push(item)
    })

    // 重複をチェック
    const duplicates = Array.from(byLabel.entries()).filter(([_, items]) => items.length > 1)
    
    if (duplicates.length > 0) {
      console.log(`  ⚠️  重複あり: ${duplicates.length}件`)
      duplicates.forEach(([label, items]) => {
        console.log(`    - "${label}":`)
        items.forEach((item, i) => {
          console.log(`      ${i + 1}. code="${item.jwnet_code}", created_at=${item.created_at.toISOString()}`)
        })
      })
    } else {
      console.log(`  ✅ 重複なし`)
    }
  }

  // Step 4: store_item_collectors の組織IDを確認
  console.log('\n\n📋 store_item_collectors の組織ID分布:')
  const storeItemOrgs = await prisma.store_item_collectors.findMany({
    where: { deleted_at: null },
    distinct: ['org_id'],
    select: { org_id: true },
  })

  console.log(`  組織数: ${storeItemOrgs.length}件`)
  storeItemOrgs.forEach((org, i) => {
    console.log(`  ${i + 1}. ${org.org_id}`)
  })

  // Step 5: 推奨される修正方針
  console.log('\n\n💡 推奨される修正方針:')
  console.log('  1. 各組織で、同じ item_label に対して最新の created_at を持つレコードを使用')
  console.log('  2. store_item_collectors.org_id と item_maps.org_id を一致させる')
  console.log('  3. 重複がある場合は、最新の jwnet_code を採用')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ エラー:', e)
  process.exit(1)
})



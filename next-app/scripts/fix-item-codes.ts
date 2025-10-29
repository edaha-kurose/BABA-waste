/**
 * 目的: app.store_item_collectors テーブルの item_code が未設定の場合、
 *       app.item_maps テーブルから jwnet_code を補完する。
 * 
 * グローバルルール準拠: Prisma経由でデータ更新
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 item_code 補完スクリプト開始...')

  try {
    // Step 1: item_code が未設定のレコードを取得
    const itemsToFix = await prisma.store_item_collectors.findMany({
      where: {
        OR: [
          { item_code: null },
          { item_code: '' },
        ],
        deleted_at: null,
      },
      select: {
        id: true,
        org_id: true,
        item_name: true,
        store_id: true,
      },
    })

    console.log(`📊 対象レコード数: ${itemsToFix.length}件`)

    if (itemsToFix.length === 0) {
      console.log('✅ 修正対象なし。すべて正常です。')
      return
    }

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    // Step 2: 各レコードに対して item_maps から jwnet_code を取得して更新
    for (const item of itemsToFix) {
      try {
        // item_maps から対応する jwnet_code を検索（組織IDを考慮）
        const itemMap = await prisma.item_maps.findFirst({
          where: {
            org_id: item.org_id, // 同じ組織内で検索
            item_label: item.item_name,
            deleted_at: null,
          },
          select: {
            jwnet_code: true,
          },
          orderBy: {
            created_at: 'desc', // 最新を優先
          },
        })

        if (!itemMap || !itemMap.jwnet_code) {
          console.warn(`⚠️  スキップ: org_id=${item.org_id}, item_name="${item.item_name}" に対応する item_maps が見つかりません`)
          skipCount++
          continue
        }

        // store_item_collectors を更新
        await prisma.store_item_collectors.update({
          where: { id: item.id },
          data: {
            item_code: itemMap.jwnet_code,
            updated_at: new Date(),
          },
        })

        successCount++
        console.log(`✅ 更新成功: org_id=${item.org_id}, item_name="${item.item_name}", item_code="${itemMap.jwnet_code}"`)
      } catch (error) {
        errorCount++
        console.error(`❌ 更新失敗: ID=${item.id}, org_id=${item.org_id}, item_name="${item.item_name}"`, error)
      }
    }

    // Step 3: 結果サマリー
    console.log('\n📋 実行結果:')
    console.log(`  ✅ 成功: ${successCount}件`)
    console.log(`  ⚠️  スキップ: ${skipCount}件`)
    console.log(`  ❌ エラー: ${errorCount}件`)
    console.log(`  📊 合計: ${itemsToFix.length}件`)

    // Step 4: 検証クエリ
    const remainingNull = await prisma.store_item_collectors.count({
      where: {
        OR: [
          { item_code: null },
          { item_code: '' },
        ],
        deleted_at: null,
      },
    })

    console.log(`\n🔍 検証: item_code が未設定のレコード数 = ${remainingNull}件`)

    if (remainingNull === 0) {
      console.log('🎉 すべての item_code が正常に設定されました！')
    } else {
      console.log(`⚠️  まだ ${remainingNull}件の未設定レコードがあります（item_maps に対応データがない可能性）`)
    }
  } catch (error) {
    console.error('❌ スクリプト実行エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })


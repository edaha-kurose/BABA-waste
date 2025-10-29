import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 回収実績データ作成開始...\n')

  try {
    // テナント一覧取得
    const tenants = await prisma.organizations.findMany({
      where: {
        org_type: 'EMITTER',
        deleted_at: null,
      },
    })

    let totalCreated = 0

    for (const tenant of tenants) {
      console.log(`処理中: ${tenant.name}`)

      // 収集業者取得
      const collectors = await prisma.collectors.findMany({
        where: {
          org_id: tenant.id,
          deleted_at: null,
        },
        take: 5,
      })

      if (collectors.length === 0) {
        console.log(`  ⚠️  収集業者なし`)
        continue
      }

      // 店舗取得
      const stores = await prisma.stores.findMany({
        where: {
          org_id: tenant.id,
          deleted_at: null,
        },
      })

      if (stores.length === 0) {
        console.log(`  ⚠️  店舗なし`)
        continue
      }

      // 過去3ヶ月分の回収実績を作成
      const today = new Date()
      const months = [
        new Date(today.getFullYear(), today.getMonth() - 2, 1),
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 1),
      ]

      for (const month of months) {
        for (const store of stores) {
          // 各店舗で月5-10件の回収実績を作成
          const recordCount = Math.floor(Math.random() * 6) + 5 // 5-10件

          for (let i = 0; i < recordCount; i++) {
            // ランダムな日付（その月内）
            const collectedAt = new Date(
              month.getFullYear(),
              month.getMonth(),
              Math.floor(Math.random() * 28) + 1
            )

            // ランダムな収集業者
            const collector = collectors[Math.floor(Math.random() * collectors.length)]

            // ランダムな数量
            const actualQty = Math.floor(Math.random() * 91) + 10 // 10-100kg

            // 既存チェック
            const existing = await prisma.collections.findFirst({
              where: {
                org_id: tenant.id,
                // request_idがないので単純にランダム生成
                collected_at: collectedAt,
              },
            })

            if (!existing) {
              // collection_requestsを作成してからcollectionsを作成する必要がある
              // しかし、簡略化のためrequest_idをランダムUUIDで作成
              
              // まずcollection_requestを作成
              const collectionRequest = await prisma.collection_requests.create({
                data: {
                  org_id: tenant.id,
                  store_id: store.id,
                  // collector_idはpublic_usersへの参照なのでnullにする
                  main_items: [],
                  status: 'COMPLETED',
                  requested_at: collectedAt,
                  scheduled_collection_date: collectedAt,
                  actual_collection_date: collectedAt,
                  created_by: 'system',
                  updated_by: 'system',
                },
              })

              // collectionを作成
              await prisma.collections.create({
                data: {
                  org_id: tenant.id,
                  request_id: collectionRequest.id,
                  actual_qty: actualQty,
                  actual_unit: 'kg',
                  collected_at: collectedAt,
                  created_by: 'system',
                  updated_by: 'system',
                },
              })

              totalCreated++
            }
          }
        }
      }

      console.log(`  ✅ ${tenant.name}: 完了`)
    }

    console.log(`\n✅ 合計 ${totalCreated}件の回収実績を作成しました`)
  } catch (error) {
    console.error('❌ エラー:', error)
    throw error
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


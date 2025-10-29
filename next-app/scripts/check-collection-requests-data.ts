/**
 * collection_requests テーブルのデータ確認スクリプト
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.localを読み込み
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 collection_requests データ確認中...\n')

  // 1. collection_requests の件数
  const requestCount = await prisma.collection_requests.count()
  console.log(`📊 collection_requests: ${requestCount}件`)

  // 2. 最新5件を取得
  const requests = await prisma.collection_requests.findMany({
    take: 5,
    orderBy: { created_at: 'desc' },
    include: {
      stores: {
        select: {
          store_code: true,
          name: true,
        },
      },
      organizations: {
        select: {
          name: true,
        },
      },
    },
  })

  if (requests.length > 0) {
    console.log('\n📋 最新5件:')
    requests.forEach((req, i) => {
      console.log(`\n${i + 1}. ID: ${req.id}`)
      console.log(`   組織: ${req.organizations?.name || 'N/A'}`)
      console.log(`   店舗: ${req.stores?.name || 'N/A'} (${req.stores?.store_code || 'N/A'})`)
      console.log(`   ステータス: ${req.status}`)
      console.log(`   作成日: ${req.created_at}`)
    })
  } else {
    console.log('\n⚠️ collection_requests にデータがありません！')
  }

  // 3. 関連データの確認
  console.log('\n\n🔍 関連データ確認:')
  
  const orgCount = await prisma.organizations.count()
  console.log(`📊 organizations: ${orgCount}件`)

  const storeCount = await prisma.stores.count()
  console.log(`📊 stores: ${storeCount}件`)

  const planCount = await prisma.plans.count()
  console.log(`📊 plans: ${planCount}件`)

  const collectorCount = await prisma.collectors.count()
  console.log(`📊 collectors: ${collectorCount}件`)

  const assignmentCount = await prisma.store_collector_assignments.count()
  console.log(`📊 store_collector_assignments: ${assignmentCount}件`)

  // 4. サンプルデータ生成の提案
  if (requestCount === 0) {
    console.log('\n\n💡 解決策:')
    console.log('1. collection_requests のサンプルデータを生成する')
    console.log('2. または、廃棄依頼一覧画面から「エクセル取り込み」でデータを追加する')
    console.log('\nサンプルデータ生成コマンド:')
    console.log('  pnpm tsx scripts/seed-collection-requests.ts')
  }
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })






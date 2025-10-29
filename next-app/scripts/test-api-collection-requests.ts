/**
 * /api/collection-requests のテストスクリプト
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.localを読み込み
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 /api/collection-requests の動作確認\n')

  // 1. 認証ユーザーを取得（最初のユーザー）
  const user = await prisma.app_users.findFirst({
    include: {
      user_org_roles: {
        where: { is_active: true },
        include: {
          organizations: true,
        },
      },
    },
  })

  if (!user || user.user_org_roles.length === 0) {
    console.error('❌ ユーザーが見つかりません')
    return
  }

  const org = user.user_org_roles[0].organizations
  console.log(`✅ テストユーザー: ${user.email}`)
  console.log(`✅ 組織: ${org.name} (${org.id})\n`)

  // 2. APIと同じクエリを実行
  const requests = await prisma.collection_requests.findMany({
    where: {
      org_id: org.id,
    },
    orderBy: { requested_at: 'desc' },
    include: {
      organizations: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      stores: {
        select: {
          id: true,
          store_code: true,
          name: true,
          address: true,
        },
      },
      plans: {
        select: {
          id: true,
          planned_date: true,
          planned_qty: true,
          unit: true,
        },
      },
    },
  })

  console.log(`📊 取得件数: ${requests.length}件\n`)

  if (requests.length > 0) {
    console.log('📋 最初の3件:')
    requests.slice(0, 3).forEach((req, i) => {
      console.log(`\n${i + 1}. ID: ${req.id}`)
      console.log(`   組織: ${req.organizations?.name || 'N/A'}`)
      console.log(`   店舗: ${req.stores?.name || 'N/A'} (${req.stores?.store_code || 'N/A'})`)
      console.log(`   ステータス: ${req.status}`)
      console.log(`   依頼日: ${req.requested_at}`)
      console.log(`   予定: ${req.plans?.planned_date || 'N/A'}`)
    })

    // 3. レスポンス形式を確認
    console.log('\n\n📦 APIレスポンス形式:')
    console.log(JSON.stringify({
      data: requests.slice(0, 1),
      count: requests.length,
    }, null, 2).substring(0, 500) + '...')
  } else {
    console.log('⚠️ この組織のcollection_requestsが見つかりません')
    
    // 全組織のデータを確認
    const allRequests = await prisma.collection_requests.findMany({
      take: 5,
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log('\n📊 全組織のデータ（最初の5件）:')
    allRequests.forEach((req, i) => {
      console.log(`${i + 1}. org_id: ${req.org_id}, org_name: ${req.organizations?.name}`)
    })

    console.log(`\n⚠️ テストユーザーの org_id: ${org.id}`)
    console.log('⚠️ データの org_id が一致していない可能性があります')
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






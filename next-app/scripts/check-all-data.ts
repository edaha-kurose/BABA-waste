import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// .env.local を読み込む
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 データベーステーブル別件数')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  const tables = {
    '組織': await prisma.organizations.count(),
    'ユーザー': await prisma.app_users.count(),
    'ユーザーロール': await prisma.user_org_roles.count(),
    '店舗': await prisma.stores.count(),
    '収集業者': await prisma.collectors.count(),
    '店舗-収集業者割当': await prisma.store_collector_assignments.count(),
    '廃棄依頼': await prisma.collection_requests.count(),
    '収集予定': await prisma.plans.count(),
    '収集実績': await prisma.actuals.count(),
    '回収情報': await prisma.collections.count(),
    '請求項目': await prisma.app_billing_items.count(),
    '請求サマリー': await prisma.billing_summaries.count(),
    '一斉ヒアリング': await prisma.hearings.count(),
    'ヒアリング回答': await prisma.hearing_responses.count(),
    'ヒアリング対象店舗': await prisma.hearing_external_stores.count(),
    'ヒアリング対象物品': await prisma.hearing_external_store_items.count(),
    'JWNET登録': await prisma.registrations.count(),
    'JWNET予約': await prisma.reservations.count(),
    '物品マップ': await prisma.item_maps.count(),
    '廃棄物マスタ': await prisma.waste_type_masters.count(),
  }

  Object.entries(tables).forEach(([name, count]) => {
    const status = count > 0 ? '✅' : '❌'
    const display = count.toString().padStart(6)
    console.log(`${status} ${name.padEnd(20)} : ${display}件`)
  })

  const total = Object.values(tables).reduce((a, b) => a + b, 0)
  const withData = Object.values(tables).filter(c => c > 0).length
  const totalTables = Object.keys(tables).length

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`合計: ${total}件 (${withData}/${totalTables}テーブル)`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())


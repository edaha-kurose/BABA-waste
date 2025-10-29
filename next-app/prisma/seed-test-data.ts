import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

// モジュールインポート
import { seedStoreAssignments } from './seed-modules/store-assignments'
import { seedItemMatrix } from './seed-modules/item-matrix'
import { seedWastePrices } from './seed-modules/waste-prices'
import { seedBillingItems } from './seed-modules/billing-items'
import { seedCommissionRules } from './seed-modules/commission-rules'

async function main() {
  console.log('🚀 テストデータ作成開始...\n')

  try {
    console.log('📊 Step 1: 店舗・収集業者割り当て作成')
    const assignments = await seedStoreAssignments(prisma)
    console.log(`   ✅ ${assignments.length}件作成完了\n`)

    console.log('📊 Step 2: 品目マトリクス作成')
    const matrix = await seedItemMatrix(prisma)
    console.log(`   ✅ ${matrix.length}件作成完了\n`)

    console.log('📊 Step 3: 廃棄物単価設定')
    const prices = await seedWastePrices(prisma)
    console.log(`   ✅ ${prices.length}件作成完了\n`)

    console.log('📊 Step 4: 請求明細データ作成')
    const billingItems = await seedBillingItems(prisma)
    console.log(`   ✅ ${billingItems.length}件作成完了\n`)

    console.log('📊 Step 5: 手数料ルールマスタ作成')
    const commissionRules = await seedCommissionRules(prisma)
    console.log(`   ✅ ${commissionRules.length}件作成完了\n`)

    console.log('✅ 全てのテストデータ作成完了！')
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
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


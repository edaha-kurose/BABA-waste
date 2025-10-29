// ============================================================================
// 既存データ確認スクリプト
// 目的: テストデータ作成前に既存のマスターデータを確認
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 組織ID（既存のテストデータ用組織）
const ORG_ID = '00000000-0000-0000-0000-000000000001'

async function main() {
  console.log('📊 既存データ確認開始...\n')

  try {
    // ============================================================================
    // 1. 組織データ確認
    // ============================================================================
    console.log('=' . repeat(60))
    console.log('1️⃣  organizations (組織マスター)')
    console.log('='.repeat(60))
    
    const organizations = await prisma.organizations.findMany({
      take: 5,
    })
    console.log(`  件数: ${organizations.length}件`)
    if (organizations.length > 0) {
      console.log(`  例: ${organizations[0].id} - ${organizations[0].name}`)
    }
    console.log('')

    // ============================================================================
    // 2. ユーザーデータ確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('2️⃣  app_users (アプリケーションユーザー)')
    console.log('='.repeat(60))
    
    const appUsers = await prisma.app_users.findMany({
      take: 10,
      include: {
        user_org_roles: {
          where: { org_id: ORG_ID },
        },
      },
    })
    const appUsersInOrg = appUsers.filter(u => u.user_org_roles.length > 0)
    console.log(`  件数（全体）: ${appUsers.length}件`)
    console.log(`  件数（org_id=${ORG_ID}）: ${appUsersInOrg.length}件`)
    if (appUsersInOrg.length > 0) {
      console.log(`  例: ${appUsersInOrg[0].id} - ${appUsersInOrg[0].email}`)
      console.log(`     ロール: ${appUsersInOrg[0].user_org_roles[0].role}`)
    }
    console.log('')

    // ============================================================================
    // 3. 店舗データ確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('3️⃣  stores (店舗マスター)')
    console.log('='.repeat(60))
    
    const stores = await prisma.stores.findMany({
      where: { org_id: ORG_ID, deleted_at: null },
      take: 10,
    })
    console.log(`  件数（org_id=${ORG_ID}）: ${stores.length}件`)
    if (stores.length > 0) {
      stores.forEach((s, idx) => {
        console.log(`  ${idx + 1}. ${s.store_code} - ${s.name} (${s.area || '未設定'})`)
      })
    } else {
      console.log('  ⚠️  店舗データが存在しません → 作成が必要')
    }
    console.log('')

    // ============================================================================
    // 4. 品目マップデータ確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('4️⃣  item_maps (品目マップ)')
    console.log('='.repeat(60))
    
    const itemMaps = await prisma.item_maps.findMany({
      where: { org_id: ORG_ID, deleted_at: null },
      take: 10,
    })
    console.log(`  件数（org_id=${ORG_ID}）: ${itemMaps.length}件`)
    if (itemMaps.length > 0) {
      itemMaps.forEach((i, idx) => {
        console.log(`  ${idx + 1}. ${i.item_label} (${i.jwnet_code}) - ${i.default_unit}`)
      })
    } else {
      console.log('  ⚠️  品目マップデータが存在しません → 作成が必要')
    }
    console.log('')

    // ============================================================================
    // 5. JWNETコードデータ確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('5️⃣  jwnet_waste_codes (JWNETコードマスター)')
    console.log('='.repeat(60))
    
    const jwnetCodes = await prisma.jwnet_waste_codes.findMany({
      take: 10,
    })
    console.log(`  件数: ${jwnetCodes.length}件`)
    if (jwnetCodes.length > 0) {
      jwnetCodes.slice(0, 5).forEach((c, idx) => {
        console.log(`  ${idx + 1}. ${c.code} - ${c.name}`)
      })
    } else {
      console.log('  ⚠️  JWNETコードデータが存在しません')
    }
    console.log('')

    // ============================================================================
    // 6. 廃棄物種別マスター確認（複雑なテーブル）
    // ============================================================================
    console.log('='.repeat(60))
    console.log('6️⃣  waste_type_masters (廃棄物種別マスター) ⚠️ 複雑')
    console.log('='.repeat(60))
    
    const wasteTypes = await prisma.waste_type_masters.findMany({
      where: { org_id: ORG_ID, deleted_at: null },
      take: 5,
    })
    console.log(`  件数（org_id=${ORG_ID}）: ${wasteTypes.length}件`)
    if (wasteTypes.length > 0) {
      wasteTypes.forEach((w, idx) => {
        console.log(`  ${idx + 1}. ${w.waste_type_code} - ${w.waste_type_name}`)
        console.log(`     collector_id: ${w.collector_id}`)
      })
    } else {
      console.log('  ⚠️  廃棄物種別マスターデータが存在しません')
      console.log('  ℹ️  このテーブルは複雑な依存関係を持つため、スキップ推奨')
    }
    console.log('')

    // ============================================================================
    // 7. トランザクションデータ確認
    // ============================================================================
    console.log('='.repeat(60))
    console.log('7️⃣  plans (収集予定)')
    console.log('='.repeat(60))
    
    const plans = await prisma.plans.findMany({
      where: { org_id: ORG_ID, deleted_at: null },
      take: 5,
    })
    console.log(`  件数（org_id=${ORG_ID}）: ${plans.length}件`)
    if (plans.length > 0) {
      console.log(`  最新: ${plans[0].planned_date} - ${plans[0].planned_qty} ${plans[0].unit}`)
    } else {
      console.log('  ⚠️  収集予定データが存在しません → 作成が必要')
    }
    console.log('')

    console.log('='.repeat(60))
    console.log('8️⃣  reservations (JWNET予約)')
    console.log('='.repeat(60))
    
    const reservations = await prisma.reservations.findMany({
      where: { org_id: ORG_ID, deleted_at: null },
      take: 5,
    })
    console.log(`  件数（org_id=${ORG_ID}）: ${reservations.length}件`)
    console.log('')

    console.log('='.repeat(60))
    console.log('9️⃣  registrations (JWNET登録)')
    console.log('='.repeat(60))
    
    const registrations = await prisma.registrations.findMany({
      where: { org_id: ORG_ID, deleted_at: null },
      take: 5,
    })
    console.log(`  件数（org_id=${ORG_ID}）: ${registrations.length}件`)
    console.log('')

    console.log('='.repeat(60))
    console.log('🔟 actuals (実績)')
    console.log('='.repeat(60))
    
    const actuals = await prisma.actuals.findMany({
      where: { org_id: ORG_ID, deleted_at: null },
      take: 5,
    })
    console.log(`  件数（org_id=${ORG_ID}）: ${actuals.length}件`)
    console.log('')

    console.log('='.repeat(60))
    console.log('1️⃣1️⃣ billing_summaries (請求サマリー)')
    console.log('='.repeat(60))
    
    const billingSummaries = await prisma.billing_summaries.findMany({
      where: { org_id: ORG_ID, deleted_at: null },
      take: 5,
    })
    console.log(`  件数（org_id=${ORG_ID}）: ${billingSummaries.length}件`)
    console.log('')

    // ============================================================================
    // 8. サマリー
    // ============================================================================
    console.log('='.repeat(60))
    console.log('📊 サマリー')
    console.log('='.repeat(60))
    console.log('')
    console.log('【マスターデータ】')
    console.log(`  ✅ organizations: ${organizations.length}件`)
    console.log(`  ✅ app_users: ${appUsers.length}件`)
    console.log(`  ${stores.length > 0 ? '✅' : '⚠️ '} stores: ${stores.length}件 ${stores.length === 0 ? '← 作成必要' : ''}`)
    console.log(`  ${itemMaps.length > 0 ? '✅' : '⚠️ '} item_maps: ${itemMaps.length}件 ${itemMaps.length === 0 ? '← 作成必要' : ''}`)
    console.log(`  ✅ jwnet_waste_codes: ${jwnetCodes.length}件`)
    console.log(`  ℹ️  waste_type_masters: ${wasteTypes.length}件 (複雑・スキップ推奨)`)
    console.log('')
    console.log('【トランザクションデータ】')
    console.log(`  ${plans.length > 0 ? '✅' : '⚠️ '} plans: ${plans.length}件 ${plans.length === 0 ? '← 作成必要' : ''}`)
    console.log(`  ${reservations.length > 0 ? '✅' : '⚠️ '} reservations: ${reservations.length}件`)
    console.log(`  ${registrations.length > 0 ? '✅' : '⚠️ '} registrations: ${registrations.length}件`)
    console.log(`  ${actuals.length > 0 ? '✅' : '⚠️ '} actuals: ${actuals.length}件`)
    console.log(`  ${billingSummaries.length > 0 ? '✅' : '⚠️ '} billing_summaries: ${billingSummaries.length}件`)
    console.log('')

    // ============================================================================
    // 9. 推奨アクション
    // ============================================================================
    console.log('='.repeat(60))
    console.log('💡 推奨アクション')
    console.log('='.repeat(60))
    console.log('')

    const needsStores = stores.length === 0
    const needsItemMaps = itemMaps.length === 0
    const needsPlans = plans.length === 0

    if (needsStores || needsItemMaps || needsPlans) {
      console.log('【作成が必要なデータ】')
      if (needsStores) {
        console.log('  1. stores（店舗マスター）: 10店舗作成')
      }
      if (needsItemMaps) {
        console.log('  2. item_maps（品目マップ）: 5-10品目作成')
      }
      if (needsPlans) {
        console.log('  3. plans（収集予定）: 12ヶ月×店舗数×2回/月')
        console.log('  4. reservations/registrations/actuals: Plans に紐づけて作成')
        console.log('  5. billing_summaries: 月次で集計作成')
      }
      console.log('')
      console.log('次のステップ: シンプル版シードスクリプトv2を実行')
      console.log('  → pnpm prisma:seed')
    } else {
      console.log('✅ 既存データが充実しています！')
      console.log('  → E2Eテストを実行可能')
      console.log('  → pnpm test:e2e')
    }
    console.log('')

  } catch (error) {
    console.error('❌ エラー発生:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })


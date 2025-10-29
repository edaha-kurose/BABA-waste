/**
 * 請求管理のテストデータ作成スクリプト
 * 
 * 実行方法:
 * pnpm tsx scripts/seed-billing-test-data.ts
 * 
 * 作成するデータ:
 * 1. 回収実績 (collections) - 従量請求の元データ
 * 2. 固定費用設定 (billing_patterns) - 月額固定費
 * 3. 手数料ルール (commission_rules) - 手数料設定
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('========== 請求管理テストデータ作成開始 ==========\n')

  // 1. 組織とユーザーを取得
  const org = await prisma.organizations.findFirst({
    where: { deleted_at: null },
  })

  if (!org) {
    throw new Error('組織が見つかりません')
  }

  // システム管理者ユーザーを取得（created_byに使用）
  // まず、組織のcreated_byを使用
  let userId: string | null = org.created_by

  // created_byがnullの場合は、最初のユーザーを取得
  if (!userId) {
    const firstUserOrgRole = await prisma.user_org_roles.findFirst({
      where: {
        org_id: org.id,
        deleted_at: null,
      },
    })
    
    if (firstUserOrgRole) {
      userId = firstUserOrgRole.user_id
    } else {
      // それでも見つからない場合は、nullを使用（外部キー制約エラーを回避）
      userId = null
      console.log('⚠️ ユーザーが見つからないため、created_by/updated_byをnullにします')
    }
  }

  console.log(`✅ 組織: ${org.name} (${org.id})`)
  console.log(`✅ ユーザーID: ${userId || 'null'}\n`)

  // 2. 収集業者を取得（なければ作成）
  let collectors = await prisma.collectors.findMany({
    where: {
      org_id: org.id,
      deleted_at: null,
      is_active: true,
    },
    take: 3, // 最初の3社
  })

  if (collectors.length === 0) {
    console.log('⚠️ 収集業者が見つからないため、テストデータを作成します...')
    
    // 収集業者を3社作成
    const collectorNames = [
      'エコ回収株式会社',
      'グリーンリサイクル',
      'クリーン環境サービス',
    ]

    for (const name of collectorNames) {
      const collector = await prisma.collectors.create({
        data: {
          org_id: org.id,
          company_name: name,
          contact_person: '担当者',
          phone: '03-1234-5678',
          email: `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.co.jp`,
          address: '東京都千代田区',
          is_active: true,
          created_by: userId,
          updated_by: userId,
        },
      })
      collectors.push(collector)
    }
  }

  console.log(`✅ 収集業者: ${collectors.length}社\n`)

  // 3. 店舗を取得（なければ作成）
  let stores = await prisma.stores.findMany({
    where: {
      org_id: org.id,
      deleted_at: null,
    },
    take: 5, // 最初の5店舗
  })

  if (stores.length === 0) {
    console.log('⚠️ 店舗が見つからないため、テストデータを作成します...')
    
    // 店舗を5店舗作成
    for (let i = 1; i <= 5; i++) {
      const store = await prisma.stores.create({
        data: {
          org_id: org.id,
          store_code: `STORE-${String(i).padStart(3, '0')}`,
          name: `テスト店舗${i}号店`,
          address: `東京都渋谷区テスト${i}-1-1`,
          created_by: userId,
          updated_by: userId,
        },
      })
      stores.push(store)
    }
  }

  console.log(`✅ 店舗: ${stores.length}店舗\n`)

  // 4. 品目マップを取得（なければ作成）
  let itemMaps = await prisma.item_maps.findMany({
    where: {
      org_id: org.id,
      deleted_at: null,
    },
    take: 5,
  })

  if (itemMaps.length === 0) {
    console.log('⚠️ 品目マップが見つからないため、テストデータを作成します...')
    
    // 品目マップを5件作成
    const itemData = [
      { label: '廃プラスチック', code: '01070' },
      { label: '金属くず', code: '01090' },
      { label: 'ガラスくず', code: '01080' },
      { label: '紙くず', code: '01010' },
      { label: '木くず', code: '01020' },
    ]

    for (const item of itemData) {
      const itemMap = await prisma.item_maps.create({
        data: {
          org_id: org.id,
          item_label: item.label,
          jwnet_code: item.code,
          created_by: userId,
          updated_by: userId,
        },
      })
      itemMaps.push(itemMap)
    }
  }

  console.log(`✅ 品目マップ: ${itemMaps.length}件\n`)

  // 5. 対象月を設定（今月と先月）
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)

  const lastMonth = new Date(thisMonth)
  lastMonth.setMonth(lastMonth.getMonth() - 1)

  console.log(`📅 対象月: ${lastMonth.toISOString().split('T')[0]} と ${thisMonth.toISOString().split('T')[0]}\n`)

  let collectionsCreated = 0
  let billingPatternsCreated = 0
  let commissionRulesCreated = 0

  // 6. トランザクション内でデータ作成
  await prisma.$transaction(async (tx) => {
    // 6-1. 回収実績を作成（従量請求の元データ）
    console.log('📦 回収実績を作成中...')
    
    for (const collector of collectors) {
      for (const store of stores) {
        // 先月分の回収実績（5件）
        for (let i = 0; i < 5; i++) {
          const itemMap = itemMaps[i % itemMaps.length]
          const collectedDate = new Date(lastMonth)
          collectedDate.setDate(5 + i * 5) // 5日、10日、15日、20日、25日

          const quantity = Math.floor(Math.random() * 50) + 10 // 10〜60kg
          const unitPrice = 150 + Math.floor(Math.random() * 100) // 150〜250円/kg

          await tx.collections.create({
            data: {
              org_id: org.id,
              store_id: store.id,
              collector_id: collector.id,
              item_name: itemMap.item_label,
              item_code: itemMap.jwnet_code,
              quantity,
              actual_qty: quantity, // 実際の数量
              unit: 'kg',
              actual_unit: 'kg', // 実際の単位
              unit_price: unitPrice,
              total_amount: quantity * unitPrice,
              collected_at: collectedDate,
              status: 'COMPLETED',
              is_billed: false, // まだ請求されていない
              created_by: userId,
              updated_by: userId,
            },
          })

          collectionsCreated++
        }

        // 今月分の回収実績（3件）
        for (let i = 0; i < 3; i++) {
          const itemMap = itemMaps[i % itemMaps.length]
          const collectedDate = new Date(thisMonth)
          collectedDate.setDate(5 + i * 7) // 5日、12日、19日

          const quantity = Math.floor(Math.random() * 50) + 10
          const unitPrice = 150 + Math.floor(Math.random() * 100)

          await tx.collections.create({
            data: {
              org_id: org.id,
              store_id: store.id,
              collector_id: collector.id,
              item_name: itemMap.item_label,
              item_code: itemMap.jwnet_code,
              quantity,
              actual_qty: quantity,
              unit: 'kg',
              actual_unit: 'kg',
              unit_price: unitPrice,
              total_amount: quantity * unitPrice,
              collected_at: collectedDate,
              status: 'COMPLETED',
              is_billed: false,
              created_by: userId,
              updated_by: userId,
            },
          })

          collectionsCreated++
        }
      }
    }

    console.log(`  ✅ 回収実績: ${collectionsCreated}件作成\n`)

    // 6-2. 固定費用設定を作成（月額固定費）
    console.log('💰 固定費用設定を作成中...')

    for (const collector of collectors) {
      // 既存の設定をチェック
      const existing = await tx.billing_patterns.findFirst({
        where: {
          org_id: org.id,
          collector_id: collector.id,
          billing_type: 'FIXED',
          deleted_at: null,
        },
      })

      if (!existing) {
        await tx.billing_patterns.create({
          data: {
            org_id: org.id,
            collector_id: collector.id,
            billing_type: 'FIXED',
            item_name: '月額基本料金',
            amount: 50000 + Math.floor(Math.random() * 50000), // 50,000〜100,000円
            effective_from: lastMonth,
            effective_to: null, // 無期限
            is_active: true,
            created_by: user.id,
            updated_by: user.id,
          },
        })

        billingPatternsCreated++
      }
    }

    console.log(`  ✅ 固定費用設定: ${billingPatternsCreated}件作成\n`)

    // 6-3. 手数料ルールを作成
    console.log('📊 手数料ルールを作成中...')

    for (const collector of collectors) {
      // 既存のルールをチェック
      const existing = await tx.commission_rules.findFirst({
        where: {
          org_id: org.id,
          collector_id: collector.id,
          deleted_at: null,
        },
      })

      if (!existing) {
        // 50%の確率でパーセンテージ型、50%で固定額型
        const isPercentage = Math.random() > 0.5

        await tx.commission_rules.create({
          data: {
            org_id: org.id,
            collector_id: collector.id,
            commission_type: isPercentage ? 'PERCENTAGE' : 'FIXED_AMOUNT',
            commission_value: isPercentage 
              ? 5 + Math.floor(Math.random() * 10) // 5〜15%
              : 10000 + Math.floor(Math.random() * 20000), // 10,000〜30,000円
            effective_from: lastMonth,
            effective_to: null,
            is_active: true,
            created_by: user.id,
            updated_by: user.id,
          },
        })

        commissionRulesCreated++
      }
    }

    console.log(`  ✅ 手数料ルール: ${commissionRulesCreated}件作成\n`)
  })

  console.log('========== 完了 ==========')
  console.log(`📦 回収実績: ${collectionsCreated}件`)
  console.log(`💰 固定費用設定: ${billingPatternsCreated}件`)
  console.log(`📊 手数料ルール: ${commissionRulesCreated}件`)
  console.log('\n次のステップ:')
  console.log('1. ブラウザで http://localhost:3001/dashboard/billing にアクセス')
  console.log('2. 収集業者を選択')
  console.log('3. 「選択した収集業者の請求明細を生成」ボタンをクリック')
  console.log('4. 「全収集業者の請求サマリーを一括生成」ボタンをクリック')
}

main()
  .catch((error) => {
    console.error('❌ エラー:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

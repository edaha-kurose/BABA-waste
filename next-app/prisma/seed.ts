// ============================================================================
// Prismaシードスクリプト（1年分の完全テストデータ）
// 目的: 廃棄依頼→請求までの完全フロー（2024年1月～12月）
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 組織ID（既存のテストデータ用組織）
const ORG_ID = '00000000-0000-0000-0000-000000000001'

// ユーザーID（既存のadminユーザー）
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001'

async function main() {
  console.log('🌱 シード開始...')

  try {
    // ============================================================================
    // 1. 既存のテストデータをクリーンアップ（論理削除）
    // ============================================================================
    console.log('🗑️  既存テストデータをクリーンアップ中...')

    await prisma.$transaction(async (tx) => {
      const now = new Date()

      // Plans削除（関連データも連鎖削除される）
      await tx.plans.updateMany({
        where: { org_id: ORG_ID, deleted_at: null },
        data: { deleted_at: now },
      })

      // Stores削除
      await tx.stores.updateMany({
        where: { org_id: ORG_ID, deleted_at: null },
        data: { deleted_at: now },
      })

      // Item Maps削除
      await tx.item_maps.updateMany({
        where: { org_id: ORG_ID, deleted_at: null },
        data: { deleted_at: now },
      })

      console.log('✅ クリーンアップ完了')
    })

    // ============================================================================
    // 2. 店舗データ作成（10店舗）
    // ============================================================================
    console.log('🏪 店舗データ作成中...')

const stores = await prisma.$transaction(
  [
    { id: 'store-001', code: 'ST001', name: '本店', area: '東京' },
    { id: 'store-002', code: 'ST002', name: '支店A', area: '東京' },
    { id: 'store-003', code: 'ST003', name: '支店B', area: '東京' },
    { id: 'store-004', code: 'ST004', name: '支店C', area: '大阪' },
    { id: 'store-005', code: 'ST005', name: '支店D', area: '大阪' },
    { id: 'store-006', code: 'ST006', name: '支店E', area: '名古屋' },
    { id: 'store-007', code: 'ST007', name: '支店F', area: '福岡' },
    { id: 'store-008', code: 'ST008', name: '支店G', area: '札幌' },
    { id: 'store-009', code: 'ST009', name: '支店H', area: '仙台' },
    { id: 'store-010', code: 'ST010', name: '支店I', area: '広島' },
  ].map((s) =>
    prisma.stores.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        org_id: ORG_ID,
        store_code: s.code,
        name: s.name,
        area: s.area,
        emitter_no: `EMIT-${s.code}`,
        address: `${s.area}都道府県 XX区XX町1-2-3`,
        created_by: ADMIN_USER_ID,
        updated_by: ADMIN_USER_ID,
      },
      update: {
        deleted_at: null,
        updated_at: new Date(),
      },
    })
  )
)

    console.log(`✅ 店舗データ作成完了: ${stores.length}件`)

    // ============================================================================
    // 3. 品目マップデータ作成（5種類）
    // ============================================================================
    console.log('📦 品目マップデータ作成中...')

    const itemMaps = await prisma.$transaction(
      [
        {
          id: 'item-001',
          label: '混合廃棄物',
          code: 'W0101',
          hazard: false,
          unit: 'T' as const,
        },
        {
          id: 'item-002',
          label: '廃プラスチック類',
          code: 'W0301',
          hazard: false,
          unit: 'T' as const,
        },
        {
          id: 'item-003',
          label: '蛍光灯',
          code: 'W0202',
          hazard: true,
          unit: 'KG' as const,
        },
        {
          id: 'item-004',
          label: '木くず',
          code: 'W0402',
          hazard: false,
          unit: 'M3' as const,
        },
        {
          id: 'item-005',
          label: '金属くず',
          code: 'W0901',
          hazard: false,
          unit: 'T' as const,
        },
      ].map((i) =>
        prisma.item_maps.upsert({
          where: { id: i.id },
          create: {
            id: i.id,
            org_id: ORG_ID,
            item_label: i.label,
            jwnet_code: i.code,
            hazard: i.hazard,
            default_unit: i.unit,
            density_t_per_m3: i.unit === 'M3' ? 0.4 : i.unit === 'KG' ? 1.0 : 0.5,
            disposal_method_code: i.hazard ? 'D02' : 'D13',
            notes: `${i.label}のテストデータ`,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      )
    )

    console.log(`✅ 品目マップデータ作成完了: ${itemMaps.length}件`)

    // ============================================================================
    // 3.5. 未設定マトリクス用テストデータ（一部の店舗×品目で業者未割当）
    // ============================================================================
    console.log('🔧 未設定マトリクス用データ作成中...')

    // 店舗1～5には全品目に業者を割り当て（通常パターン）
    for (let i = 0; i < 5; i++) {
      for (const itemMap of itemMaps) {
        await prisma.store_item_collectors.upsert({
          where: {
            store_id_item_name: {
              store_id: stores[i].id,
              item_name: itemMap.item_label,
            },
          },
          create: {
            org_id: ORG_ID,
            store_id: stores[i].id,
            item_name: itemMap.item_label,
            item_code: itemMap.jwnet_code,
            collector_id: 'collector-001',
            priority: 1,
            is_active: true,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      }
    }

    // 店舗6～10は一部の品目のみ業者を割り当て（未設定マトリクスを意図的に作成）
    for (let i = 5; i < 10; i++) {
      // 最初の2品目のみ割り当て（残り3品目は未設定）
      for (let j = 0; j < 2; j++) {
        await prisma.store_item_collectors.upsert({
          where: {
            store_id_item_name: {
              store_id: stores[i].id,
              item_name: itemMaps[j].item_label,
            },
          },
          create: {
            org_id: ORG_ID,
            store_id: stores[i].id,
            item_name: itemMaps[j].item_label,
            item_code: itemMaps[j].jwnet_code,
            collector_id: 'collector-001',
            priority: 1,
            is_active: true,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      }
    }

    console.log('✅ 未設定マトリクス用データ作成完了（店舗6～10で15件の未設定あり）')

    // ============================================================================
    // 4. 収集予定データ作成（12ヶ月×10店舗×2回/月 = 240件）
    // ============================================================================
    console.log('📅 収集予定データ作成中...')

    let plansCount = 0
    let reservationsCount = 0
    let registrationsCount = 0
    let actualsCount = 0

    for (let month = 1; month <= 12; month++) {
      console.log(`  ${month}月のデータ作成中...`)

      for (const store of stores) {
        for (let week = 1; week <= 2; week++) {
          // ランダムな品目を選択
          const itemMap = itemMaps[Math.floor(Math.random() * itemMaps.length)]

          // 日付設定（上旬:10日、下旬:25日）
          const day = week === 1 ? 10 : 25
          const plannedDate = new Date(2024, month - 1, day)

          // 数量（1.0～5.0のランダム）
          const quantity = 1.0 + Math.random() * 4.0

          // Plan ID
          const planId = `plan-2024-${month.toString().padStart(2, '0')}-${store.store_code}-${week}`

          // Plan作成
          const plan = await prisma.plans.create({
            data: {
              id: planId,
              org_id: ORG_ID,
              store_id: store.id,
              planned_date: plannedDate,
              item_map_id: itemMap.id,
              planned_qty: quantity,
              unit: itemMap.default_unit,
              earliest_pickup_date: new Date(
                plannedDate.getTime() + 3 * 24 * 60 * 60 * 1000
              ),
              route_id: `ROUTE-${month}`,
              created_by: ADMIN_USER_ID,
              updated_by: ADMIN_USER_ID,
            },
          })

          plansCount++

          // Reservation作成（90%がRESERVED）
          const reservationStatus = Math.random() > 0.1 ? 'RESERVED' : 'PENDING'
          const reservation = await prisma.reservations.create({
            data: {
              id: `reservation-${planId}`,
              org_id: ORG_ID,
              plan_id: plan.id,
              jwnet_temp_id: `TEMP-${planId}`,
              payload_hash: `hash-${planId}`,
              status: reservationStatus,
              last_sent_at:
                reservationStatus === 'RESERVED'
                  ? new Date(plannedDate.getTime() - 2 * 24 * 60 * 60 * 1000)
                  : null,
              created_by: ADMIN_USER_ID,
              updated_by: ADMIN_USER_ID,
            },
          })

          reservationsCount++

          // Registration作成（RESERVED Plansの95%がREGISTERED）
          if (reservationStatus === 'RESERVED' && Math.random() > 0.05) {
            const manifestNo = `MF-2024-${month.toString().padStart(2, '0')}-${plansCount.toString().padStart(5, '0')}`

            await prisma.registrations.create({
              data: {
                id: `registration-${planId}`,
                org_id: ORG_ID,
                plan_id: plan.id,
                manifest_no: manifestNo,
                status: 'REGISTERED',
                last_sent_at: new Date(plannedDate.getTime() - 1 * 24 * 60 * 60 * 1000),
                created_by: ADMIN_USER_ID,
                updated_by: ADMIN_USER_ID,
              },
            })

            registrationsCount++

            // Actual作成（REGISTERED Plansに対して）
            const actualQty = quantity * (0.9 + Math.random() * 0.2) // 90～110%
            const drivers = ['田中太郎', '佐藤花子', '鈴木一郎', '高橋次郎']

            await prisma.actuals.create({
              data: {
                id: `actual-${planId}`,
                org_id: ORG_ID,
                plan_id: plan.id,
                actual_qty: actualQty,
                unit: plan.unit,
                vehicle_no: `VEH-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
                driver_name: drivers[Math.floor(Math.random() * drivers.length)],
                weighing_ticket_no: `WT-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
                photo_urls: [],
                confirmed_at: new Date(plannedDate.getTime() + 1 * 24 * 60 * 60 * 1000),
                created_by: ADMIN_USER_ID,
                updated_by: ADMIN_USER_ID,
              },
            })

            actualsCount++
          }
        }
      }
    }

    console.log(`✅ 収集予定データ作成完了: ${plansCount}件`)
    console.log(`✅ 予約データ作成完了: ${reservationsCount}件`)
    console.log(`✅ 登録データ作成完了: ${registrationsCount}件`)
    console.log(`✅ 実績データ作成完了: ${actualsCount}件`)

    // ============================================================================
    // 5. 請求サマリーデータ作成（月次集計）
    // ============================================================================
    console.log('💰 請求サマリーデータ作成中...')

    const billingSummaries = []

    for (let month = 1; month <= 12; month++) {
      const billingMonth = new Date(2024, month - 1, 1)

      // 月次集計
      const monthlyActuals = await prisma.actuals.findMany({
        where: {
          org_id: ORG_ID,
          deleted_at: null,
          confirmed_at: {
            gte: new Date(2024, month - 1, 1),
            lt: new Date(2024, month, 1),
          },
        },
      })

      if (monthlyActuals.length === 0) continue

      const totalQty = monthlyActuals.reduce((sum, a) => sum + Number(a.actual_qty), 0)
      const transportCost = Math.round(totalQty * 10000) // 10,000円/トン
      const disposalCost = Math.round(totalQty * 15000) // 15,000円/トン
      const subtotal = transportCost + disposalCost
      const taxAmount = Math.round(subtotal * 0.1) // 消費税10%
      const totalAmount = subtotal + taxAmount

      const summary = await prisma.billing_summaries.create({
        data: {
          id: `billing-2024-${month.toString().padStart(2, '0')}`,
          org_id: ORG_ID,
          billing_month: billingMonth,
          total_quantity: totalQty,
          total_amount: totalAmount,
          total_transport_cost: transportCost,
          total_disposal_cost: disposalCost,
          tax_amount: taxAmount,
          status: 'APPROVED',
          created_by: ADMIN_USER_ID,
          updated_by: ADMIN_USER_ID,
        },
      })

      billingSummaries.push(summary)

      console.log(
        `  ${month}月: ${totalQty.toFixed(2)}トン, ${totalAmount.toLocaleString()}円`
      )
    }

    console.log(`✅ 請求サマリーデータ作成完了: ${billingSummaries.length}件`)

    // ============================================================================
    // 6. 最終検証
    // ============================================================================
    console.log('')
    console.log('📊 最終検証...')

    const finalCounts = {
      stores: await prisma.stores.count({
        where: { org_id: ORG_ID, deleted_at: null },
      }),
      itemMaps: await prisma.item_maps.count({
        where: { org_id: ORG_ID, deleted_at: null },
      }),
      plans: await prisma.plans.count({
        where: { org_id: ORG_ID, deleted_at: null },
      }),
      reservations: await prisma.reservations.count({
        where: { org_id: ORG_ID, deleted_at: null },
      }),
      registrations: await prisma.registrations.count({
        where: { org_id: ORG_ID, deleted_at: null },
      }),
      actuals: await prisma.actuals.count({
        where: { org_id: ORG_ID, deleted_at: null },
      }),
      billingSummaries: await prisma.billing_summaries.count({
        where: { org_id: ORG_ID, deleted_at: null },
      }),
    }

    console.log('')
    console.log('✅ テストデータ作成完了:')
    console.log(`  - 店舗: ${finalCounts.stores}件`)
    console.log(`  - 品目: ${finalCounts.itemMaps}件`)
    console.log(`  - 収集予定: ${finalCounts.plans}件`)
    console.log(`  - 予約: ${finalCounts.reservations}件`)
    console.log(`  - 登録: ${finalCounts.registrations}件`)
    console.log(`  - 実績: ${finalCounts.actuals}件`)
    console.log(`  - 請求サマリー: ${finalCounts.billingSummaries}件`)

    // 異常チェック
    if (finalCounts.plans < 200) {
      throw new Error(`Plans件数が少なすぎます: ${finalCounts.plans}`)
    }

    if (finalCounts.billingSummaries !== 12) {
      throw new Error(
        `Billing Summaries件数が12ヶ月分ではありません: ${finalCounts.billingSummaries}`
      )
    }

    console.log('')
    console.log('🎉 1年分の完全テストデータ作成が完了しました！')
    console.log('📊 2024年1月～12月の請求データが利用可能です。')
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


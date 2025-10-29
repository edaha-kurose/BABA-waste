// ============================================================================
// 最終版Prismaシードスクリプト
// 目的: 完全なマスター + 1年分のテストデータ作成
// 前提: collectors テーブルが作成済み、外部キー制約が追加済み
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

// 組織ID（既存のテストデータ用組織）
const ORG_ID = '00000000-0000-0000-0000-000000000001'

// ユーザーID（既存のadminユーザーの auth_user_id）
const ADMIN_AUTH_USER_ID = '1a9eb299-e83a-49fe-bf3c-48aa37646d6d' // admin@test.com の auth_user_id
const ADMIN_APP_USER_ID = '579c9ffd-c3c0-4b1a-8e7e-8c6845c3165d' // admin@test.com の app_user_id

// 色付きログ
const log = {
  section: (msg: string) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`),
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  warning: (msg: string) => console.log(`⚠️  ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
}

async function main() {
  log.section('🌱 最終版シード開始')

  try {
    // ============================================================================
    // 0. クリーンアップ
    // ============================================================================
    log.section('🗑️  既存テストデータをクリーンアップ')

    await prisma.$transaction(async (tx) => {
      const now = new Date()

      await tx.plans.updateMany({
        where: { org_id: ORG_ID, deleted_at: null },
        data: { deleted_at: now },
      })
      await tx.stores.updateMany({
        where: { org_id: ORG_ID, deleted_at: null },
        data: { deleted_at: now },
      })
      await tx.item_maps.updateMany({
        where: { org_id: ORG_ID, deleted_at: null },
        data: { deleted_at: now },
      })

      log.success('クリーンアップ完了')
    })

    // ============================================================================
    // 1. 収集業者データ作成（1社のみ、既存のcollector@test.comを使用）
    // ============================================================================
    log.section('🚚 収集業者データ作成')

    // 既存のcollector@test.comユーザーを取得
    const collectorUser = await prisma.app_users.findUnique({
      where: { email: 'collector@test.com' },
    })

    if (!collectorUser) {
      throw new Error('collector@test.com ユーザーが見つかりません')
    }

    log.info(`collector@test.com ユーザーを使用: ${collectorUser.id}`)

    // collectors作成（1社のみ）
    const collector = await prisma.collectors.upsert({
      where: { user_id: collectorUser.id },
      create: {
        company_name: 'エコ回収株式会社（テスト）',
        license_number: '東京都-産廃-001',
        service_areas: ['東京', '神奈川', '全国'],
        address: '東京都千代田区テストビル 1-2-3',
        phone: '03-1234-5678',
        contact_person: '田中太郎',
        is_active: true,
        created_by: ADMIN_AUTH_USER_ID,
        updated_by: ADMIN_AUTH_USER_ID,
        users: { connect: { id: collectorUser.id } },
        organizations: { connect: { id: ORG_ID } },
      },
      update: {
        deleted_at: null,
        updated_at: new Date(),
      },
    })

    const collectors = [collector]

    log.success(`収集業者データ作成完了: ${collectors.length}社`)

    // ============================================================================
    // 2. 店舗データ作成（10店舗）
    // ============================================================================
    log.section('🏪 店舗データ作成')

    const storeData = [
      { code: 'ST001', name: '本店', area: '東京' },
      { code: 'ST002', name: '支店A', area: '東京' },
      { code: 'ST003', name: '支店B', area: '東京' },
      { code: 'ST004', name: '支店C', area: '大阪' },
      { code: 'ST005', name: '支店D', area: '大阪' },
      { code: 'ST006', name: '支店E', area: '名古屋' },
      { code: 'ST007', name: '支店F', area: '福岡' },
      { code: 'ST008', name: '支店G', area: '札幌' },
      { code: 'ST009', name: '支店H', area: '仙台' },
      { code: 'ST010', name: '支店I', area: '広島' },
    ]

    const stores = await prisma.$transaction(
      storeData.map((s) =>
        prisma.stores.upsert({
          where: {
            org_id_store_code: {
              org_id: ORG_ID,
              store_code: s.code,
            },
          },
          create: {
            org_id: ORG_ID,
            store_code: s.code,
            name: s.name,
            area: s.area,
            emitter_no: `EMIT-${s.code}`,
            address: `${s.area}都道府県 XX区XX町1-2-3`,
            created_by: ADMIN_AUTH_USER_ID,
            updated_by: ADMIN_AUTH_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      )
    )

    log.success(`店舗データ作成完了: ${stores.length}件`)

    // ============================================================================
    // 3. 品目マップ作成（10種類）
    // ============================================================================
    log.section('📦 品目マップデータ作成')

    const itemMapsData = [
      { label: '混合廃棄物', code: 'W20', hazard: false, unit: 'T' as const },
      { label: '廃プラスチック類', code: 'W06', hazard: false, unit: 'T' as const },
      { label: '蛍光灯（水銀含有）', code: 'W17', hazard: true, unit: 'KG' as const },
      { label: '木くず', code: 'W08', hazard: false, unit: 'M3' as const },
      { label: '金属くず', code: 'W13', hazard: false, unit: 'T' as const },
      { label: '紙くず', code: 'W07', hazard: false, unit: 'T' as const },
      { label: 'ガラスくず', code: 'W14', hazard: false, unit: 'T' as const },
      { label: '廃油', code: 'W03', hazard: true, unit: 'T' as const },
      { label: 'がれき類', code: 'W16', hazard: false, unit: 'T' as const },
      { label: '汚泥', code: 'W02', hazard: false, unit: 'T' as const },
    ]

    const itemMaps = await prisma.$transaction(
      itemMapsData.map((i) =>
        prisma.item_maps.upsert({
          where: {
            org_id_item_label: {
              org_id: ORG_ID,
              item_label: i.label,
            },
          },
          create: {
            org_id: ORG_ID,
            item_label: i.label,
            jwnet_code: i.code,
            hazard: i.hazard,
            default_unit: i.unit,
            density_t_per_m3: i.unit === 'M3' ? 0.4 : i.unit === 'KG' ? 1.0 : 0.5,
            disposal_method_code: i.hazard ? 'D02' : 'D13',
            notes: `${i.label}`,
            created_by: ADMIN_AUTH_USER_ID,
            updated_by: ADMIN_AUTH_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      )
    )

    log.success(`品目マップデータ作成完了: ${itemMaps.length}件`)

    // ============================================================================
    // 3.5. 未設定マトリクス用テストデータ（店舗6～10で15件の未設定を作成）
    // ============================================================================
    log.section('🔧 未設定マトリクス用データ作成')

    // 店舗1～5には全品目に業者を割り当て
    for (let i = 0; i < 5; i++) {
      for (const itemMap of itemMaps) {
        await prisma.store_item_collectors.upsert({
          where: {
            org_id_store_id_item_name_collector_id: {
              org_id: ORG_ID,
              store_id: stores[i].id,
              item_name: itemMap.item_label,
              collector_id: collector.id,
            },
          },
          create: {
            org_id: ORG_ID,
            store_id: stores[i].id,
            item_name: itemMap.item_label,
            item_code: itemMap.jwnet_code,
            collector_id: collector.id,
            priority: 1,
            is_active: true,
            created_by: ADMIN_AUTH_USER_ID,
            updated_by: ADMIN_AUTH_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      }
    }

    // 店舗6～10は最初の2品目のみ割り当て（残り8品目×5店舗=40件が未設定）
    for (let i = 5; i < 10; i++) {
      for (let j = 0; j < 2; j++) {
        await prisma.store_item_collectors.upsert({
          where: {
            org_id_store_id_item_name_collector_id: {
              org_id: ORG_ID,
              store_id: stores[i].id,
              item_name: itemMaps[j].item_label,
              collector_id: collector.id,
            },
          },
          create: {
            org_id: ORG_ID,
            store_id: stores[i].id,
            item_name: itemMaps[j].item_label,
            item_code: itemMaps[j].jwnet_code,
            collector_id: collector.id,
            priority: 1,
            is_active: true,
            created_by: ADMIN_AUTH_USER_ID,
            updated_by: ADMIN_AUTH_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      }
    }

    log.success('未設定マトリクス用データ作成完了（店舗6～10で40件の未設定あり）')

    // ============================================================================
    // 4. 収集予定データ作成（12ヶ月×10店舗×2回/月 = 240件）
    // ============================================================================
    log.section('📅 収集予定データ作成（1年分）')

    let plansCount = 0
    let reservationsCount = 0
    let registrationsCount = 0
    let actualsCount = 0

    for (let month = 1; month <= 12; month++) {
      log.info(`${month}月のデータ作成中...`)

      for (const store of stores) {
        for (let week = 1; week <= 2; week++) {
          const itemMap = itemMaps[Math.floor(Math.random() * itemMaps.length)]
          const day = week === 1 ? 10 : 25
          const plannedDate = new Date(2024, month - 1, day)
          const quantity = 1.0 + Math.random() * 4.0

          const plan = await prisma.plans.upsert({
            where: {
              org_id_store_id_planned_date_item_map_id: {
                org_id: ORG_ID,
                store_id: store.id,
                planned_date: plannedDate,
                item_map_id: itemMap.id,
              },
            },
            create: {
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
              created_by: ADMIN_AUTH_USER_ID,
              updated_by: ADMIN_AUTH_USER_ID,
            },
            update: {
              deleted_at: null,
              updated_at: new Date(),
              planned_qty: quantity,
              unit: itemMap.default_unit,
            },
          })

          plansCount++

          // Reservation作成（90%がRESERVED）
          const reservationStatus = Math.random() > 0.1 ? 'RESERVED' : 'PENDING'
          await prisma.reservations.upsert({
            where: {
              org_id_plan_id: {
                org_id: ORG_ID,
                plan_id: plan.id,
              },
            },
            create: {
              org_id: ORG_ID,
              plan_id: plan.id,
              jwnet_temp_id: `TEMP-${month}-${plansCount}`,
              payload_hash: `hash-${plan.id}-${Date.now()}`,
              status: reservationStatus,
              last_sent_at:
                reservationStatus === 'RESERVED'
                  ? new Date(plannedDate.getTime() - 2 * 24 * 60 * 60 * 1000)
                  : null,
              created_by: ADMIN_AUTH_USER_ID,
              updated_by: ADMIN_AUTH_USER_ID,
            },
            update: {
              deleted_at: null,
              updated_at: new Date(),
              status: reservationStatus,
            },
          })

          reservationsCount++

          // Registration作成（RESERVED Plansの95%がREGISTERED）
          if (reservationStatus === 'RESERVED' && Math.random() > 0.05) {
            const manifestNo = `MF-2024-${month.toString().padStart(2, '0')}-${plansCount.toString().padStart(5, '0')}`

            await prisma.registrations.upsert({
              where: {
                plan_id: plan.id,
              },
              create: {
                org_id: ORG_ID,
                plan_id: plan.id,
                manifest_no: manifestNo,
                status: 'REGISTERED',
                last_sent_at: new Date(plannedDate.getTime() - 1 * 24 * 60 * 60 * 1000),
                created_by: ADMIN_AUTH_USER_ID,
                updated_by: ADMIN_AUTH_USER_ID,
              },
              update: {
                deleted_at: null,
                updated_at: new Date(),
                status: 'REGISTERED',
              },
            })

            registrationsCount++

            // Actual作成
            const actualQty = quantity * (0.9 + Math.random() * 0.2)
            const drivers = ['田中太郎', '佐藤花子', '鈴木一郎', '高橋次郎', '伊藤美咲']

            await prisma.actuals.upsert({
              where: {
                plan_id: plan.id,
              },
              create: {
                org_id: ORG_ID,
                plan_id: plan.id,
                actual_qty: actualQty,
                unit: plan.unit,
                vehicle_no: `VEH-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
                driver_name: drivers[Math.floor(Math.random() * drivers.length)],
                weighing_ticket_no: `WT-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
                photo_urls: [],
                confirmed_at: new Date(plannedDate.getTime() + 1 * 24 * 60 * 60 * 1000),
                created_by: ADMIN_AUTH_USER_ID,
                updated_by: ADMIN_AUTH_USER_ID,
              },
              update: {
                deleted_at: null,
                updated_at: new Date(),
                actual_qty: actualQty,
              },
            })

            actualsCount++
          }
        }
      }
    }

    log.success(`収集予定データ作成完了: ${plansCount}件`)
    log.success(`予約データ作成完了: ${reservationsCount}件`)
    log.success(`登録データ作成完了: ${registrationsCount}件`)
    log.success(`実績データ作成完了: ${actualsCount}件`)

    // ============================================================================
    // 5. 請求サマリーデータ作成
    // ============================================================================
    log.section('💰 請求サマリーデータ作成')

    // collectors の最初のIDを取得
    const firstCollector = collectors[0]

    const billingSummaries = []

    for (let month = 1; month <= 12; month++) {
      const billingMonth = new Date(2024, month - 1, 1)

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
      const fixedAmount = 50000 // 基本料金
      const meteredAmount = Math.round(totalQty * 15000) // 従量料金
      const subtotal = fixedAmount + meteredAmount
      const taxAmount = Math.round(subtotal * 0.1)
      const totalAmount = subtotal + taxAmount

      const summary = await prisma.billing_summaries.upsert({
        where: {
          org_id_collector_id_billing_month: {
            org_id: ORG_ID,
            collector_id: firstCollector.id,
            billing_month: billingMonth,
          },
        },
        create: {
          org_id: ORG_ID,
          collector_id: firstCollector.id,
          billing_month: billingMonth,
          total_fixed_amount: fixedAmount,
          total_metered_amount: meteredAmount,
          total_other_amount: 0,
          subtotal_amount: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          total_items_count: monthlyActuals.length,
          fixed_items_count: 1,
          metered_items_count: monthlyActuals.length,
          other_items_count: 0,
          status: 'APPROVED',
          created_by: ADMIN_AUTH_USER_ID,
          updated_by: ADMIN_AUTH_USER_ID,
        },
        update: {
          total_fixed_amount: fixedAmount,
          total_metered_amount: meteredAmount,
          subtotal_amount: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          total_items_count: monthlyActuals.length,
          updated_at: new Date(),
        },
      })

      billingSummaries.push(summary)

      log.info(`${month}月: ${totalQty.toFixed(2)}トン, ${totalAmount.toLocaleString()}円`)
    }

    log.success(`請求サマリーデータ作成完了: ${billingSummaries.length}件`)

    // ============================================================================
    // 6. 最終検証
    // ============================================================================
    log.section('📊 最終検証')

    const finalCounts = {
      collectors: await prisma.collectors.count({ where: { deleted_at: null } }),
      stores: await prisma.stores.count({ where: { org_id: ORG_ID, deleted_at: null } }),
      itemMaps: await prisma.item_maps.count({ where: { org_id: ORG_ID, deleted_at: null } }),
      plans: await prisma.plans.count({ where: { org_id: ORG_ID, deleted_at: null } }),
      reservations: await prisma.reservations.count({ where: { org_id: ORG_ID, deleted_at: null } }),
      registrations: await prisma.registrations.count({ where: { org_id: ORG_ID, deleted_at: null } }),
      actuals: await prisma.actuals.count({ where: { org_id: ORG_ID, deleted_at: null } }),
      billingSummaries: await prisma.billing_summaries.count({ where: { org_id: ORG_ID } }),
    }

    log.section('🎉 最終版テストデータ作成完了！')
    console.log('')
    console.log('【マスターデータ】')
    console.log(`  - 収集業者: ${finalCounts.collectors}社`)
    console.log(`  - 店舗: ${finalCounts.stores}件`)
    console.log(`  - 品目マップ: ${finalCounts.itemMaps}件`)
    console.log('')
    console.log('【トランザクションデータ】')
    console.log(`  - 収集予定: ${finalCounts.plans}件`)
    console.log(`  - 予約: ${finalCounts.reservations}件`)
    console.log(`  - 登録: ${finalCounts.registrations}件`)
    console.log(`  - 実績: ${finalCounts.actuals}件`)
    console.log(`  - 請求サマリー: ${finalCounts.billingSummaries}件`)
    console.log('')

    if (finalCounts.plans < 200) {
      throw new Error(`Plans件数が少なすぎます: ${finalCounts.plans}`)
    }

    // ============================================================================
    // 7. 廃棄物マスターデータ作成
    // ============================================================================
    log.section('🗑️ 廃棄物マスターデータ作成')

    // まずJWNET廃棄物コードを1件取得（外部キー用）
    const jwnetCode = await prisma.jwnet_waste_codes.findFirst()
    if (!jwnetCode) {
      throw new Error('JWNET廃棄物コードが見つかりません')
    }

    const wasteTypeData = [
      { code: 'WT001', name: '一般廃棄物', category: '一般', classification: '可燃ごみ', unit: 'kg', unit_price: 50 },
      { code: 'WT002', name: '産業廃棄物（紙くず）', category: '産廃', classification: '紙くず', unit: 'kg', unit_price: 80 },
      { code: 'WT003', name: '産業廃棄物（廃プラスチック）', category: '産廃', classification: '廃プラ', unit: 'kg', unit_price: 100 },
      { code: 'WT004', name: '産業廃棄物（金属くず）', category: '産廃', classification: '金属くず', unit: 'kg', unit_price: 60 },
      { code: 'WT005', name: '産業廃棄物（ガラスくず）', category: '産廃', classification: 'ガラス', unit: 'kg', unit_price: 70 },
    ]

    const wasteTypes = await prisma.$transaction(
      wasteTypeData.map((wt) =>
        prisma.waste_type_masters.upsert({
          where: {
            org_id_collector_id_waste_type_code: {
              org_id: ORG_ID,
              collector_id: collector.id,
              waste_type_code: wt.code,
            },
          },
          create: {
            org_id: ORG_ID,
            collector_id: collector.id,
            waste_type_code: wt.code,
            waste_type_name: wt.name,
            waste_category: wt.category,
            waste_classification: wt.classification,
            jwnet_waste_code_id: jwnetCode.id,
            jwnet_waste_code: jwnetCode.code,
            unit_code: wt.unit,
            unit_price: wt.unit_price,
            created_by: ADMIN_AUTH_USER_ID,
            updated_by: ADMIN_AUTH_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      )
    )

    log.success(`廃棄物マスターデータ作成完了: ${wasteTypes.length}件`)

    // ============================================================================
    // 8. 契約データ作成
    // ============================================================================
    log.section('📄 契約データ作成')

    // 組織間の契約を作成（排出事業者と収集業者）
    const contractData = [
      {
        contract_no: 'CONTRACT-2024-001',
        emitter_id: ORG_ID,
        transporter_id: collector.org_id,
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        status: 'active' as const,
      },
    ]

    const contracts = await prisma.$transaction(
      contractData.map((c) =>
        prisma.contracts.upsert({
          where: {
            contract_no: c.contract_no,
          },
          create: {
            org_id: ORG_ID,
            contract_no: c.contract_no,
            emitter_id: c.emitter_id,
            transporter_id: c.transporter_id,
            start_date: c.start_date,
            end_date: c.end_date,
            status: c.status,
            created_by: ADMIN_AUTH_USER_ID,
            updated_by: ADMIN_AUTH_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      )
    )

    log.success(`契約データ作成完了: ${contracts.length}件`)

    // ============================================================================
    // 9. 請求明細データ作成（実績から生成）
    // ============================================================================
    log.section('💰 請求明細データ作成')

    // 実績データから請求明細を生成（サンプルとして最新10件）
    const recentActuals = await prisma.actuals.findMany({
      where: { org_id: ORG_ID },
      orderBy: { confirmed_at: 'desc' },
      take: 10,
      include: {
        plans: {
          include: {
            stores: true,
          },
        },
      },
    })

    const billingItems = []
    for (const actual of recentActuals) {
      if (actual.plans) {
        const item = await prisma.app_billing_items.create({
          data: {
            org_id: ORG_ID,
            collector_id: collector.id,
            store_id: actual.plans.store_id,
            collection_id: null,
            billing_month: new Date(actual.confirmed_at.getFullYear(), actual.confirmed_at.getMonth(), 1),
            billing_period_from: actual.confirmed_at,
            billing_period_to: actual.confirmed_at,
            billing_type: 'standard',
            item_name: '廃棄物収集運搬',
            waste_type_id: wasteTypes[0].id,
            quantity: Number(actual.actual_qty),
            unit: actual.unit,
            unit_price: 100,
            amount: Number(actual.actual_qty) * 100,
            tax_rate: 0.1,
            tax_amount: Number(actual.actual_qty) * 100 * 0.1,
            total_amount: Number(actual.actual_qty) * 100 * 1.1,
            created_by: ADMIN_AUTH_USER_ID,
            updated_by: ADMIN_AUTH_USER_ID,
          },
        })
        billingItems.push(item)
      }
    }

    log.success(`請求明細データ作成完了: ${billingItems.length}件`)

    log.success('📊 2024年1月～12月の完全なテストデータが利用可能です！')
  } catch (error) {
    log.error(`エラー発生: ${error}`)
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


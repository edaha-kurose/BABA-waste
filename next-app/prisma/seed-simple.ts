// ============================================================================
// シンプル版Prismaシードスクリプト（既存テーブルのみ）
// 目的: 1年分のテストデータ作成（2024年1月～12月）
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

// ユーザーID（既存のadminユーザー）
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001'

// 色付きログ
const log = {
  section: (msg: string) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`),
  info: (msg: string) => console.log(`ℹ️  ${msg}`),
  success: (msg: string) => console.log(`✅ ${msg}`),
  warning: (msg: string) => console.log(`⚠️  ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
}

async function main() {
  log.section('🌱 シンプル版シード開始')

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
      await tx.waste_type_masters.updateMany({
        where: { org_id: ORG_ID, deleted_at: null },
        data: { deleted_at: now },
      })

      log.success('クリーンアップ完了')
    })

    // ============================================================================
    // 1. 廃棄物種別マスター（20種類）
    // ============================================================================
    log.section('📋 廃棄物種別マスター作成')

    const wasteTypes = await prisma.$transaction(
      [
        { code: '01', name: '燃え殻', hazard: false, price: 15000 },
        { code: '02', name: '汚泥', hazard: false, price: 18000 },
        { code: '03', name: '廃油', hazard: true, price: 25000 },
        { code: '04', name: '廃酸', hazard: true, price: 30000 },
        { code: '05', name: '廃アルカリ', hazard: true, price: 30000 },
        { code: '06', name: '廃プラスチック類', hazard: false, price: 20000 },
        { code: '07', name: '紙くず', hazard: false, price: 12000 },
        { code: '08', name: '木くず', hazard: false, price: 10000 },
        { code: '09', name: '繊維くず', hazard: false, price: 12000 },
        { code: '10', name: '動植物性残さ', hazard: false, price: 18000 },
        { code: '11', name: '動物系固形不要物', hazard: false, price: 20000 },
        { code: '12', name: 'ゴムくず', hazard: false, price: 15000 },
        { code: '13', name: '金属くず', hazard: false, price: 8000 },
        { code: '14', name: 'ガラス・コンクリート・陶磁器くず', hazard: false, price: 12000 },
        { code: '15', name: '鉱さい', hazard: false, price: 15000 },
        { code: '16', name: 'がれき類', hazard: false, price: 8000 },
        { code: '17', name: 'ばいじん', hazard: true, price: 25000 },
        { code: '18', name: '動物のふん尿', hazard: false, price: 18000 },
        { code: '19', name: '動物の死体', hazard: false, price: 25000 },
        { code: '20', name: '混合廃棄物', hazard: false, price: 18000 },
      ].map((w, idx) => {
        const id = uuidv4()
        return prisma.waste_type_masters.upsert({
          where: {
            id,
          },
          create: {
            id,
            org_id: ORG_ID,
            waste_type_code: w.code,
            waste_type_name: w.name,
            is_hazardous: w.hazard,
            unit_price: w.price,
            description: `${w.name}の標準単価: ${w.price}円/トン`,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      })
    )

    log.success(`廃棄物種別マスター作成完了: ${wasteTypes.length}件`)

    // ============================================================================
    // 2. 店舗データ（10店舗）
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

    log.success(`店舗データ作成完了: ${stores.length}件`)

    // ============================================================================
    // 3. 品目マップ（10種類）
    // ============================================================================
    log.section('📦 品目マップデータ作成')

    const itemMaps = await prisma.$transaction(
      [
        {
          label: '混合廃棄物',
          code: 'W20',
          hazard: false,
          unit: 'T' as const,
          disposal: 18000,
          transport: 10000,
        },
        {
          label: '廃プラスチック類',
          code: 'W06',
          hazard: false,
          unit: 'T' as const,
          disposal: 20000,
          transport: 12000,
        },
        {
          label: '蛍光灯（水銀含有）',
          code: 'W17',
          hazard: true,
          unit: 'KG' as const,
          disposal: 250,
          transport: 150,
        },
        {
          label: '木くず',
          code: 'W08',
          hazard: false,
          unit: 'M3' as const,
          disposal: 10000,
          transport: 8000,
        },
        {
          label: '金属くず',
          code: 'W13',
          hazard: false,
          unit: 'T' as const,
          disposal: 8000,
          transport: 6000,
        },
        {
          label: '紙くず',
          code: 'W07',
          hazard: false,
          unit: 'T' as const,
          disposal: 12000,
          transport: 8000,
        },
        {
          label: 'ガラスくず',
          code: 'W14',
          hazard: false,
          unit: 'T' as const,
          disposal: 12000,
          transport: 10000,
        },
        {
          label: '廃油',
          code: 'W03',
          hazard: true,
          unit: 'T' as const,
          disposal: 25000,
          transport: 15000,
        },
        {
          label: 'がれき類',
          code: 'W16',
          hazard: false,
          unit: 'T' as const,
          disposal: 8000,
          transport: 5000,
        },
        {
          label: '汚泥',
          code: 'W02',
          hazard: false,
          unit: 'T' as const,
          disposal: 18000,
          transport: 12000,
        },
      ].map((i, idx) => {
        const id = uuidv4()
        return prisma.item_maps.upsert({
          where: { id },
          create: {
            id,
            org_id: ORG_ID,
            item_label: i.label,
            jwnet_code: i.code,
            hazard: i.hazard,
            default_unit: i.unit,
            density_t_per_m3: i.unit === 'M3' ? 0.4 : i.unit === 'KG' ? 1.0 : 0.5,
            disposal_method_code: i.hazard ? 'D02' : 'D13',
            notes: `${i.label}（処分費:${i.disposal}円、運搬費:${i.transport}円/${i.unit}）`,
            created_by: ADMIN_USER_ID,
            updated_by: ADMIN_USER_ID,
          },
          update: {
            deleted_at: null,
            updated_at: new Date(),
          },
        })
      })
    )

    log.success(`品目マップデータ作成完了: ${itemMaps.length}件`)

    // ============================================================================
    // 4. 収集予定データ（12ヶ月×10店舗×2回/月 = 240件）
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

          const planId = uuidv4()

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
          await prisma.reservations.create({
            data: {
              id: uuidv4(),
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
                id: uuidv4(),
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
            const actualQty = quantity * (0.9 + Math.random() * 0.2)
            const drivers = ['田中太郎', '佐藤花子', '鈴木一郎', '高橋次郎', '伊藤美咲']

            await prisma.actuals.create({
              data: {
                id: uuidv4(),
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

    log.success(`収集予定データ作成完了: ${plansCount}件`)
    log.success(`予約データ作成完了: ${reservationsCount}件`)
    log.success(`登録データ作成完了: ${registrationsCount}件`)
    log.success(`実績データ作成完了: ${actualsCount}件`)

    // ============================================================================
    // 5. 請求サマリーデータ（月次集計）
    // ============================================================================
    log.section('💰 請求サマリーデータ作成')

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
      const transportCost = Math.round(totalQty * 10000)
      const disposalCost = Math.round(totalQty * 15000)
      const subtotal = transportCost + disposalCost
      const taxAmount = Math.round(subtotal * 0.1)
      const totalAmount = subtotal + taxAmount

      const summary = await prisma.billing_summaries.create({
        data: {
          id: uuidv4(),
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

      log.info(`${month}月: ${totalQty.toFixed(2)}トン, ${totalAmount.toLocaleString()}円`)
    }

    log.success(`請求サマリーデータ作成完了: ${billingSummaries.length}件`)

    // ============================================================================
    // 6. 最終検証
    // ============================================================================
    log.section('📊 最終検証')

    const finalCounts = {
      wasteTypes: await prisma.waste_type_masters.count({
        where: { org_id: ORG_ID, deleted_at: null },
      }),
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

    log.section('🎉 シンプル版テストデータ作成完了！')
    console.log('')
    console.log('【マスターデータ】')
    console.log(`  - 廃棄物種別マスター: ${finalCounts.wasteTypes}件`)
    console.log(`  - 店舗マスター: ${finalCounts.stores}件`)
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

    if (finalCounts.billingSummaries !== 12) {
      throw new Error(
        `Billing Summaries件数が12ヶ月分ではありません: ${finalCounts.billingSummaries}`
      )
    }

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


/**
 * E2Eテスト用ヒアリングデータ作成
 * グローバルルール準拠：Prisma経由、トランザクション使用、外部キー制約遵守
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.localを読み込み
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 E2Eテスト用データ作成開始...')

  // 既存のテストデータをクリーンアップ（トランザクション内、外部キー順序遵守）
  await prisma.$transaction(async (tx) => {
    // 子テーブルから順に削除（外部キー制約遵守）
    await tx.hearing_comments.deleteMany({ where: { hearing_targets: { hearings: { title: { contains: 'E2Eテスト' } } } } })
    await tx.hearing_responses.deleteMany({ where: { hearing_targets: { hearings: { title: { contains: 'E2Eテスト' } } } } })
    await tx.hearing_unlock_requests.deleteMany({ where: { hearing_targets: { hearings: { title: { contains: 'E2Eテスト' } } } } })
    await tx.hearing_targets.deleteMany({ where: { hearings: { title: { contains: 'E2Eテスト' } } } })
    await tx.hearing_reminders.deleteMany({ where: { hearings: { title: { contains: 'E2Eテスト' } } } })
    await tx.hearings.deleteMany({ where: { title: { contains: 'E2Eテスト' } } })
    
    // 外部店舗関連（テストデータのみ）
    await tx.hearing_external_store_items.deleteMany({ where: { hearing_external_stores: { company_name: { contains: 'テスト' } } } })
    await tx.hearing_external_stores.deleteMany({ where: { company_name: { contains: 'テスト' } } })
    
    // 店舗品目（全削除 - テストデータと既存データの区別が困難なため）
    await tx.store_items.deleteMany({})
    
    console.log('✅ 既存テストデータクリーンアップ完了')
  })

  // 組織・ユーザー・業者を取得（既存データ利用）
  const org = await prisma.organizations.findFirst()
  if (!org) {
    throw new Error('組織が見つかりません。まず基本データをseedしてください。')
  }

  const user = await prisma.app_users.findFirst()
  if (!user) {
    throw new Error('ユーザーが見つかりません。')
  }

  const collector = await prisma.collectors.findFirst()
  if (!collector) {
    throw new Error('業者が見つかりません。')
  }

  const store = await prisma.stores.findFirst({ where: { org_id: org.id } })
  if (!store) {
    throw new Error('店舗が見つかりません。')
  }

  // トランザクション内でテストデータ作成
  await prisma.$transaction(async (tx) => {
    // 1. ヒアリングキャンペーン作成
    const hearing = await tx.hearings.create({
      data: {
        org_id: org.id,
        title: 'E2Eテスト用ヒアリング_GW回収可否',
        description: 'GW期間中の回収可否を確認するテスト用ヒアリングです',
        target_period_from: new Date('2025-04-29'),
        target_period_to: new Date('2025-05-05'),
        response_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14日後
        status: 'ACTIVE',
        created_by: user.id,
      },
    })
    console.log(`✅ ヒアリング作成: ${hearing.id}`)

    // 2. 外部店舗作成（B社・C社）
    const externalStoreB = await tx.hearing_external_stores.create({
      data: {
        org_id: org.id,
        company_name: 'B社（テスト）',
        store_code: 'B001',
        store_name: 'B社本店',
        address: '東京都渋谷区',
        primary_collector_id: collector.id,
        created_by: user.id,
      },
    })

    const externalStoreC = await tx.hearing_external_stores.create({
      data: {
        org_id: org.id,
        company_name: 'C社（テスト）',
        store_code: 'C001',
        store_name: 'C社本店',
        address: '東京都新宿区',
        primary_collector_id: collector.id,
        created_by: user.id,
      },
    })
    console.log(`✅ 外部店舗作成: 2件`)

    // 3. A社店舗の品目作成
    const storeItem = await tx.store_items.create({
      data: {
        org_id: org.id,
        store_id: store.id,
        item_name: '可燃ゴミ',
        item_code: 'ITEM001',
        assigned_collector_id: collector.id,
        created_by: user.id,
      },
    })

    // 4. 外部店舗の品目作成
    const externalItemB = await tx.hearing_external_store_items.create({
      data: {
        org_id: org.id,
        external_store_id: externalStoreB.id,
        item_name: '段ボール',
        assigned_collector_id: collector.id,
        created_by: user.id,
      },
    })

    const externalItemC = await tx.hearing_external_store_items.create({
      data: {
        org_id: org.id,
        external_store_id: externalStoreC.id,
        item_name: '不燃物',
        assigned_collector_id: collector.id,
        created_by: user.id,
      },
    })
    console.log(`✅ 品目作成: 3件`)

    // 5. ヒアリング対象作成
    const target1 = await tx.hearing_targets.create({
      data: {
        hearing_id: hearing.id,
        collector_id: collector.id,
        store_id: store.id,
        store_item_id: storeItem.id,
        company_name: org.name || 'A社',
        store_name: store.name,
        item_name: storeItem.item_name,
        response_status: 'NOT_RESPONDED',
      },
    })

    const target2 = await tx.hearing_targets.create({
      data: {
        hearing_id: hearing.id,
        collector_id: collector.id,
        external_store_id: externalStoreB.id,
        external_store_item_id: externalItemB.id,
        company_name: 'B社（テスト）',
        store_name: 'B社本店',
        item_name: '段ボール',
        response_status: 'NOT_RESPONDED',
      },
    })

    const target3 = await tx.hearing_targets.create({
      data: {
        hearing_id: hearing.id,
        collector_id: collector.id,
        external_store_id: externalStoreC.id,
        external_store_item_id: externalItemC.id,
        company_name: 'C社（テスト）',
        store_name: 'C社本店',
        item_name: '不燃物',
        response_status: 'RESPONDED',
        responded_at: new Date(),
      },
    })
    console.log(`✅ ヒアリング対象作成: 3件`)

    // 6. 回答データ作成（target3のみ）
    const dates = ['2025-04-29', '2025-04-30', '2025-05-01', '2025-05-02', '2025-05-03']
    for (const dateStr of dates) {
      await tx.hearing_responses.create({
        data: {
          hearing_target_id: target3.id,
          target_date: new Date(dateStr),
          is_available: Math.random() > 0.5,
          responded_by: user.id,
        },
      })
    }
    console.log(`✅ 回答データ作成: ${dates.length}件`)

    // 7. コメント作成
    await tx.hearing_comments.create({
      data: {
        hearing_target_id: target3.id,
        comment: 'GW期間中の回収可能日を確認しました。',
        user_id: user.id,
        user_role: 'SYSTEM_ADMIN',
        user_name: 'テスト管理者',
      },
    })
    console.log(`✅ コメント作成: 1件`)
  })

  console.log('🎉 E2Eテスト用データ作成完了！')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


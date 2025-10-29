/**
 * 収集業者200社 + 店舗紐づけ シードデータ
 * 
 * グローバルルール準拠:
 * - Prisma経由でのデータ操作
 * - トランザクション使用
 * - 外部キー制約遵守
 * - データ整合性保持
 */

import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// 環境変数読み込み
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

// 収集業者名のプレフィックス
const COMPANY_PREFIXES = [
  '株式会社', '有限会社', '合同会社', '一般社団法人', '公益社団法人',
]

const COMPANY_NAMES = [
  'エコサービス', 'グリーンテック', 'クリーンシステム', 'リサイクルセンター',
  'エコロジー', '環境サービス', 'クリーンワークス', 'グリーンライフ',
  'エコプラント', 'リサイクルワークス', 'クリーンエコ', 'グリーンエコ',
  'エコシステムズ', '環境テクノロジー', 'クリーンソリューション', 'リサイクルプラス',
  'エコマスター', '環境クリエイト', 'グリーンマスター', 'クリーンマスター',
]

const REGIONS = [
  '東京', '神奈川', '埼玉', '千葉', '大阪', '兵庫', '京都', '愛知',
  '福岡', '北海道', '宮城', '広島', '静岡', '新潟', '長野', '岐阜',
]

/**
 * ランダムに配列から要素を選択
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * ランダムな電話番号を生成
 */
function generatePhone(): string {
  const areaCode = ['03', '06', '052', '092', '011'][Math.floor(Math.random() * 5)]
  const middle = Math.floor(1000 + Math.random() * 9000)
  const last = Math.floor(1000 + Math.random() * 9000)
  return `${areaCode}-${middle}-${last}`
}

/**
 * ランダムなメールアドレスを生成
 */
function generateEmail(companyName: string, index: number): string {
  const domain = companyName.replace(/[株式会社|有限会社|合同会社|一般社団法人|公益社団法人]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
  return `info${index}@${domain}.co.jp`
}

/**
 * 収集業者200社のシードデータを生成
 */
async function seedCollectors() {
  console.log('🚛 収集業者シードデータ作成開始\n')

  try {
    // メイン組織を取得
    const mainOrg = await prisma.organizations.findFirst({
      where: { deleted_at: null },
      orderBy: { created_at: 'asc' },
    })

    if (!mainOrg) {
      throw new Error('組織が見つかりません。先に組織を作成してください。')
    }

    console.log(`📌 組織: ${mainOrg.name} (${mainOrg.id})\n`)

    // 既存の収集業者数を確認
    const existingCount = await prisma.collectors.count({
      where: { org_id: mainOrg.id, deleted_at: null },
    })

    console.log(`📊 既存の収集業者数: ${existingCount}`)

    const targetCount = 200
    const toCreate = targetCount - existingCount

    if (toCreate <= 0) {
      console.log('✅ すでに200社以上登録されています')
      return
    }

    console.log(`📝 ${toCreate}社を追加登録します\n`)

    // トランザクションで200社を一括作成（グローバルルール準拠）
    const collectors = await prisma.$transaction(async (tx) => {
      const createdCollectors = []

      for (let i = existingCount; i < targetCount; i++) {
        const prefix = randomChoice(COMPANY_PREFIXES)
        const name = randomChoice(COMPANY_NAMES)
        const region = randomChoice(REGIONS)
        const fullName = `${prefix}${region}${name}`

        const collector = await tx.collectors.create({
          data: {
            org_id: mainOrg.id,
            company_name: fullName,
            phone: generatePhone(),
            email: generateEmail(fullName, i + 1),
            contact_person: `担当者${i + 1}`,
            address: `${region}都道府県○○市○○町1-2-3`,
            notes: `自動生成された収集業者データ (ID: ${i + 1})`,
            is_active: true,
          },
        })

        createdCollectors.push(collector)

        if ((i + 1) % 20 === 0) {
          console.log(`  ✅ ${i + 1}/${targetCount}社 登録完了`)
        }
      }

      return createdCollectors
    })

    console.log(`\n✅ 収集業者${collectors.length}社の登録完了\n`)

    // 店舗一覧を取得
    console.log('🏪 店舗データ取得中...')
    const stores = await prisma.stores.findMany({
      where: {
        org_id: mainOrg.id,
        deleted_at: null,
      },
      select: { id: true, name: true, store_code: true },
    })

    console.log(`📊 店舗数: ${stores.length}\n`)

    if (stores.length === 0) {
      console.log('⚠️ 店舗データがありません。店舗への紐づけはスキップします。')
      return
    }

    // 全収集業者を取得
    const allCollectors = await prisma.collectors.findMany({
      where: {
        org_id: mainOrg.id,
        deleted_at: null,
      },
      select: { id: true, company_name: true },
    })

    console.log(`🚛 全収集業者数: ${allCollectors.length}\n`)

    // 店舗ごとに2〜5社の収集業者をランダムに割り当て
    console.log('🔗 店舗-業者紐づけ開始...')

    let assignmentCount = 0
    const batchSize = 100 // バッチサイズ

    for (let i = 0; i < stores.length; i += batchSize) {
      const storeBatch = stores.slice(i, i + batchSize)

      await prisma.$transaction(async (tx) => {
        for (const store of storeBatch) {
          // ランダムに2〜5社を選択
          const assignmentCountForStore = 2 + Math.floor(Math.random() * 4)
          const shuffled = [...allCollectors].sort(() => Math.random() - 0.5)
          const selectedCollectors = shuffled.slice(0, assignmentCountForStore)

          for (let priority = 0; priority < selectedCollectors.length; priority++) {
            const collector = selectedCollectors[priority]

            // 既存の割り当てをチェック
            const existing = await tx.store_collector_assignments.findFirst({
              where: {
                store_id: store.id,
                collector_id: collector.id,
              },
            })

            if (!existing) {
              await tx.store_collector_assignments.create({
                data: {
                  store_id: store.id,
                  collector_id: collector.id,
                  priority: priority + 1,
                  is_active: true,
                },
              })
              assignmentCount++
            }
          }
        }
      })

      console.log(`  ✅ ${Math.min(i + batchSize, stores.length)}/${stores.length}店舗 紐づけ完了`)
    }

    console.log(`\n✅ 店舗-業者紐づけ${assignmentCount}件の登録完了`)
  } catch (error) {
    console.error('\n❌ エラー発生:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 実行
seedCollectors()
  .then(() => {
    console.log('\n✅ シードデータ作成完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ シードデータ作成失敗:', error)
    process.exit(1)
  })





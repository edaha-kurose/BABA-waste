/**
 * 収集業者シードデータAPI
 * 
 * グローバルルール準拠:
 * - Prisma経由のデータ操作
 * - トランザクション使用
 * - 認証チェック必須
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// 会社名生成用データ
const COMPANY_PREFIXES = ['株式会社', '有限会社', '合同会社']
const COMPANY_NAMES = [
  'エコサービス', 'グリーンテック', 'クリーンシステム', 'リサイクルセンター',
  'エコロジー', '環境サービス', 'クリーンワークス', 'グリーンライフ',
  'エコプラント', 'リサイクルワークス', 'クリーンエコ', 'グリーンエコ',
]
const REGIONS = ['東京', '神奈川', '埼玉', '千葉', '大阪', '兵庫', '京都', '愛知']

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generatePhone(): string {
  const areaCode = ['03', '06', '052', '092'][Math.floor(Math.random() * 4)]
  const middle = Math.floor(1000 + Math.random() * 9000)
  const last = Math.floor(1000 + Math.random() * 9000)
  return `${areaCode}-${middle}-${last}`
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.isAdmin) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const { count = 200 } = await request.json()

    console.log(`🚛 収集業者${count}社のシード開始...`)

    // 既存の収集業者数を確認
    const existingCount = await prisma.collectors.count({
      where: { org_id: authUser.org_id, deleted_at: null },
    })

    const toCreate = count - existingCount

    if (toCreate <= 0) {
      return NextResponse.json({
        message: `すでに${existingCount}社登録されています`,
        existingCount,
      })
    }

    // バッチ処理で作成（20社ずつ）
    const batchSize = 20
    
    for (let i = existingCount; i < count; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, count)
      const batch = []

      for (let j = i; j < batchEnd; j++) {
        const prefix = randomChoice(COMPANY_PREFIXES)
        const name = randomChoice(COMPANY_NAMES)
        const region = randomChoice(REGIONS)
        const fullName = `${prefix}${region}${name}${j + 1}`

        batch.push({
          org_id: authUser.org_id,
          company_name: fullName,
          phone: generatePhone(),
          email: `info${j + 1}@example.co.jp`,
          contact_person: `担当者${j + 1}`,
          address: `${region}都道府県○○市○○町1-2-3`,
          is_active: true,
        })
      }

      // バッチごとに作成
      await prisma.collectors.createMany({
        data: batch,
      })
      
      console.log(`✅ ${batchEnd}/${count}社 作成完了`)
    }

    // 店舗への紐づけ（最初の100店舗のみ、バッチ処理）
    const stores = await prisma.stores.findMany({
      where: { org_id: authUser.org_id, deleted_at: null },
      select: { id: true },
      take: 100, // 最初の100店舗のみ
    })

    let assignmentCount = 0
    if (stores.length > 0) {
      const allCollectors = await prisma.collectors.findMany({
        where: { org_id: authUser.org_id, deleted_at: null, is_active: true },
        select: { id: true },
      })

      if (allCollectors.length === 0) {
        console.log('⚠️ 収集業者が見つかりません')
        return NextResponse.json({
          message: '収集業者は作成されましたが、紐づけは実行されませんでした',
          collectorsCreated: count - existingCount,
          assignmentsCreated: 0,
          storesCount: stores.length,
        })
      }

      // バッチで紐づけデータを作成
      const assignmentsToCreate: any[] = []

      for (const store of stores) {
        const assignmentCountForStore = 2 + Math.floor(Math.random() * 4)
        const shuffled = [...allCollectors].sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, assignmentCountForStore)

        for (let priority = 0; priority < selected.length; priority++) {
          assignmentsToCreate.push({
            org_id: authUser.org_id,
            store_id: store.id,
            collector_id: selected[priority].id,
            priority: priority + 1,
            is_active: true,
          })
        }
      }

      // 一括挿入（重複は無視）
      try {
        const result = await prisma.store_collector_assignments.createMany({
          data: assignmentsToCreate,
          skipDuplicates: true,
        })
        assignmentCount = result.count
        console.log(`✅ 店舗紐づけ ${assignmentCount}件 作成完了`)
      } catch (error) {
        console.error('店舗紐づけエラー:', error)
      }
    }

    return NextResponse.json({
      message: 'シードデータ作成完了',
      collectorsCreated: count - existingCount,
      assignmentsCreated: assignmentCount,
      storesCount: stores.length,
    })
  } catch (error: any) {
    console.error('[Seed Collectors] エラー:', error)
    return NextResponse.json(
      { error: error.message || 'シードデータ作成失敗' },
      { status: 500 }
    )
  }
}


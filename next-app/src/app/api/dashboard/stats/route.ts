/**
 * ダッシュボード統計API
 * 
 * 集計内容:
 * - 今月の請求金額合計
 * - 管理店舗数
 * - 回収予定件数
 * - 完了した回収件数
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// レスポンススキーマ
const DashboardStatsSchema = z.object({
  totalBillingAmount: z.number().describe('今月の請求金額合計（税込）'),
  managedStoresCount: z.number().int().describe('管理店舗数'),
  pendingCollectionsCount: z.number().int().describe('回収予定件数'),
  completedCollectionsCount: z.number().int().describe('完了した回収件数'),
  currentMonth: z.string().describe('集計対象月 (YYYY-MM)'),
  // 初期設定チェック用
  collectorsCount: z.number().int().describe('収集業者数'),
  itemMapsCount: z.number().int().describe('廃棄品目数'),
  matrixCount: z.number().int().describe('店舗×品目×業者マトリクス登録数'),
  billingItemsCount: z.number().int().describe('請求単価設定数'),
  jwnetConfigured: z.boolean().describe('JWNET設定済みフラグ'),
})

export type DashboardStats = z.infer<typeof DashboardStatsSchema>

/**
 * GET /api/dashboard/stats
 * ダッシュボードの統計情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Dashboard Stats API] リクエスト受信')
    
    // 認証チェック（E2Eバイパス対応）
    const authUser = await getAuthenticatedUser(request)
    
    if (!authUser) {
      console.error('[Dashboard Stats API] 認証失敗: ユーザーが見つかりません')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'ログインが必要です' },
        { status: 401 }
      )
    }

    console.log('[Dashboard Stats API] ユーザー認証OK:', authUser.email)

    // 今月の開始日・終了日を取得
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    console.log('[Dashboard Stats API] 集計期間:', {
      currentMonth: currentMonth.toISOString().split('T')[0],
      nextMonth: nextMonth.toISOString().split('T')[0],
    })

    // 1. 今月の請求金額合計（BillingSummaryから）
    const billingAggregation = await prisma.billing_summaries.aggregate({
      _sum: {
        total_amount: true,
      },
      where: {
        billing_month: {
          gte: currentMonth,
          lt: nextMonth,
        },
      },
    })

    const totalBillingAmount = billingAggregation._sum.total_amount ?? 0

    console.log('[Dashboard Stats API] 請求金額合計:', totalBillingAmount)

    // 2. 管理店舗数（全店舗）
    const managedStoresCount = await prisma.stores.count()

    console.log('[Dashboard Stats API] 管理店舗数:', managedStoresCount)

    // 3. 回収予定件数（CollectionRequest status = PENDING）
    const pendingCollectionsCount = await prisma.collection_requests.count({
      where: {
        status: 'PENDING',
      },
    })

    console.log('[Dashboard Stats API] 回収予定件数:', pendingCollectionsCount)

    // 4. 完了した回収件数（全Collection）
    const completedCollectionsCount = await prisma.collections.count()

    console.log('[Dashboard Stats API] 完了回収件数:', completedCollectionsCount)

    // 5. 収集業者数（初期設定チェック用）
    const collectorsCount = await prisma.collectors.count({
      where: {
        deleted_at: null,
      },
    })

    console.log('[Dashboard Stats API] 収集業者数:', collectorsCount)

    // 6. 廃棄品目数（初期設定チェック用）
    const itemMapsCount = await prisma.item_maps.count({
      where: {
        deleted_at: null,
      },
    })

    console.log('[Dashboard Stats API] 廃棄品目数:', itemMapsCount)

    // 7. 店舗×品目×業者マトリクス登録数（初期設定チェック用）
    const matrixCount = await prisma.store_item_collectors.count({
      where: {
        deleted_at: null,
      },
    })

    console.log('[Dashboard Stats API] マトリクス登録数:', matrixCount)

    // 8. 請求単価設定数（初期設定チェック用）
    const billingItemsCount = await prisma.public_billing_items.count({
      where: {
        deleted_at: null,
      },
    })

    console.log('[Dashboard Stats API] 請求単価設定数:', billingItemsCount)

    // 9. JWNET設定済みチェック（初期設定チェック用）
    const jwnetConfiguredOrgs = await prisma.organizations.count({
      where: {
        AND: [
          { jwnet_subscriber_id: { not: null } },
          { jwnet_subscriber_id: { not: '' } },
          { deleted_at: null },
        ],
      },
    })

    const jwnetConfigured = jwnetConfiguredOrgs > 0

    console.log('[Dashboard Stats API] JWNET設定済み:', jwnetConfigured)

    // レスポンスデータの構築とバリデーション
    const stats: DashboardStats = {
      totalBillingAmount,
      managedStoresCount,
      pendingCollectionsCount,
      completedCollectionsCount,
      currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      collectorsCount,
      itemMapsCount,
      matrixCount,
      billingItemsCount,
      jwnetConfigured,
    }

    // Zodバリデーション
    const validatedStats = DashboardStatsSchema.parse(stats)

    console.log('[Dashboard Stats API] 統計データ取得成功:', validatedStats)

    return NextResponse.json(validatedStats)
  } catch (error) {
    console.error('[Dashboard Stats API] エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'データの検証に失敗しました',
          details: error.errors,
        },
        { status: 500 }
      )
    }

    // 開発環境では詳細なエラーを返す
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1')
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'サーバーエラーが発生しました',
        details: isLocal ? (error instanceof Error ? error.message : String(error)) : undefined,
        stack: isLocal ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    )
  }
}



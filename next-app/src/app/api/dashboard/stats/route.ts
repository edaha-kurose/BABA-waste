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
import prisma from '@/lib/prisma'
import { createServerClient } from '@/lib/auth/supabase-server'

// レスポンススキーマ
const DashboardStatsSchema = z.object({
  totalBillingAmount: z.number().describe('今月の請求金額合計（税込）'),
  managedStoresCount: z.number().int().describe('管理店舗数'),
  pendingCollectionsCount: z.number().int().describe('回収予定件数'),
  completedCollectionsCount: z.number().int().describe('完了した回収件数'),
  currentMonth: z.string().describe('集計対象月 (YYYY-MM)'),
})

export type DashboardStats = z.infer<typeof DashboardStatsSchema>

/**
 * GET /api/dashboard/stats
 * ダッシュボードの統計情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    // ローカル環境では認証チェックをスキップ
    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1')
    
    if (!isLocal) {
      // 認証チェック（本番環境のみ）
      const supabase = await createServerClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'ログインが必要です' },
          { status: 401 }
        )
      }

      console.log('[Dashboard Stats API] ユーザー認証OK:', user.email)
    } else {
      console.log('[Dashboard Stats API] ローカル環境 - 認証スキップ')
    }

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

    // レスポンスデータの構築とバリデーション
    const stats: DashboardStats = {
      totalBillingAmount,
      managedStoresCount,
      pendingCollectionsCount,
      completedCollectionsCount,
      currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
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



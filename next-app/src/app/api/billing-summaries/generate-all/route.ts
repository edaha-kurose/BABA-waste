/**
 * 全収集業者の請求を一括生成 API
 * 
 * POST /api/billing-summaries/generate-all
 * 
 * 機能:
 * - 指定月の全収集業者の請求明細（billing_items）を集計
 * - 手数料ルール（commission_rules）を適用
 * - 請求サマリー（billing_summaries）を自動生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

// バリデーションスキーマ
const generateAllSchema = z.object({
  billing_month: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for billing_month (YYYY-MM-01)',
  }),
  tax_rate: z.number().min(0).max(1).default(0.10),
  force_regenerate: z.boolean().default(false), // 既存サマリーを上書きするか
})

export async function POST(request: NextRequest) {
  console.log('[Generate All Billing Summaries] ========== API開始 ==========')
  
  try {
    // 1. 認証チェック
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      console.log('[Generate All] ❌ 認証失敗')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[Generate All] ✅ 認証成功:', authUser.email)

    // 2. JSONパースエラーハンドリング
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[Generate All] JSONパースエラー:', parseError)
      return NextResponse.json(
        { error: '不正なJSONフォーマットです' },
        { status: 400 }
      )
    }

    // 3. Zodバリデーション
    let validatedData
    try {
      validatedData = generateAllSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[Generate All] バリデーションエラー:', error.errors)
        return NextResponse.json(
          { error: 'バリデーションエラー', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    const billingMonth = new Date(validatedData.billing_month)
    console.log('[Generate All] 請求月:', billingMonth.toISOString().split('T')[0])

    // 4. 対象組織の全収集業者を取得
    let collectors
    try {
      collectors = await prisma.collectors.findMany({
        where: {
          org_id: authUser.org_id,
          deleted_at: null,
          is_active: true,
        },
        select: {
          id: true,
          company_name: true,
        },
      })
    } catch (dbError) {
      console.error('[Generate All] Prisma収集業者取得エラー:', dbError)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    if (collectors.length === 0) {
      return NextResponse.json(
        {
          message: '収集業者が登録されていません',
          generated_count: 0,
          collectors_processed: 0,
        },
        { status: 200 }
      )
    }

    console.log('[Generate All] 対象収集業者数:', collectors.length)

    // 5. トランザクション内で一括生成
    let results
    try {
      results = await prisma.$transaction(async (tx) => {
        const generatedSummaries = []
        const skippedCollectors = []
        const errors = []

        for (const collector of collectors) {
          try {
            // 5-1. 既存サマリーチェック
            const existingSummary = await tx.billing_summaries.findFirst({
              where: {
                org_id: authUser.org_id,
                collector_id: collector.id,
                billing_month: billingMonth,
              },
            })

            if (existingSummary && !validatedData.force_regenerate) {
              console.log(`[Generate All] スキップ: ${collector.company_name} (既存サマリーあり)`)
              skippedCollectors.push({
                collector_id: collector.id,
                collector_name: collector.company_name,
                reason: '既存サマリーが存在します',
              })
              continue
            }

            // 5-2. 請求明細を集計（承認済みのみ）
            const billingItems = await tx.app_billing_items.findMany({
              where: {
                org_id: authUser.org_id,
                collector_id: collector.id,
                billing_month: billingMonth,
                status: 'APPROVED',
                deleted_at: null,
              },
            })

            if (billingItems.length === 0) {
              console.log(`[Generate All] スキップ: ${collector.company_name} (承認済み明細なし)`)
              skippedCollectors.push({
                collector_id: collector.id,
                collector_name: collector.company_name,
                reason: '承認済みの請求明細がありません',
              })
              continue
            }

            // 5-3. 請求種別ごとに集計
            let total_fixed_amount = 0
            let total_metered_amount = 0
            let total_other_amount = 0
            let fixed_items_count = 0
            let metered_items_count = 0
            let other_items_count = 0

            billingItems.forEach((item) => {
              const amount = item.amount || 0
              switch (item.billing_type) {
                case 'FIXED':
                  total_fixed_amount += amount
                  fixed_items_count++
                  break
                case 'METERED':
                  total_metered_amount += amount
                  metered_items_count++
                  break
                case 'OTHER':
                  total_other_amount += amount
                  other_items_count++
                  break
              }
            })

            const subtotal_amount = total_fixed_amount + total_metered_amount + total_other_amount
            const tax_amount = subtotal_amount * validatedData.tax_rate
            const total_amount = subtotal_amount + tax_amount

            // 5-4. 手数料ルール取得（オプション）
            const commissionRule = await tx.commission_rules.findFirst({
              where: {
                org_id: authUser.org_id,
                collector_id: collector.id,
                is_active: true,
                OR: [
                  {
                    effective_from: { lte: billingMonth },
                    effective_to: { gte: billingMonth },
                  },
                  {
                    effective_from: { lte: billingMonth },
                    effective_to: null,
                  },
                ],
              },
              orderBy: {
                created_at: 'desc',
              },
            })

            let commission_note = ''
            if (commissionRule) {
              const commissionValue = commissionRule.commission_value.toNumber()
              if (commissionRule.commission_type === 'PERCENTAGE') {
                commission_note = `手数料: ${commissionValue}%`
              } else if (commissionRule.commission_type === 'FIXED_AMOUNT') {
                commission_note = `手数料: ¥${commissionValue.toLocaleString()}`
              }
            }

            // 5-5. サマリー作成または更新
            let summary
            if (existingSummary && validatedData.force_regenerate) {
              summary = await tx.billing_summaries.update({
                where: { id: existingSummary.id },
                data: {
                  total_fixed_amount,
                  total_metered_amount,
                  total_other_amount,
                  subtotal_amount,
                  tax_amount,
                  total_amount,
                  total_items_count: billingItems.length,
                  fixed_items_count,
                  metered_items_count,
                  other_items_count,
                  status: 'DRAFT',
                  notes: commission_note || null,
                  updated_by: authUser.id,
                  updated_at: new Date(),
                },
              })
              console.log(`[Generate All] 更新: ${collector.company_name} (¥${total_amount.toLocaleString()})`)
            } else {
              summary = await tx.billing_summaries.create({
                data: {
                  org_id: authUser.org_id,
                  collector_id: collector.id,
                  billing_month: billingMonth,
                  total_fixed_amount,
                  total_metered_amount,
                  total_other_amount,
                  subtotal_amount,
                  tax_amount,
                  total_amount,
                  total_items_count: billingItems.length,
                  fixed_items_count,
                  metered_items_count,
                  other_items_count,
                  status: 'DRAFT',
                  notes: commission_note || null,
                  created_by: authUser.id,
                  updated_by: authUser.id,
                },
              })
              console.log(`[Generate All] 作成: ${collector.company_name} (¥${total_amount.toLocaleString()})`)
            }

            generatedSummaries.push({
              collector_id: collector.id,
              collector_name: collector.company_name,
              summary_id: summary.id,
              total_amount: summary.total_amount,
              items_count: summary.total_items_count,
            })
          } catch (collectorError) {
            console.error(`[Generate All] エラー: ${collector.company_name}`, collectorError)
            errors.push({
              collector_id: collector.id,
              collector_name: collector.company_name,
              error: collectorError instanceof Error ? collectorError.message : 'Unknown error',
            })
          }
        }

        return {
          generated: generatedSummaries,
          skipped: skippedCollectors,
          errors,
        }
      })
    } catch (dbError) {
      console.error('[Generate All] Prismaトランザクションエラー:', dbError)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    console.log('[Generate All] ========== 完了 ==========')
    console.log('[Generate All] 生成:', results.generated.length)
    console.log('[Generate All] スキップ:', results.skipped.length)
    console.log('[Generate All] エラー:', results.errors.length)

    return NextResponse.json(
      {
        message: '請求サマリーを一括生成しました',
        generated_count: results.generated.length,
        skipped_count: results.skipped.length,
        error_count: results.errors.length,
        collectors_processed: collectors.length,
        generated: results.generated,
        skipped: results.skipped,
        errors: results.errors,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Generate All] エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


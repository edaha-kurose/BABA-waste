import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { calculateTax } from '@/lib/billing/tax-calculator'

// リクエストスキーマ
const GenerateSummarySchema = z.object({
  org_id: z.string().uuid(),
  collector_id: z.string().uuid(),
  billing_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/**
 * POST /api/billing-summaries/generate
 * 請求サマリーを自動生成
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    // リクエストボディ検証
    const validated = GenerateSummarySchema.parse(body)

    // 請求設定取得（端数処理方式）
    let billingSettings
    try {
      billingSettings = await prisma.billing_settings.findUnique({
        where: { org_id: validated.org_id },
      });
    } catch (dbError) {
      console.error('[POST /api/billing-summaries/generate] Prisma設定取得エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }
    const taxRoundingMode = billingSettings?.tax_rounding_mode || 'FLOOR'

    // 該当月の承認済み請求明細を取得
    let billingItems
    try {
      billingItems = await prisma.app_billing_items.findMany({
        where: {
          org_id: validated.org_id,
          collector_id: validated.collector_id,
          billing_month: new Date(validated.billing_month),
          status: 'APPROVED',
          deleted_at: null,
        },
      });
    } catch (dbError) {
      console.error('[POST /api/billing-summaries/generate] Prisma明細取得エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (billingItems.length === 0) {
      return NextResponse.json(
        { error: '承認済みの請求明細がありません' },
        { status: 400 }
      )
    }

    // 集計処理
    let totalFixedAmount = 0
    let totalMeteredAmount = 0
    let totalOtherAmount = 0
    let fixedItemsCount = 0
    let meteredItemsCount = 0
    let otherItemsCount = 0

    for (const item of billingItems) {
      if (item.billing_type === '固定') {
        totalFixedAmount += item.amount
        fixedItemsCount++
      } else if (item.billing_type === '従量') {
        totalMeteredAmount += item.amount
        meteredItemsCount++
      } else {
        totalOtherAmount += item.amount
        otherItemsCount++
      }
    }

    const subtotalAmount = totalFixedAmount + totalMeteredAmount + totalOtherAmount
    const taxAmount = calculateTax(subtotalAmount, 0.1, taxRoundingMode)
    const totalAmount = subtotalAmount + taxAmount

    // トランザクションでUPSERT
    let summary
    try {
      summary = await prisma.$transaction(async (tx) => {
        // 既存サマリーを確認
        const existing = await tx.billing_summaries.findFirst({
          where: {
            org_id: validated.org_id,
            collector_id: validated.collector_id,
            billing_month: new Date(validated.billing_month),
          },
        })

        if (existing) {
          // 更新
          return await tx.billing_summaries.update({
            where: { id: existing.id },
            data: {
              total_fixed_amount: totalFixedAmount,
              total_metered_amount: totalMeteredAmount,
              total_other_amount: totalOtherAmount,
              subtotal_amount: subtotalAmount,
              tax_amount: taxAmount,
              total_amount: totalAmount,
              total_items_count: billingItems.length,
              fixed_items_count: fixedItemsCount,
              metered_items_count: meteredItemsCount,
              other_items_count: otherItemsCount,
              updated_at: new Date(),
            },
          })
        } else {
          // 新規作成
          return await tx.billing_summaries.create({
            data: {
              org_id: validated.org_id,
              collector_id: validated.collector_id,
              billing_month: new Date(validated.billing_month),
              total_fixed_amount: totalFixedAmount,
              total_metered_amount: totalMeteredAmount,
              total_other_amount: totalOtherAmount,
              subtotal_amount: subtotalAmount,
              tax_amount: taxAmount,
              total_amount: totalAmount,
              total_items_count: billingItems.length,
              fixed_items_count: fixedItemsCount,
              metered_items_count: meteredItemsCount,
              other_items_count: otherItemsCount,
              status: 'DRAFT',
            },
          })
        }
      });
    } catch (dbError) {
      console.error('[POST /api/billing-summaries/generate] Prismaトランザクションエラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary,
      message: 'サマリーを生成しました',
    })
  } catch (error) {
    console.error('[API Error] billing-summaries/generate:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'サマリー生成に失敗しました' },
      { status: 500 }
    )
  }
}

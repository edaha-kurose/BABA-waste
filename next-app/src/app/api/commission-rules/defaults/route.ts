/**
 * GET /api/commission-rules/defaults
 * 請求明細に適用する手数料デフォルト値を取得するAPI
 * グローバルルール準拠
 * 
 * 手数料計算ルール:
 * - パーセンテージ型: Math.floor(金額 * 率 / 100) で切り捨て
 * - 固定金額型: そのまま適用
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// クエリパラメータのバリデーションスキーマ
const QuerySchema = z.object({
  org_id: z.string().uuid(),
  collector_id: z.string().uuid(),
  billing_month: z.string(), // YYYY-MM
})

export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. クエリパラメータ取得とバリデーション
  const { searchParams } = new URL(request.url)
  const params = {
    org_id: searchParams.get('org_id'),
    collector_id: searchParams.get('collector_id'),
    billing_month: searchParams.get('billing_month'),
  }

  let validated
  try {
    validated = QuerySchema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // 3. 認可チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(validated.org_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Prismaエラー分離
  try {
    // 請求月をDateに変換
    const billingMonth = new Date(`${validated.billing_month}-01`)

    // 該当する手数料ルールを取得（優先順位: 業者固有 > 全体）
    const rules = await prisma.commission_rules.findMany({
      where: {
        org_id: validated.org_id,
        is_active: true,
        deleted_at: null,
        AND: [
          {
            OR: [
              { collector_id: validated.collector_id },
              { collector_id: null },
            ],
          },
          {
            OR: [
              { effective_from: null },
              { effective_from: { lte: billingMonth } },
            ],
          },
          {
            OR: [
              { effective_to: null },
              { effective_to: { gte: billingMonth } },
            ],
          },
        ],
      },
      orderBy: [
        { collector_id: 'desc' }, // 業者固有ルールを優先（nullは後）
        { created_at: 'desc' },
      ],
    })

    if (rules.length === 0) {
      return NextResponse.json({
        success: true,
        has_default: false,
        message: 'No commission rules found',
      })
    }

    // 請求タイプ別のデフォルト値を構築
    const defaults: Record<string, any> = {}

    // FIXED, METERED, OTHER, ALL の順で処理
    const billingTypes = ['FIXED', 'METERED', 'OTHER', 'ALL']

    for (const billingType of billingTypes) {
      const rule = rules.find(
        (r) => r.billing_type === billingType || r.billing_type === 'ALL'
      )

      if (rule) {
        defaults[billingType] = {
          commission_type: rule.commission_type,
          commission_rate:
            rule.commission_type === 'PERCENTAGE' ? rule.commission_value : null,
          commission_amount:
            rule.commission_type === 'FIXED_AMOUNT' ? rule.commission_value : null,
          rule_id: rule.id,
        }
      }
    }

    // ALL ルールがある場合は、未設定の請求タイプに適用
    const allRule = rules.find((r) => r.billing_type === 'ALL')
    if (allRule) {
      for (const billingType of ['FIXED', 'METERED', 'OTHER']) {
        if (!defaults[billingType]) {
          defaults[billingType] = {
            commission_type: allRule.commission_type,
            commission_rate:
              allRule.commission_type === 'PERCENTAGE' ? allRule.commission_value : null,
            commission_amount:
              allRule.commission_type === 'FIXED_AMOUNT' ? allRule.commission_value : null,
            rule_id: allRule.id,
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      has_default: Object.keys(defaults).length > 0,
      defaults,
    })
  } catch (dbError) {
    console.error('[Commission Defaults API] Database error:', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}


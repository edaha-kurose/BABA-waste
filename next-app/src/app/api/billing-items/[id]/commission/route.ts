/**
 * PATCH /api/billing-items/[id]/commission
 * 請求明細の手数料を個別に更新するAPI
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// リクエストボディのバリデーションスキーマ
const UpdateCommissionSchema = z.object({
  commission_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'MANUAL']),
  commission_rate: z.number().min(0).max(100).nullable().optional(),
  commission_amount: z.number().min(0).nullable().optional(),
  commission_note: z.string().max(500).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. JSONパースエラーハンドリング
  let body
  try {
    body = await request.json()
  } catch (parseError) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 3. Zodバリデーション
  let validated
  try {
    validated = UpdateCommissionSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // 4. 明細の存在確認と認可チェック
  let item
  try {
    item = await prisma.app_billing_items.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        org_id: true,
        amount: true,
        status: true,
      },
    })
  } catch (dbError) {
    console.error('[Update Commission API] Database error (findUnique):', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }

  if (!item) {
    return NextResponse.json({ error: 'Billing item not found' }, { status: 404 })
  }

  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(item.org_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 5. ステータスチェック（承認済み・確定済みは編集不可）
  if (['APPROVED', 'FINALIZED'].includes(item.status)) {
    return NextResponse.json(
      { error: 'Cannot edit approved or finalized items' },
      { status: 400 }
    )
  }

  // 6. 手数料計算
  let commissionAmount = validated.commission_amount ?? 0
  let commissionRate = validated.commission_rate ?? null

  if (validated.commission_type === 'PERCENTAGE') {
    if (!validated.commission_rate) {
      return NextResponse.json(
        { error: 'commission_rate is required for PERCENTAGE type' },
        { status: 400 }
      )
    }
    commissionRate = validated.commission_rate
    // 手数料は切り捨て（消費税と同様）
    commissionAmount = Math.floor(item.amount * (validated.commission_rate / 100))
  } else if (validated.commission_type === 'FIXED_AMOUNT') {
    if (validated.commission_amount === undefined || validated.commission_amount === null) {
      return NextResponse.json(
        { error: 'commission_amount is required for FIXED_AMOUNT type' },
        { status: 400 }
      )
    }
    commissionAmount = validated.commission_amount
  } else if (validated.commission_type === 'MANUAL') {
    if (validated.commission_amount === undefined || validated.commission_amount === null) {
      return NextResponse.json(
        { error: 'commission_amount is required for MANUAL type' },
        { status: 400 }
      )
    }
    commissionAmount = validated.commission_amount
    commissionRate = validated.commission_rate ?? null
  }

  const netAmount = item.amount - commissionAmount

  // 7. 更新処理（Prismaエラー分離）
  try {
    const updatedItem = await prisma.app_billing_items.update({
      where: { id: params.id },
      data: {
        commission_type: validated.commission_type,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        is_commission_manual: validated.commission_type === 'MANUAL',
        commission_note: validated.commission_note ?? null,
        updated_at: new Date(),
      },
      include: {
        collectors: {
          select: {
            company_name: true,
          },
        },
        stores: {
          select: {
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ data: updatedItem })
  } catch (dbError) {
    console.error('[Update Commission API] Database error (update):', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}


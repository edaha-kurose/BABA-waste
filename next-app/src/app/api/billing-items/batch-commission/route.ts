/**
 * POST /api/billing-items/batch-commission
 * 複数の請求明細の手数料を一括更新するAPI
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// リクエストボディのバリデーションスキーマ
const BatchUpdateSchema = z.object({
  item_ids: z.array(z.string().uuid()).min(1).max(100),
  commission_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'MANUAL']),
  commission_rate: z.number().min(0).max(100).nullable().optional(),
  commission_amount: z.number().min(0).nullable().optional(),
  commission_note: z.string().max(500).nullable().optional(),
})

export async function POST(request: NextRequest) {
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
    validated = BatchUpdateSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // 4. Prismaエラー分離
  try {
    // 対象明細を取得して認可チェック
    const items = await prisma.app_billing_items.findMany({
      where: {
        id: { in: validated.item_ids },
        deleted_at: null,
      },
      select: {
        id: true,
        org_id: true,
        amount: true,
        status: true,
      },
    })

    if (items.length === 0) {
      return NextResponse.json({ error: 'No items found' }, { status: 404 })
    }

    // 認可チェック（全ての明細が同じ組織に属しているか）
    const orgIds = [...new Set(items.map((item) => item.org_id))]
    if (orgIds.length > 1) {
      return NextResponse.json(
        { error: 'Items belong to multiple organizations' },
        { status: 400 }
      )
    }

    const targetOrgId = orgIds[0]
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ステータスチェック（承認済み・確定済みは編集不可）
    const editableItems = items.filter(
      (item) => !['APPROVED', 'FINALIZED'].includes(item.status)
    )

    if (editableItems.length === 0) {
      return NextResponse.json(
        { error: 'No editable items found (all are approved or finalized)' },
        { status: 400 }
      )
    }

    // 一括更新処理
    const updatePromises = editableItems.map((item) => {
      let commissionAmount = 0
      let commissionRate: number | null = null

      if (validated.commission_type === 'PERCENTAGE') {
        if (!validated.commission_rate) {
          throw new Error('commission_rate is required for PERCENTAGE type')
        }
        commissionRate = validated.commission_rate
        // 手数料は切り捨て（消費税と同様）
        commissionAmount = Math.floor(item.amount * (validated.commission_rate / 100))
      } else if (validated.commission_type === 'FIXED_AMOUNT') {
        if (validated.commission_amount === undefined || validated.commission_amount === null) {
          throw new Error('commission_amount is required for FIXED_AMOUNT type')
        }
        commissionAmount = validated.commission_amount
      } else if (validated.commission_type === 'MANUAL') {
        if (validated.commission_amount === undefined || validated.commission_amount === null) {
          throw new Error('commission_amount is required for MANUAL type')
        }
        commissionAmount = validated.commission_amount
        commissionRate = validated.commission_rate ?? null
      }

      const netAmount = item.amount - commissionAmount

      return prisma.app_billing_items.update({
        where: { id: item.id },
        data: {
          commission_type: validated.commission_type,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          net_amount: netAmount,
          is_commission_manual: validated.commission_type === 'MANUAL',
          commission_note: validated.commission_note ?? null,
          updated_at: new Date(),
        },
      })
    })

    await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      updated_count: editableItems.length,
      skipped_count: items.length - editableItems.length,
    })
  } catch (dbError) {
    console.error('[Batch Commission API] Database error:', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}


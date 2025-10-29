/**
 * PATCH /api/billing-items/batch-update
 * 複数の請求明細の手数料を一括更新するAPI（インライン編集用）
 * グローバルルール準拠
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// リクエストボディのバリデーションスキーマ
const UpdateItemSchema = z.object({
  id: z.string().uuid(),
  commission_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'MANUAL', 'NONE']),
  commission_rate: z.number().min(-100).max(100).nullable().optional(), // マイナス手数料を許可
  commission_amount: z.number().nullable().optional(), // マイナス手数料を許可（min制約を削除）
  commission_note: z.string().max(500).nullable().optional(),
})

const BatchUpdateSchema = z.object({
  updates: z.array(UpdateItemSchema).min(1).max(100),
})

export async function PATCH(request: NextRequest) {
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
      console.error('[Batch Update API] Validation error:', JSON.stringify(error.errors, null, 2))
      console.error('[Batch Update API] Received body:', JSON.stringify(body, null, 2))
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // 4. Prismaエラー分離
  try {
    const itemIds = validated.updates.map((u) => u.id)

    // 対象明細を取得して認可チェック
    const items = await prisma.app_billing_items.findMany({
      where: {
        id: { in: itemIds },
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
      const updateData = validated.updates.find((u) => u.id === item.id)
      if (!updateData) return null

      let commissionAmount = 0
      let commissionRate: number | null = null

      if (updateData.commission_type === 'NONE') {
        // 手数料なし
        commissionAmount = 0
        commissionRate = null
      } else if (updateData.commission_type === 'PERCENTAGE') {
        if (!updateData.commission_rate) {
          throw new Error('commission_rate is required for PERCENTAGE type')
        }
        commissionRate = updateData.commission_rate
        // 手数料は切り捨て（消費税と同様）
        commissionAmount = Math.floor(item.amount * (updateData.commission_rate / 100))
      } else if (updateData.commission_type === 'FIXED_AMOUNT') {
        if (updateData.commission_amount === undefined || updateData.commission_amount === null) {
          throw new Error('commission_amount is required for FIXED_AMOUNT type')
        }
        commissionAmount = updateData.commission_amount
      } else if (updateData.commission_type === 'MANUAL') {
        if (updateData.commission_amount === undefined || updateData.commission_amount === null) {
          throw new Error('commission_amount is required for MANUAL type')
        }
        commissionAmount = updateData.commission_amount
        commissionRate = updateData.commission_rate ?? null
      }

      const netAmount = item.amount - commissionAmount

      return prisma.app_billing_items.update({
        where: { id: item.id },
        data: {
          commission_type: updateData.commission_type,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          net_amount: netAmount,
          is_commission_manual: updateData.commission_type === 'MANUAL',
          commission_note: updateData.commission_note ?? null,
          updated_at: new Date(),
        },
      })
    })

    // null を除外
    const validPromises = updatePromises.filter((p) => p !== null)
    await Promise.all(validPromises)

    return NextResponse.json({
      success: true,
      updated_count: validPromises.length,
      skipped_count: items.length - editableItems.length,
    })
  } catch (dbError) {
    console.error('[Batch Update API] Database error:', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}


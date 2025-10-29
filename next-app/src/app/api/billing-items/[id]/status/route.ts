/**
 * PATCH /api/billing-items/[id]/status
 * 請求明細のステータスを変更するAPI
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// リクエストボディのバリデーションスキーマ
const UpdateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FINALIZED', 'CANCELLED']),
  note: z.string().max(500).optional(),
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
    validated = UpdateStatusSchema.parse(body)
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
        status: true,
      },
    })
  } catch (dbError) {
    console.error('[Update Status API] Database error (findUnique):', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }

  if (!item) {
    return NextResponse.json({ error: 'Billing item not found' }, { status: 404 })
  }

  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(item.org_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 5. ステータス遷移の妥当性チェック
  const validTransitions: Record<string, string[]> = {
    DRAFT: ['SUBMITTED', 'CANCELLED'],
    SUBMITTED: ['APPROVED', 'REJECTED', 'DRAFT'],
    APPROVED: ['FINALIZED', 'SUBMITTED'],
    REJECTED: ['DRAFT'],
    FINALIZED: [], // 確定済みは変更不可
    CANCELLED: ['DRAFT'],
  }

  const allowedNextStatuses = validTransitions[item.status] || []
  if (!allowedNextStatuses.includes(validated.status)) {
    return NextResponse.json(
      {
        error: `Invalid status transition from ${item.status} to ${validated.status}`,
        allowed: allowedNextStatuses,
      },
      { status: 400 }
    )
  }

  // 6. 更新処理（Prismaエラー分離）
  try {
    const updatedItem = await prisma.app_billing_items.update({
      where: { id: params.id },
      data: {
        status: validated.status,
        notes: validated.note
          ? `${item.status} → ${validated.status}: ${validated.note}`
          : undefined,
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
    console.error('[Update Status API] Database error (update):', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}


/**
 * GET /api/billing-items
 * 請求明細一覧取得API
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// クエリパラメータのバリデーションスキーマ
const QuerySchema = z.object({
  org_id: z.string().uuid().optional(),
  collector_id: z.string().uuid().optional(),
  billing_month: z.string().optional(), // YYYY-MM または YYYY-MM-DD
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(10000).default(50),
})

export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. クエリパラメータ取得
  const { searchParams } = new URL(request.url)
  const params = Object.fromEntries(searchParams.entries())

  // 3. Zodバリデーション
  let validated
  try {
    validated = QuerySchema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Billing Items API] Validation error:', error.errors)
      console.error('[Billing Items API] Received params:', params)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // 4. 認可チェック
  const targetOrgId = validated.org_id || authUser.org_ids[0]
  if (!targetOrgId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
  }

  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 5. クエリ条件構築
  const where: any = {
    org_id: targetOrgId,
    deleted_at: null,
  }

  if (validated.collector_id) {
    where.collector_id = validated.collector_id
  }

  if (validated.billing_month) {
    // YYYY-MM または YYYY-MM-DD 形式に対応
    const parts = validated.billing_month.split('-')
    if (parts.length >= 2) {
      const year = parts[0]
      const month = parts[1]
      where.billing_month = new Date(`${year}-${month}-01`)
    }
  }

  if (validated.status) {
    where.status = validated.status
  }

  // 6. Prismaエラー分離
  try {
    const [items, total] = await Promise.all([
      prisma.app_billing_items.findMany({
        where,
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
        orderBy: [
          { billing_month: 'desc' },
          { created_at: 'desc' },
        ],
        skip: (validated.page - 1) * validated.limit,
        take: validated.limit,
      }),
      prisma.app_billing_items.count({ where }),
    ])

    return NextResponse.json({
      data: items,
      pagination: {
        page: validated.page,
        limit: validated.limit,
        total,
        totalPages: Math.ceil(total / validated.limit),
      },
    })
  } catch (dbError) {
    console.error('[Billing Items API] Database error:', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}

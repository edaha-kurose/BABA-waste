/**
 * GET /api/commission-rules - 手数料ルール一覧取得
 * POST /api/commission-rules - 手数料ルール作成
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// 作成用スキーマ
const CreateRuleSchema = z.object({
  collector_id: z.string().uuid().nullable().optional(),
  billing_type: z.enum(['ALL', 'FIXED', 'METERED', 'OTHER']),
  commission_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  commission_value: z.number().min(0),
  is_active: z.boolean().default(true),
  effective_from: z.string().nullable().optional(),
  effective_to: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export async function GET(request: NextRequest) {
  // 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const targetOrgId = authUser.org_ids[0]
  if (!targetOrgId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
  }

  try {
    const rules = await prisma.commission_rules.findMany({
      where: {
        org_id: targetOrgId,
        deleted_at: null,
      },
      include: {
        collectors: {
          select: {
            company_name: true,
          },
        },
      },
      orderBy: [
        { is_active: 'desc' },
        { created_at: 'desc' },
      ],
    })

    return NextResponse.json({ data: rules })
  } catch (dbError) {
    console.error('[Commission Rules API] Database error:', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const targetOrgId = authUser.org_ids[0]
  if (!targetOrgId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
  }

  // JSONパース
  let body
  try {
    body = await request.json()
  } catch (parseError) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Zodバリデーション
  let validated
  try {
    validated = CreateRuleSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const rule = await prisma.commission_rules.create({
      data: {
        org_id: targetOrgId,
        collector_id: validated.collector_id || null,
        billing_type: validated.billing_type,
        commission_type: validated.commission_type,
        commission_value: validated.commission_value,
        is_active: validated.is_active,
        effective_from: validated.effective_from ? new Date(validated.effective_from) : null,
        effective_to: validated.effective_to ? new Date(validated.effective_to) : null,
        notes: validated.notes || null,
        created_by: authUser.id,
        updated_by: authUser.id,
      },
      include: {
        collectors: {
          select: {
            company_name: true,
          },
        },
      },
    })

    return NextResponse.json({ data: rule })
  } catch (dbError) {
    console.error('[Commission Rules API] Database error:', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}

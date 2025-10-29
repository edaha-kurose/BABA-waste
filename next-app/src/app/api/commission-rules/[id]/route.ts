/**
 * PATCH /api/commission-rules/[id] - 手数料ルール更新
 * DELETE /api/commission-rules/[id] - 手数料ルール削除
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

const UpdateRuleSchema = z.object({
  collector_id: z.string().uuid().nullable().optional(),
  billing_type: z.enum(['ALL', 'FIXED', 'METERED', 'OTHER']).optional(),
  commission_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).optional(),
  commission_value: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
  effective_from: z.string().nullable().optional(),
  effective_to: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch (parseError) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let validated
  try {
    validated = UpdateRuleSchema.parse(body)
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
    const rule = await prisma.commission_rules.findUnique({
      where: { id: params.id },
      select: { org_id: true },
    })

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(rule.org_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.commission_rules.update({
      where: { id: params.id },
      data: {
        ...(validated.collector_id !== undefined && { collector_id: validated.collector_id }),
        ...(validated.billing_type && { billing_type: validated.billing_type }),
        ...(validated.commission_type && { commission_type: validated.commission_type }),
        ...(validated.commission_value !== undefined && { commission_value: validated.commission_value }),
        ...(validated.is_active !== undefined && { is_active: validated.is_active }),
        ...(validated.effective_from !== undefined && {
          effective_from: validated.effective_from ? new Date(validated.effective_from) : null,
        }),
        ...(validated.effective_to !== undefined && {
          effective_to: validated.effective_to ? new Date(validated.effective_to) : null,
        }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
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

    return NextResponse.json({ data: updated })
  } catch (dbError) {
    console.error('[Commission Rules API] Database error:', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rule = await prisma.commission_rules.findUnique({
      where: { id: params.id },
      select: { org_id: true },
    })

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(rule.org_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.commission_rules.update({
      where: { id: params.id },
      data: {
        deleted_at: new Date(),
        updated_by: authUser.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (dbError) {
    console.error('[Commission Rules API] Database error:', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}

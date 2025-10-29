/**
 * POST /api/billing-summaries/[id]/submit
 * 請求サマリーを確定（提出）するAPI
 * 
 * 機能:
 * - 全明細がAPPROVED状態であることを確認
 * - サマリーのステータスをSUBMITTEDに変更
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. サマリーの存在確認と認可チェック
  let summary
  try {
    summary = await prisma.billing_summaries.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        org_id: true,
        collector_id: true,
        billing_month: true,
        status: true,
      },
    })
  } catch (dbError) {
    console.error('[Submit Summary API] Database error (findUnique):', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }

  if (!summary) {
    return NextResponse.json({ error: 'Billing summary not found' }, { status: 404 })
  }

  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(summary.org_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. ステータスチェック（DRAFT のみ提出可能）
  if (summary.status !== 'DRAFT') {
    return NextResponse.json(
      { error: `Cannot submit summary with status ${summary.status}` },
      { status: 400 }
    )
  }

  // 4. 全明細の承認状態を確認
  try {
    const items = await prisma.app_billing_items.findMany({
      where: {
        org_id: summary.org_id,
        collector_id: summary.collector_id,
        billing_month: summary.billing_month,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    })

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No billing items found for this summary' },
        { status: 400 }
      )
    }

    const unapprovedItems = items.filter((item) => item.status !== 'APPROVED')
    if (unapprovedItems.length > 0) {
      return NextResponse.json(
        {
          error: 'All items must be approved before submitting summary',
          unapproved_count: unapprovedItems.length,
          total_count: items.length,
        },
        { status: 400 }
      )
    }

    // 5. サマリーを確定
    const updatedSummary = await prisma.billing_summaries.update({
      where: { id: params.id },
      data: {
        status: 'SUBMITTED',
        submitted_at: new Date(),
        submitted_by: authUser.id,
        updated_at: new Date(),
      },
      include: {
        collectors: {
          select: {
            company_name: true,
          },
        },
      },
    })

    return NextResponse.json({ data: updatedSummary })
  } catch (dbError) {
    console.error('[Submit Summary API] Database error (update):', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}



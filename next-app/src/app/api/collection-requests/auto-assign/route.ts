/**
 * 収集業者自動割り当てAPI
 * 
 * POST /api/collection-requests/auto-assign
 * 
 * 未割当の廃棄依頼に収集業者を自動割り当て
 * GET /api/collection-requests/assignment-status
 * 
 * 割り当て状況を取得
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import {
  assignCollectorsToUnassignedRequests,
  assignCollectorsToStoreRequests,
  getAssignmentStatus,
} from '@/utils/collector-assignment-service'

// バリデーションスキーマ
const AutoAssignSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  user_id: z.string().uuid().optional(),
  mode: z.enum(['all', 'store']),
  store_id: z.string().uuid().optional(),
})

// POST /api/collection-requests/auto-assign - 自動割り当て
export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {

    // バリデーション
    const validatedData = AutoAssignSchema.parse(body)

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(validatedData.org_id)) {
      return NextResponse.json(
        { error: 'この組織の収集業者を割り当てる権限がありません' },
        { status: 403 }
      );
    }

    let result

    switch (validatedData.mode) {
      case 'all':
        result = await assignCollectorsToUnassignedRequests(
          validatedData.org_id,
          validatedData.user_id
        )
        break

      case 'store':
        if (!validatedData.store_id) {
          return NextResponse.json(
            { error: 'store_id is required for mode "store"' },
            { status: 400 }
          )
        }
        result = await assignCollectorsToStoreRequests(
          validatedData.store_id,
          validatedData.org_id,
          validatedData.user_id
        )
        break

      default:
        return NextResponse.json(
          { error: 'Invalid mode' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: result.success,
      assignedCount: result.assignedCount,
      errorCount: result.errorCount,
      errors: result.errors,
      warnings: result.warnings,
      message: result.success
        ? `${result.assignedCount}件の依頼に収集業者を割り当てました`
        : `割り当て中にエラーが発生しました（成功: ${result.assignedCount}件、エラー: ${result.errorCount}件）`,
    })
  } catch (error) {
    console.error('[Auto Assign Collectors API] エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET /api/collection-requests/assignment-status - 割り当て状況取得
export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url)
    const org_id = searchParams.get('org_id')

    if (!org_id) {
      return NextResponse.json(
        { error: 'org_id is required' },
        { status: 400 }
      )
    }

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(org_id)) {
      return NextResponse.json(
        { error: 'この組織の割り当て状況を閲覧する権限がありません' },
        { status: 403 }
      );
    }

    const status = await getAssignmentStatus(org_id)

    return NextResponse.json(status)
  } catch (error) {
    console.error('[Assignment Status API] エラー:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}







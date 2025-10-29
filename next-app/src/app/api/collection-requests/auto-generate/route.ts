/**
 * 自動依頼生成API
 * 
 * POST /api/collection-requests/auto-generate
 * 
 * 予定データから自動的に廃棄依頼を生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import {
  generateCollectionRequestsFromPlans,
  generateCollectionRequestsForStore,
  generateCollectionRequestsForCollector,
} from '@/utils/auto-request-generator'

// バリデーションスキーマ
const AutoGenerateSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  user_id: z.string().uuid().optional(),
  mode: z.enum(['plans', 'store', 'collector']),
  plan_ids: z.array(z.string().uuid()).optional(),
  store_id: z.string().uuid().optional(),
  collector_id: z.string().uuid().optional(),
})

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
    const validatedData = AutoGenerateSchema.parse(body)

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(validatedData.org_id)) {
      return NextResponse.json(
        { error: 'この組織の廃棄依頼を生成する権限がありません' },
        { status: 403 }
      );
    }

    let result

    switch (validatedData.mode) {
      case 'plans':
        if (!validatedData.plan_ids || validatedData.plan_ids.length === 0) {
          return NextResponse.json(
            { error: 'plan_ids is required for mode "plans"' },
            { status: 400 }
          )
        }
        result = await generateCollectionRequestsFromPlans(
          validatedData.plan_ids,
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
        result = await generateCollectionRequestsForStore(
          validatedData.store_id,
          validatedData.org_id,
          validatedData.user_id
        )
        break

      case 'collector':
        if (!validatedData.collector_id) {
          return NextResponse.json(
            { error: 'collector_id is required for mode "collector"' },
            { status: 400 }
          )
        }
        result = await generateCollectionRequestsForCollector(
          validatedData.collector_id,
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
      generated: result.generated,
      skipped: result.skipped,
      errors: result.errors,
      warnings: result.warnings,
      message: result.success
        ? `${result.generated}件の依頼を生成しました`
        : `依頼生成中にエラーが発生しました（成功: ${result.generated}件、エラー: ${result.errors.length}件）`,
    })
  } catch (error) {
    console.error('[Auto Generate Collection Requests API] エラー:', error)

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

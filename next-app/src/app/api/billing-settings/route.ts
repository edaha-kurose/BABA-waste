import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

// GET: 請求設定取得
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('org_id') || user.org_id

    if (!orgId) {
      return NextResponse.json({ error: '組織IDが必要です' }, { status: 400 })
    }

    // 組織IDのバリデーション（UUID形式チェック）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(orgId)) {
      return NextResponse.json({ error: '無効な組織IDです' }, { status: 400 })
    }

    let settings
    try {
      settings = await prisma.billing_settings.findUnique({
        where: { org_id: orgId },
      })
    } catch (dbError) {
      console.error('[GET /api/billing-settings] DB検索エラー:', dbError)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    // 設定が存在しない場合はデフォルト値を返す
    if (!settings) {
      return NextResponse.json({
        org_id: orgId,
        tax_rounding_mode: 'FLOOR', // デフォルト
        created_at: null,
        updated_at: null,
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[GET /api/billing-settings] エラー:', error)
    return NextResponse.json(
      { error: '請求設定の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST/PUT: 請求設定の作成・更新
const billingSettingsSchema = z.object({
  org_id: z.string().uuid(),
  tax_rounding_mode: z.enum(['FLOOR', 'CEIL', 'ROUND']),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // リクエストボディの取得
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: '不正なJSONフォーマットです' },
        { status: 400 }
      )
    }

    // Zodバリデーション
    const validated = billingSettingsSchema.parse(body)

    // 権限チェック（システム管理者または対象組織の管理者のみ）
    if (!user.isSystemAdmin && !user.org_ids.includes(validated.org_id)) {
      return NextResponse.json(
        { error: 'この組織の設定を変更する権限がありません' },
        { status: 403 }
      )
    }

    // UPSERT（存在すれば更新、なければ作成）
    let settings
    try {
      settings = await prisma.billing_settings.upsert({
        where: { org_id: validated.org_id },
        create: {
          org_id: validated.org_id,
          tax_rounding_mode: validated.tax_rounding_mode,
          created_by: user.id,
          updated_by: user.id,
        },
        update: {
          tax_rounding_mode: validated.tax_rounding_mode,
          updated_by: user.id,
        },
      })
    } catch (dbError) {
      console.error('[POST /api/billing-settings] DB更新エラー:', dbError)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[POST /api/billing-settings] エラー:', error)
    return NextResponse.json(
      { error: '請求設定の保存に失敗しました' },
      { status: 500 }
    )
  }
}


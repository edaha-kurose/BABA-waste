import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// Zodバリデーションスキーマ
const itemMapSchema = z.object({
  org_id: z.string().uuid(),
  item_label: z.string().min(1, '品目ラベルは必須です'),
  jwnet_code: z.string().min(1, 'JWNETコードは必須です'),
  hazard: z.boolean().default(false),
  default_unit: z.enum(['T', 'KG', 'M3']).default('T'),
  density_t_per_m3: z.number().optional(),
  disposal_method_code: z.string().optional(),
  notes: z.string().optional(),
})

// GET: 品目マップ一覧取得
export async function GET(request: NextRequest) {
  // 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const orgIdParam = searchParams.get('org_id')

  const targetOrgId = orgIdParam || authUser.org_id
  if (!targetOrgId) {
    return NextResponse.json({ error: '組織IDは必須です' }, { status: 400 })
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json(
      { error: 'この組織の品目マップを閲覧する権限がありません' },
      { status: 403 }
    )
  }

  // データ取得
  let itemMaps
  try {
    itemMaps = await prisma.item_maps.findMany({
      where: {
        org_id: targetOrgId,
        deleted_at: null,
      },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    })
  } catch (dbError) {
    console.error('[GET /api/item-maps] Prisma検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(itemMaps)
}

// POST: 品目マップ新規作成
export async function POST(request: NextRequest) {
  // 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // JSONパース
  let body
  try {
    body = await request.json()
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 })
  }

  // バリデーション
  let validatedData
  try {
    validatedData = itemMapSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 })
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(validatedData.org_id)) {
    return NextResponse.json(
      { error: 'この組織の品目マップを作成する権限がありません' },
      { status: 403 }
    )
  }

  // 重複チェック
  let existing
  try {
    existing = await prisma.item_maps.findFirst({
      where: {
        org_id: validatedData.org_id,
        item_label: validatedData.item_label,
        deleted_at: null,
      },
    })
  } catch (dbError) {
    console.error('[POST /api/item-maps] Prisma重複チェックエラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (existing) {
    return NextResponse.json(
      { error: 'この品目ラベルは既に存在します' },
      { status: 409 }
    )
  }

  // 作成
  let itemMap
  try {
    itemMap = await prisma.item_maps.create({
      data: {
        org_id: validatedData.org_id,
        item_label: validatedData.item_label,
        jwnet_code: validatedData.jwnet_code,
        hazard: validatedData.hazard,
        default_unit: validatedData.default_unit,
        density_t_per_m3: validatedData.density_t_per_m3,
        disposal_method_code: validatedData.disposal_method_code,
        notes: validatedData.notes,
        created_by: authUser.id,
        updated_by: authUser.id,
      },
      include: {
        organizations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[POST /api/item-maps] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(itemMap, { status: 201 })
}

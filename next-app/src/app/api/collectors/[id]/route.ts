import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// Zodバリデーションスキーマ
const collectorUpdateSchema = z.object({
  company_name: z.string().min(1, '会社名は必須です').optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  license_number: z.string().optional(),
  service_areas: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})

// GET: 収集業者詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = params

  let collector
  try {
    collector = await prisma.collectors.findUnique({
      where: {
        id,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            user_org_roles: {
            where: {
              role: 'TRANSPORTER',
            },
              select: {
                role: true,
                org_id: true,
                is_active: true,
                organizations: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[GET /api/collectors/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!collector || collector.deleted_at) {
    return NextResponse.json(
      { error: '収集業者が見つかりません' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(collector.org_id)) {
    return NextResponse.json(
      { error: 'この収集業者を閲覧する権限がありません' },
      { status: 403 }
    );
  }

  return NextResponse.json(collector)
}

// PUT: 収集業者更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = params
  
  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  // 存在確認
  let existing
  try {
    existing = await prisma.collectors.findUnique({
      where: { id },
    });
  } catch (dbError) {
    console.error('[PUT /api/collectors/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existing || existing.deleted_at) {
    return NextResponse.json(
      { error: '収集業者が見つかりません' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existing.org_id)) {
    return NextResponse.json(
      { error: 'この収集業者を更新する権限がありません' },
      { status: 403 }
    );
  }

  // バリデーション
  let validatedData
  try {
    validatedData = collectorUpdateSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 });
  }

  // 更新
  let collector
  try {
    collector = await prisma.collectors.update({
      where: { id },
      data: {
        ...validatedData,
        updated_by: authUser.id,
        updated_at: new Date(),
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  } catch (dbError) {
    console.error('[PUT /api/collectors/[id]] Prisma更新エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json(collector)
}

// DELETE: 収集業者論理削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = params

  // 存在確認
  let existing
  try {
    existing = await prisma.collectors.findUnique({
      where: { id },
    });
  } catch (dbError) {
    console.error('[DELETE /api/collectors/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existing || existing.deleted_at) {
    return NextResponse.json(
      { error: '収集業者が見つかりません' },
      { status: 404 }
    )
  }

  // 権限チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(existing.org_id)) {
    return NextResponse.json(
      { error: 'この収集業者を削除する権限がありません' },
      { status: 403 }
    );
  }

  // TODO: 使用中チェック（collection_requests, store_collector_assignments等）

  // 論理削除
  let collector
  try {
    collector = await prisma.collectors.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  } catch (dbError) {
    console.error('[DELETE /api/collectors/[id]] Prisma削除エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: '収集業者を削除しました',
    id: collector.id,
  })
}


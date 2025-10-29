import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// GET /api/users/[id] - ユーザー詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let user
  try {
    user = await prisma.app_users.findUnique({
      where: { id: params.id },
      include: {
        user_org_roles: {
          include: {
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
    });
  } catch (dbError) {
    console.error('[GET /api/users/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: 'Not Found', message: 'User not found' },
      { status: 404 }
    )
  }

  // 権限チェック: 自分自身かシステム管理者のみ
  const isOwnProfile = authUser.id === params.id;
  const hasOrgAccess = user.user_org_roles.some(role => 
    authUser.org_ids.includes(role.org_id)
  );
  
  if (!authUser.isSystemAdmin && !isOwnProfile && !hasOrgAccess) {
    return NextResponse.json(
      { error: 'このユーザーを閲覧する権限がありません' },
      { status: 403 }
    );
  }

  return NextResponse.json({ data: user })
}

// PATCH /api/users/[id] - ユーザー更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Zodでバリデーション
    const schema = z.object({
      email: z.string().email().optional(),
      name: z.string().min(1).max(255).optional(),
      is_active: z.boolean().optional(),
      updated_by: z.string().uuid().optional(),
      // 組織ロールの更新（オプション）
      org_role_updates: z.array(z.object({
        org_id: z.string().uuid(),
        role: z.enum(['ADMIN', 'EMITTER', 'TRANSPORTER', 'DISPOSER']),
      })).optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    let existing
    try {
      existing = await prisma.app_users.findUnique({
        where: { id: params.id },
        include: {
          user_org_roles: {
            where: { deleted_at: null },
            select: { org_id: true },
          },
        },
      });
    } catch (dbError) {
      console.error('[PATCH /api/users/[id]] Prisma検索エラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      )
    }

    // 権限チェック
    const isOwnProfile = authUser.id === params.id;
    const hasOrgAccess = existing.user_org_roles.some(role => 
      authUser.org_ids.includes(role.org_id)
    );
    
    if (!authUser.isSystemAdmin && !isOwnProfile && !hasOrgAccess) {
      return NextResponse.json(
        { error: 'このユーザーを更新する権限がありません' },
        { status: 403 }
      );
    }

    // メールアドレス重複チェック（変更時）
    if (validatedData.email && validatedData.email !== existing.email) {
      const duplicate = await prisma.app_users.findFirst({
        where: {
          email: validatedData.email,
          deleted_at: null,
          NOT: { id: params.id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Email already exists' },
          { status: 409 }
        )
      }
    }

    // トランザクションで更新
    let result
    try {
      result = await prisma.$transaction(async (tx) => {
      // ユーザー情報更新
      const updateData: any = {}
      if (validatedData.email !== undefined) updateData.email = validatedData.email
      if (validatedData.name !== undefined) updateData.name = validatedData.name
      if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active
      if (validatedData.updated_by !== undefined) updateData.updated_by = validatedData.updated_by

      const user = await tx.app_users.update({
        where: { id: params.id },
        data: updateData,
      })

      // 組織ロール更新（指定された場合）
      if (validatedData.org_role_updates && validatedData.org_role_updates.length > 0) {
        for (const roleUpdate of validatedData.org_role_updates) {
          await tx.user_org_roles.updateMany({
            where: {
              user_id: params.id,
              org_id: roleUpdate.org_id,
              deleted_at: null,
            },
            data: {
              role: roleUpdate.role,
              updated_by: validatedData.updated_by,
            },
          })
        }
      }

      // 更新後のデータ取得
      return await tx.app_users.findUnique({
        where: { id: params.id },
        include: {
          user_org_roles: {
            include: {
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
      })
    });
    } catch (dbError) {
      console.error('[PATCH /api/users/[id]] Prismaトランザクションエラー:', dbError);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: result,
      message: 'User updated successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[API] Failed to update user:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - ユーザー削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // システム管理者のみ
  if (!authUser.isSystemAdmin) {
    return NextResponse.json({ error: 'システム管理者権限が必要です' }, { status: 403 });
  }

  // 存在チェック
  let existing
  try {
    existing = await prisma.app_users.findUnique({
      where: { id: params.id },
    });
  } catch (dbError) {
    console.error('[DELETE /api/users/[id]] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (!existing || existing.deleted_at) {
    return NextResponse.json(
      { error: 'Not Found', message: 'User not found' },
      { status: 404 }
    )
  }

  // トランザクションで論理削除
  let result
  try {
    result = await prisma.$transaction(async (tx) => {
      // ユーザーの論理削除
      const user = await tx.app_users.update({
        where: { id: params.id },
        data: {
          deleted_at: new Date(),
          updated_by: authUser.id,
          is_active: false,
        },
      })

      // 関連する組織ロールも論理削除
      await tx.user_org_roles.updateMany({
        where: {
          user_id: params.id,
          deleted_at: null,
        },
        data: {
          deleted_at: new Date(),
          updated_by: authUser.id,
        },
      })

      return user
    });
  } catch (dbError) {
    console.error('[DELETE /api/users/[id]] Prismaトランザクションエラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: result,
    message: 'User deleted successfully',
  })
}


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/users/[id] - ユーザー詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        user_org_roles: {
          where: { deleted_at: null },
          include: {
            organization: {
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

    if (!user || user.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: user })
  } catch (error) {
    console.error('[API] Failed to fetch user:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id] - ユーザー更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Zodでバリデーション
    const schema = z.object({
      email: z.string().email().optional(),
      name: z.string().min(1).max(255).optional(),
      is_active: z.boolean().optional(),
      updated_by: z.string().uuid().optional(),
      // 組織ロールの更新（オプション）
      org_role_updates: z.array(z.object({
        org_id: z.string().uuid(),
        role: z.enum(['ADMIN', 'EMITTER', 'TRANSPORTER', 'DISPOSER', 'COLLECTOR', 'USER']),
      })).optional(),
    })

    const validatedData = schema.parse(body)

    // 存在チェック
    const existing = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      )
    }

    // メールアドレス重複チェック（変更時）
    if (validatedData.email && validatedData.email !== existing.email) {
      const duplicate = await prisma.user.findFirst({
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
    const result = await prisma.$transaction(async (tx) => {
      // ユーザー情報更新
      const updateData: any = {}
      if (validatedData.email !== undefined) updateData.email = validatedData.email
      if (validatedData.name !== undefined) updateData.name = validatedData.name
      if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active
      if (validatedData.updated_by !== undefined) updateData.updated_by = validatedData.updated_by

      const user = await tx.user.update({
        where: { id: params.id },
        data: updateData,
      })

      // 組織ロール更新（指定された場合）
      if (validatedData.org_role_updates && validatedData.org_role_updates.length > 0) {
        for (const roleUpdate of validatedData.org_role_updates) {
          await tx.userOrgRole.updateMany({
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
      return await tx.user.findUnique({
        where: { id: params.id },
        include: {
          user_org_roles: {
            where: { deleted_at: null },
            include: {
              organization: {
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
    })

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
  try {
    const searchParams = request.nextUrl.searchParams
    const updated_by = searchParams.get('updated_by') || undefined

    // 存在チェック
    const existing = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      )
    }

    // トランザクションで論理削除
    const result = await prisma.$transaction(async (tx) => {
      // ユーザーの論理削除
      const user = await tx.user.update({
        where: { id: params.id },
        data: {
          deleted_at: new Date(),
          updated_by,
          is_active: false,
        },
      })

      // 関連する組織ロールも論理削除
      await tx.userOrgRole.updateMany({
        where: {
          user_id: params.id,
          deleted_at: null,
        },
        data: {
          deleted_at: new Date(),
          updated_by,
        },
      })

      return user
    })

    return NextResponse.json({
      data: result,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('[API] Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete user' },
      { status: 500 }
    )
  }
}


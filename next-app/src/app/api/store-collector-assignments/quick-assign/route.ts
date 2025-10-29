import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

// ============================================================================
// POST /api/store-collector-assignments/quick-assign - クイック割り当て
// ============================================================================

const quickAssignSchema = z.object({
  store_id: z.string().uuid(),
  collector_id: z.string().uuid(),
  is_primary: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      validatedData = quickAssignSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'バリデーションエラー', details: error.errors },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 })
    }

    // 既存レコードチェック（論理削除されたものも含む）
    let existing
    try {
      existing = await prisma.store_collector_assignments.findFirst({
        where: {
          store_id: validatedData.store_id,
          collector_id: validatedData.collector_id,
        },
      })
    } catch (dbError) {
      console.error('[POST /api/store-collector-assignments/quick-assign] Prisma既存チェックエラー:', dbError)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    let assignment
    try {
      if (existing) {
        // 既存レコードがある場合
        if (existing.deleted_at === null) {
          // 論理削除されていない場合は既に登録済み
          console.log('[Quick Assign] 既に登録済み:', existing.id)
          return NextResponse.json(
            { error: 'この店舗と収集業者の組み合わせは既に登録されています' },
            { status: 409 }
          )
        } else {
          // 論理削除されている場合は復元（更新）
          console.log('[Quick Assign] 論理削除レコードを復元:', existing.id)
          assignment = await prisma.store_collector_assignments.update({
            where: { id: existing.id },
            data: {
              deleted_at: null,
              is_primary: validatedData.is_primary,
              updated_by: user.id,
              updated_at: new Date(),
            },
            include: {
              stores: {
                select: {
                  id: true,
                  name: true,
                  store_code: true,
                },
              },
              collectors: {
                select: {
                  id: true,
                  company_name: true,
                  phone: true,
                },
              },
            },
          })
        }
      } else {
        // 新規作成
        console.log('[Quick Assign] 新規作成')
        assignment = await prisma.store_collector_assignments.create({
          data: {
            org_id: user.org_id,
            store_id: validatedData.store_id,
            collector_id: validatedData.collector_id,
            is_primary: validatedData.is_primary,
            created_by: user.id,
            updated_by: user.id,
          },
          include: {
            stores: {
              select: {
                id: true,
                name: true,
                store_code: true,
              },
            },
            collectors: {
              select: {
                id: true,
                company_name: true,
                phone: true,
              },
            },
          },
        })
      }
    } catch (dbError) {
      console.error('[POST /api/store-collector-assignments/quick-assign] Prisma処理エラー:', dbError)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: assignment,
        message: '収集業者を割り当てました',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/store-collector-assignments/quick-assign] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


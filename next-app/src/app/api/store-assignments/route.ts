/**
 * 店舗-収集業者割り当てAPI
 * 既存store_collector_assignmentsテーブル活用
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// バリデーションスキーマ
const AssignmentCreateSchema = z.object({
  store_id: z.string().uuid(),
  collector_id: z.string().uuid(),
  priority: z.number().int().min(1).max(10),
  is_active: z.boolean().default(true),
})

/**
 * GET /api/store-assignments
 * 割り当て一覧取得
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('store_id')
  const collectorId = searchParams.get('collector_id')

  const where: any = {}
  if (storeId) where.store_id = storeId
  if (collectorId) where.collector_id = collectorId

  let assignments
  try {
    assignments = await prisma.store_collector_assignments.findMany({
      where,
      orderBy: [{ store_id: 'asc' }, { priority: 'asc' }],
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            store_code: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[GET /api/store-assignments] Prisma検索エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: assignments,
    count: assignments.length,
  })
}

/**
 * POST /api/store-assignments
 * 割り当て作成
 */
export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 })
  }

  let validatedData
  try {
    validatedData = AssignmentCreateSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 })
  }

  // 重複チェック
  let existing
  try {
    existing = await prisma.store_collector_assignments.findFirst({
      where: {
        store_id: validatedData.store_id,
        collector_id: validatedData.collector_id,
      },
    })
  } catch (dbError) {
    console.error('[POST /api/store-assignments] Prisma重複チェックエラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  if (existing) {
    return NextResponse.json(
      { error: 'この組み合わせは既に存在します' },
      { status: 409 }
    )
  }

  let assignment
  try {
    assignment = await prisma.store_collector_assignments.create({
      data: {
        org_id: authUser.org_id,
        ...validatedData,
        created_by: authUser.id,
        updated_by: authUser.id,
      },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            store_code: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[POST /api/store-assignments] Prisma作成エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  return NextResponse.json(assignment, { status: 201 })
}











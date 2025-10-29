/**
 * GET /api/quick-login/collectors
 * クイックログイン用の収集業者一覧を取得するAPI
 * グローバルルール準拠
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 収集業者を取得（user_idが設定されているもののみ）
    const collectors = await prisma.collectors.findMany({
      where: {
        deleted_at: null,
        is_active: true,
        user_id: { not: null },
      },
      select: {
        id: true,
        company_name: true,
        users: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        company_name: 'asc',
      },
      take: 10, // 最大10社まで
    })

    // レスポンス整形
    const collectorList = collectors
      .filter((c) => c.users?.email) // emailが存在するもののみ
      .map((c) => ({
        id: c.id,
        company_name: c.company_name,
        email: c.users!.email,
      }))

    return NextResponse.json({
      success: true,
      collectors: collectorList,
    })
  } catch (dbError) {
    console.error('[Quick Login Collectors API] Database error:', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}



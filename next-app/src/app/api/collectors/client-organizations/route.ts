/**
 * GET /api/collectors/client-organizations
 * 収集業者が取引している排出企業（クライアント）一覧を取得するAPI
 * グローバルルール準拠
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. 収集業者かどうかチェック
  const isCollector = authUser.role === 'TRANSPORTER'
  
  if (!isCollector) {
    return NextResponse.json(
      { error: 'Forbidden: Collector only' },
      { status: 403 }
    )
  }

  // 3. Prismaエラー分離
  try {
    // 収集業者情報を取得
    const collector = await prisma.collectors.findFirst({
      where: {
        user_id: authUser.id,
        deleted_at: null,
        is_active: true,
      },
      select: {
        id: true,
        company_name: true,
      },
    })

    if (!collector) {
      return NextResponse.json(
        { error: 'Collector not found' },
        { status: 404 }
      )
    }

    // 収集業者が担当している店舗から、排出企業（組織）を取得
    const clientOrganizations = await prisma.organizations.findMany({
      where: {
        stores: {
          some: {
            store_collector_assignments: {
              some: {
                collector_id: collector.id,
                is_active: true,
                deleted_at: null,
              },
            },
          },
        },
        org_type: 'EMITTER',
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        org_type: true,
      },
      orderBy: {
        name: 'asc',
      },
      distinct: ['id'],
    })

    return NextResponse.json({
      success: true,
      data: clientOrganizations,
      meta: {
        total: clientOrganizations.length,
        collector_id: collector.id,
        collector_name: collector.company_name,
      },
    })
  } catch (dbError) {
    console.error('[Collector Client Organizations API] Database error:', dbError)
    return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
  }
}



/**
 * 収集業者統計API
 * GET /api/collector/stats
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/supabase-server'
import prisma from '@/lib/prisma'
import dayjs from 'dayjs'

export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // app.usersからユーザー情報取得
    const { data: appUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // ロール確認
    const { data: roleData } = await supabase
      .from('user_org_roles')
      .select('role')
      .eq('user_id', appUser.id)
      .single()

    if (roleData?.role !== 'TRANSPORTER') {
      return NextResponse.json(
        { error: 'Forbidden: TRANSPORTER role required' },
        { status: 403 }
      )
    }

    // 統計データ取得
    const today = dayjs().format('YYYY-MM-DD')
    const weekStart = dayjs().startOf('week').format('YYYY-MM-DD')
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD')

    let pendingRequests, todayCollections, weekCollections, monthCollections;
    try {
      [pendingRequests, todayCollections, weekCollections, monthCollections] = await Promise.all([
        // 未対応の依頼数
        prisma.collection_requests.count({
          where: {
            collector_id: appUser.id,
            status: 'PENDING',
          },
        }),
        // 本日の回収予定数
        prisma.collection_requests.count({
          where: {
            collector_id: appUser.id,
            scheduled_collection_date: {
              gte: new Date(today),
              lt: new Date(dayjs(today).add(1, 'day').format('YYYY-MM-DD')),
            },
          },
        }),
        // 今週の回収実績数
        prisma.collections.count({
          where: {
            collection_requests: {
              collector_id: appUser.id,
            },
            collected_at: {
              gte: new Date(weekStart),
            },
          },
        }),
        // 今月の回収実績数
        prisma.collections.count({
          where: {
            collection_requests: {
              collector_id: appUser.id,
            },
            collected_at: {
              gte: new Date(monthStart),
            },
          },
        }),
      ]);
    } catch (dbError) {
      console.error('[CollectorStatsAPI] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      pendingRequests,
      todayCollections,
      weekCollections,
      monthCollections,
    })
  } catch (error) {
    console.error('[CollectorStatsAPI] Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


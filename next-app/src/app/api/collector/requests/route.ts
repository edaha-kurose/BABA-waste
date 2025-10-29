/**
 * 収集業者用 - 回収依頼API
 * GET /api/collector/requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/supabase-server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // app.usersからユーザー情報取得
    const { data: appUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 自分宛ての依頼を取得
    let requests;
    try {
      requests = await prisma.collection_requests.findMany({
        where: {
          collector_id: appUser.id,
        },
        orderBy: {
          requested_at: 'desc',
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
      });
    } catch (dbError) {
      console.error('[CollectorRequestsAPI] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: requests,
      count: requests.length,
    })
  } catch (error) {
    console.error('[CollectorRequestsAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


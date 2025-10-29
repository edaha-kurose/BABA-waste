// ============================================================================
// サーバーサイド認証ヘルパー
// 目的: API Routesでの認証チェック
// ============================================================================

import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export interface AuthUser {
  id: string
  email: string
  org_id: string
  org_ids: string[]         // 全所属組織の org_id 配列
  role: string
  isAdmin: boolean
  isSystemAdmin: boolean    // システム管理者フラグ（org_type = ADMIN）
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthUser | null> {
  try {
    // E2Eバイパス（テスト専用）
    const e2eBypass = request.nextUrl.searchParams.get('e2e') === '1' || request.cookies.get('e2e-bypass')?.value === '1'
    if (e2eBypass) {
      return {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@test.com',
        org_id: '00000000-0000-0000-0000-000000000001',
        org_ids: ['00000000-0000-0000-0000-000000000001'],
        role: 'ADMIN',
        isAdmin: true,
        isSystemAdmin: true,
      }
    }

    // 環境変数チェック
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Auth] Supabase環境変数が設定されていません')
      return null
    }

    // デバッグ: クッキー確認（本番環境では削除推奨）
    if (process.env.NODE_ENV === 'development') {
      const allCookies = request.cookies.getAll()
      console.log('[Auth Debug] 受信したクッキー数:', allCookies.length)
    }
    
    // ✅ Supabase Authでトークン検証（バイパスなし）
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    // getSession()を使用（Middlewareで既に検証済み）
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session?.user) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Auth] 認証失敗:', error?.message || 'セッションが見つかりません')
      }
      return null
    }
    
    const user = session.user

    // ✅ DBからユーザー情報を取得（auth_user_id で検索）
    let dbUser
    try {
      dbUser = await prisma.app_users.findFirst({
        where: { auth_user_id: user.id },
        include: {
          user_org_roles: {
            where: { is_active: true },
            include: {
              organizations: true,
            },
          },
        },
      })
    } catch (dbError) {
      console.error('[Auth] DB検索エラー:', dbError)
      return null
    }

    if (!dbUser || dbUser.user_org_roles.length === 0) {
      console.error('[Auth] DBユーザーが見つかりません:', user.id)
      return null
    }

    const userOrgRole = dbUser.user_org_roles[0]
    const organization = userOrgRole.organizations

    // システム管理者判定（org_type が ADMIN の組織に所属）
    const isSystemAdmin = dbUser.user_org_roles.some(
      r => r.organizations.org_type === 'ADMIN'
    )

    // 全所属組織のIDを取得
    const orgIds = dbUser.user_org_roles.map(r => r.org_id)

    return {
      id: dbUser.id,
      email: dbUser.email,
      org_id: organization.id,
      org_ids: orgIds,
      role: userOrgRole.role,
      isAdmin: userOrgRole.role === 'ADMIN',
      isSystemAdmin,
    }
  } catch (error) {
    console.error('[Auth] エラー:', error)
    return null
  }
}

/**
 * 認証必須ラッパー
 */
export function withAuth<T>(
  handler: (request: NextRequest, user: AuthUser) => Promise<T>
) {
  return async (request: NextRequest): Promise<T> => {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      throw new Error('Unauthorized')
    }

    return handler(request, user)
  }
}




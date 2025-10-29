/**
 * セッション管理
 * クライアントサイドでのセッション処理
 */

'use client'

import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createBrowserClient } from './supabase-browser'

/**
 * 現在のユーザーとセッションを取得するReact Hook
 */
export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔵 useSession: 初期化開始')
    const supabase = createBrowserClient()

    // 初回セッション取得
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ useSession: getSession エラー:', error)
      }
      console.log('🔵 useSession: getSession完了', {
        hasSession: !!session,
        userEmail: session?.user?.email,
      })
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((err) => {
      console.error('❌ useSession: getSession 例外:', err)
      setLoading(false)
    })

    // セッション変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔵 useSession: onAuthStateChange', {
        event,
        hasSession: !!session,
        userEmail: session?.user?.email,
      })
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      console.log('🔵 useSession: クリーンアップ')
      subscription.unsubscribe()
    }
  }, [])

  return { user, session, loading }
}

/**
 * ユーザー情報とロールを取得するReact Hook
 */
export function useUser() {
  const { user, loading } = useSession()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userOrg, setUserOrg] = useState<any>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    console.log('🟣 useUser: useEffect実行', { hasUser: !!user, userEmail: user?.email, loading })
    
    // セッションロード中はuserが存在しなくてもroleLoadingをtrueのまま維持
    if (!user) {
      if (!loading) {
        // セッションロード完了後もuserがない = 本当にログインしていない
        console.log('🟣 useUser: ユーザーなし - ロールをクリア')
        setUserRole(null)
        setUserOrg(null)
        setRoleLoading(false)
      }
      return
    }

    const supabase = createBrowserClient()

    // まずauth_user_idでapp.usersを検索し、そのidでuser_org_rolesを検索
    console.log('🔍 useUser: ユーザーロール取得開始', {
      auth_user_id: user.id,
      email: user.email,
    })
    
    const fetchUserRole = async () => {
      try {
        console.log('🔍 useUser: Step 1 - app.users検索開始')
        // Step 1: app.usersからユーザーを検索（クライアント初期化時にappスキーマ設定済み）
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (userError) {
          console.error('❌ useUser: app.users検索エラー:', {
            code: userError.code,
            message: userError.message,
            details: userError.details,
            hint: userError.hint,
          })
        }

        if (!userData) {
          console.error('❌ useUser: app.usersにデータなし')
          setRoleLoading(false)
          return
        }

        console.log('✅ useUser: app.user_id取得成功:', (userData as any).id)

        console.log('🔍 useUser: Step 2 - user_org_roles検索開始')
        // Step 2: user_org_rolesを検索（マルチテナント対応：複数行取得）
        const { data, error } = await supabase
          .from('user_org_roles')
          .select('role, org_id, organization:organizations(*)')
          .eq('user_id', (userData as any).id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1) // 最新の1件を取得

        if (error) {
          console.error('❌ useUser: user_org_roles検索エラー:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          })
        }
        
        if (data && data.length > 0) {
          const firstRole = data[0]
          // organizationの型を明示的にキャスト
          const organization = Array.isArray((firstRole as any).organization) 
            ? (firstRole as any).organization[0] 
            : (firstRole as any).organization
          
          console.log('✅ useUser: ロール取得成功 (マルチテナント対応):', {
            role: (firstRole as any).role,
            org_id: (firstRole as any).org_id,
            org_name: organization?.name,
            total_orgs: data.length,
          })
          setUserRole((firstRole as any).role)
          setUserOrg(organization as any)
        } else {
          console.warn('⚠️ useUser: ロールデータなし (エラーなしだがdataが空)')
        }
      } catch (err) {
        console.error('❌ useUser: 予期しない例外:', err)
      } finally {
        console.log('🟣 useUser: fetchUserRole完了 - roleLoadingをfalseに設定')
        setRoleLoading(false)
      }
    }

    fetchUserRole()
  }, [user, loading])

  return {
    user,
    userRole,
    userOrg,
    loading: loading || roleLoading,
  }
}

/**
 * 認証が必要なページかチェック
 */
export function useRequireAuth() {
  const { user, loading } = useSession()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (!loading) {
      setIsAuthenticated(!!user)
    }
  }, [user, loading])

  return { isAuthenticated, loading }
}

/**
 * ログアウト処理
 */
export async function logoutUser() {
  const supabase = createBrowserClient()
  await supabase.auth.signOut()
}

/**
 * セッション更新
 */
export async function refreshSession() {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.auth.refreshSession()
  return { data, error }
}


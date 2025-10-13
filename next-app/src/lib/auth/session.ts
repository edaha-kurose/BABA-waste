/**
 * セッション管理
 * クライアントサイドでのセッション処理
 */

'use client'

import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createBrowserClient } from './supabase'

/**
 * 現在のユーザーとセッションを取得するReact Hook
 */
export function useSession() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient()

    // 初回セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // セッション変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
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
    if (!user) {
      setUserRole(null)
      setUserOrg(null)
      setRoleLoading(false)
      return
    }

    const supabase = createBrowserClient()

    // ユーザーのロールと組織情報を取得
    supabase
      .from('user_org_roles')
      .select('role, org_id, organization:organizations(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setUserRole(data.role)
          setUserOrg(data.organization)
        }
        setRoleLoading(false)
      })
  }, [user])

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


/**
 * Supabase サーバーサイド認証ヘルパー
 * Server Components、API Routes、Server Actions で使用
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// サーバーサイド用 Supabase クライアント（Cookie ベース）
export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      db: {
        schema: 'app', // appスキーマを使用
      },
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    }
  )
}

// サービスロール用 Supabase クライアント（管理者操作用）
export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'app', // appスキーマを使用
      },
    }
  )
}

// 現在のユーザーを取得（サーバーサイド）
export async function getCurrentUser() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    return user
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

// 現在のセッションを取得（サーバーサイド）
export async function getCurrentSession() {
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error('Error fetching session:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('Error in getCurrentSession:', error)
    return null
  }
}

// ユーザーのロールを取得
export async function getUserRole(userId: string) {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('user_org_roles')
      .select('role, org_id, organization:organizations(name)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching user role:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserRole:', error)
    return null
  }
}

// ユーザーの組織を取得
export async function getUserOrganizations(userId: string) {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('user_org_roles')
      .select('org_id, role, organization:organizations(*)')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching user organizations:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserOrganizations:', error)
    return []
  }
}

// 権限チェック
export async function hasPermission(userId: string, requiredRole: string) {
  const role = await getUserRole(userId)
  if (!role) return false

  const roleHierarchy = {
    ADMIN: 5,
    COLLECTOR: 4,
    TRANSPORTER: 3,
    DISPOSER: 3,
    EMITTER: 2,
    USER: 1,
  }

  const userRoleLevel = roleHierarchy[role.role as keyof typeof roleHierarchy] || 0
  const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  return userRoleLevel >= requiredRoleLevel
}

// ログアウト
export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
}

// メールアドレスでサインイン
export async function signInWithEmail(email: string, password: string) {
  const supabase = await createServerClient()
  return await supabase.auth.signInWithPassword({ email, password })
}

// ユーザー登録
export async function signUpWithEmail(email: string, password: string, metadata?: Record<string, any>) {
  const supabase = await createServerClient()
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })
}


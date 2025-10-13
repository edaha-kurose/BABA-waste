import { createClient } from '@supabase/supabase-js'

// Supabaseクライアント（クライアントサイド用）
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Server-side用のSupabaseクライアント
export const supabaseServer = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// 現在のユーザーを取得
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Failed to get current user:', error)
    return null
  }

  return user
}

// ユーザーの組織ロールを取得
export async function getUserOrgRoles(userId: string) {
  const client = supabaseServer()
  
  const { data, error } = await client
    .from('user_org_roles')
    .select('*, organizations(id, name, code)')
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to get user org roles:', error)
    return []
  }

  return data
}

// ログイン
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

// ログアウト
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

// パスワードリセット
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })

  if (error) {
    throw error
  }
}


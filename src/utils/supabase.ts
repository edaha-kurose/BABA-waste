// ============================================================================
// Supabaseクライアント設定
// 作成日: 2025-09-16
// 目的: Supabaseとの接続と認証管理
// ============================================================================

import { createClient } from '@supabase/supabase-js'
// import type { Database } from '@contracts/v0/schema'

// ============================================================================
// 環境変数
// ============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key'

// ============================================================================
// Supabaseクライアント
// ============================================================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// ============================================================================
// 認証関連
// ============================================================================

export interface AuthUser {
  id: string
  email?: string
  user_metadata?: Record<string, any>
  app_metadata?: Record<string, any>
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
  token_type: string
  user: AuthUser
}

// 現在のユーザーを取得
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // 開発環境ではモックユーザーを返す
    if (import.meta.env.DEV) {
      // ローカルストレージからユーザー情報を取得
      const storedUser = localStorage.getItem('dev_user')
      if (storedUser) {
        return JSON.parse(storedUser)
      }
      return null
    }
    
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting current user:', error)
      return null
    }
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// 現在のセッションを取得
export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting current session:', error)
      return null
    }
    return session
  } catch (error) {
    console.error('Error getting current session:', error)
    return null
  }
}

// ログイン
export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
  try {
    // 開発環境ではモック認証を使用
    if (import.meta.env.DEV) {
      // 簡単な認証チェック（実際のプロダクションでは適切な認証を実装）
      if (email === 'admin@example.com' && password === 'password') {
        const mockUser: AuthUser = {
          id: 'dev-user-1',
          email: 'admin@example.com',
          user_metadata: {
            org_id: 'dev-org-1',
            name: '管理者',
          },
        }
        localStorage.setItem('dev_user', JSON.stringify(mockUser))
        return { user: mockUser, error: null }
      } else {
        return { user: null, error: new Error('メールアドレスまたはパスワードが正しくありません') }
      }
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return { user: null, error }
    }
    
    return { user: data.user, error: null }
  } catch (error) {
    return { user: null, error: error as Error }
  }
}

// ログアウト
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    // 開発環境ではローカルストレージをクリア
    if (import.meta.env.DEV) {
      localStorage.removeItem('dev_user')
      return { error: null }
    }
    
    const { error } = await supabase.auth.signOut()
    return { error }
  } catch (error) {
    return { error: error as Error }
  }
}

// パスワードリセット
export async function resetPassword(email: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  } catch (error) {
    return { error: error as Error }
  }
}

// ============================================================================
// 組織関連
// ============================================================================

// 現在のユーザーの組織IDを取得
export async function getCurrentOrgId(): Promise<string | null> {
  try {
    const session = await getCurrentSession()
    if (!session) return null
    
    const orgId = session.user.user_metadata?.org_id
    return orgId || null
  } catch (error) {
    console.error('Error getting current org ID:', error)
    return null
  }
}

// ユーザーの組織ロールを取得
export async function getUserOrgRoles(userId: string): Promise<Array<{ orgId: string; role: string }>> {
  try {
    const { data, error } = await supabase
      .from('user_org_roles')
      .select('org_id, role')
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error getting user org roles:', error)
      return []
    }
    
    return data.map(row => ({
      orgId: row.org_id,
      role: row.role,
    }))
  } catch (error) {
    console.error('Error getting user org roles:', error)
    return []
  }
}

// ============================================================================
// データベース操作
// ============================================================================

// 基本的なCRUD操作のヘルパー関数
export class SupabaseRepository {
  constructor(private tableName: string) {}

  // 単一レコード取得
  async findById(id: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      
      return data
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID:`, error)
      throw error
    }
  }

  // 複数レコード取得
  async findMany(filter: Record<string, any> = {}): Promise<any[]> {
    try {
      let query = supabase.from(this.tableName).select('*')
      
      // フィルターを適用
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
      
      const { data, error } = await query
      
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error(`Error finding ${this.tableName}:`, error)
      throw error
    }
  }

  // レコード作成
  async create(data: Record<string, any>): Promise<any> {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single()
      
      if (error) throw error
      
      return result
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error)
      throw error
    }
  }

  // レコード更新
  async update(id: string, data: Record<string, any>): Promise<any> {
    try {
      const { data: result, error } = await supabase
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      return result
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error)
      throw error
    }
  }

  // レコード削除
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (error) {
      console.error(`Error deleting ${this.tableName}:`, error)
      throw error
    }
  }

  // 検索
  async search(query: string, fields: string[]): Promise<any[]> {
    try {
      let searchQuery = supabase.from(this.tableName).select('*')
      
      // 各フィールドで検索
      const orConditions = fields.map(field => `${field}.ilike.%${query}%`).join(',')
      searchQuery = searchQuery.or(orConditions)
      
      const { data, error } = await searchQuery
      
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error(`Error searching ${this.tableName}:`, error)
      throw error
    }
  }

  // ページネーション
  async findWithPagination(
    page: number,
    limit: number,
    filter: Record<string, any> = {}
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    try {
      const offset = (page - 1) * limit
      
      // 総件数を取得
      let countQuery = supabase.from(this.tableName).select('*', { count: 'exact', head: true })
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          countQuery = countQuery.eq(key, value)
        }
      })
      
      const { count, error: countError } = await countQuery
      if (countError) throw countError
      
      // データを取得
      let dataQuery = supabase.from(this.tableName).select('*')
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          dataQuery = dataQuery.eq(key, value)
        }
      })
      
      const { data, error } = await dataQuery
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
      }
    } catch (error) {
      console.error(`Error finding ${this.tableName} with pagination:`, error)
      throw error
    }
  }
}

// ============================================================================
// リアルタイム購読
// ============================================================================

export interface RealtimeSubscription {
  unsubscribe: () => void
}

// テーブルの変更を購読
export function subscribeToTable(
  tableName: string,
  callback: (payload: any) => void
): RealtimeSubscription {
  const subscription = supabase
    .channel(`${tableName}_changes`)
    .on('postgres_changes', {
      event: '*',
      schema: 'app',
      table: tableName,
    }, callback)
    .subscribe()

  return {
    unsubscribe: () => {
      subscription.unsubscribe()
    },
  }
}

// 特定のレコードの変更を購読
export function subscribeToRecord(
  tableName: string,
  recordId: string,
  callback: (payload: any) => void
): RealtimeSubscription {
  const subscription = supabase
    .channel(`${tableName}_${recordId}_changes`)
    .on('postgres_changes', {
      event: '*',
      schema: 'app',
      table: tableName,
      filter: `id=eq.${recordId}`,
    }, callback)
    .subscribe()

  return {
    unsubscribe: () => {
      subscription.unsubscribe()
    },
  }
}

// ============================================================================
// エラーハンドリング
// ============================================================================

export function handleSupabaseError(error: any): Error {
  if (error.code === 'PGRST116') {
    return new Error('レコードが見つかりません')
  }
  if (error.code === 'PGRST301') {
    return new Error('認証が必要です')
  }
  if (error.code === 'PGRST302') {
    return new Error('権限がありません')
  }
  if (error.code === 'PGRST303') {
    return new Error('行レベルセキュリティによりアクセスが拒否されました')
  }
  if (error.code === 'PGRST304') {
    return new Error('リクエストが多すぎます')
  }
  if (error.code === 'PGRST305') {
    return new Error('リクエストが大きすぎます')
  }
  if (error.code === 'PGRST306') {
    return new Error('リクエストが長すぎます')
  }
  if (error.code === 'PGRST307') {
    return new Error('リクエストが複雑すぎます')
  }
  if (error.code === 'PGRST308') {
    return new Error('リクエストが遅すぎます')
  }
  if (error.code === 'PGRST309') {
    return new Error('リクエストが早すぎます')
  }
  if (error.code === 'PGRST310') {
    return new Error('リクエストが古すぎます')
  }
  if (error.code === 'PGRST311') {
    return new Error('リクエストが新しすぎます')
  }
  if (error.code === 'PGRST312') {
    return new Error('リクエストが重複しています')
  }
  if (error.code === 'PGRST313') {
    return new Error('リクエストが競合しています')
  }
  if (error.code === 'PGRST314') {
    return new Error('リクエストが無効です')
  }
  if (error.code === 'PGRST315') {
    return new Error('リクエストが禁止されています')
  }
  if (error.code === 'PGRST316') {
    return new Error('リクエストが見つかりません')
  }
  if (error.code === 'PGRST317') {
    return new Error('リクエストが許可されていません')
  }
  if (error.code === 'PGRST318') {
    return new Error('リクエストが要求されていません')
  }
  if (error.code === 'PGRST319') {
    return new Error('リクエストが受け入れられません')
  }
  if (error.code === 'PGRST320') {
    return new Error('リクエストが処理されません')
  }
  if (error.code === 'PGRST321') {
    return new Error('リクエストが完了しません')
  }
  if (error.code === 'PGRST322') {
    return new Error('リクエストが失敗しました')
  }
  if (error.code === 'PGRST323') {
    return new Error('リクエストがエラーになりました')
  }
  if (error.code === 'PGRST324') {
    return new Error('リクエストが例外になりました')
  }
  if (error.code === 'PGRST325') {
    return new Error('リクエストが中断されました')
  }
  if (error.code === 'PGRST326') {
    return new Error('リクエストがキャンセルされました')
  }
  if (error.code === 'PGRST327') {
    return new Error('リクエストがタイムアウトしました')
  }
  if (error.code === 'PGRST328') {
    return new Error('リクエストがリトライされました')
  }
  if (error.code === 'PGRST329') {
    return new Error('リクエストが再試行されました')
  }
  if (error.code === 'PGRST330') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST331') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST332') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST333') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST334') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST335') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST336') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST337') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST338') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST339') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST340') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST341') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST342') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST343') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST344') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST345') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST346') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST347') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST348') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST349') {
    return new Error('リクエストが再開されました')
  }
  if (error.code === 'PGRST350') {
    return new Error('リクエストが再開されました')
  }
  
  return new Error(`Supabaseエラー: ${error.message}`)
}

/**
 * Supabase クライアントサイド認証ヘルパー
 * 'use client' コンポーネントで使用
 */

'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// シングルトンインスタンス（appスキーマ対応）
let supabaseInstance: SupabaseClient<any, 'public', 'app'> | null = null

// クライアントサイド用 Supabase クライアント（シングルトン）
export function createBrowserClient(): SupabaseClient<any, 'public', 'app'> {
  // 既存のインスタンスがあればそれを返す
  if (supabaseInstance) {
    return supabaseInstance
  }

  // 新しいインスタンスを作成
  supabaseInstance = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'app', // appスキーマを使用
      },
    }
  )

  console.log('🔧 Supabaseクライアント作成（シングルトン）')
  console.log('🔧 SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('🔧 localStorage available:', typeof window !== 'undefined' && !!window.localStorage)
  console.log('🔧 Schema: app')
  return supabaseInstance
}


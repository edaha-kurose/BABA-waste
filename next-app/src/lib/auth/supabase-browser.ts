/**
 * Supabase クライアントサイド認証ヘルパー
 * 'use client' コンポーネントで使用
 */

'use client'

import { createClient } from '@supabase/supabase-js'

// クライアントサイド用 Supabase クライアント
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  )
}


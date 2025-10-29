/**
 * Supabase クライアントサイド認証ヘルパー
 * 'use client' コンポーネントで使用
 */

'use client'

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'

// シングルトンインスタンス
let supabaseInstance: ReturnType<typeof createSupabaseBrowserClient> | null = null

// クライアントサイド用 Supabase クライアント（シングルトン）
export function createBrowserClient() {
  // 既存のインスタンスがあればそれを返す
  if (supabaseInstance) {
    return supabaseInstance
  }

  // 新しいインスタンスを作成（@supabase/ssr を使用）
  supabaseInstance = createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'app' as any, // appスキーマをデフォルトに設定（型アサーション）
      },
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined
          const value = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1]
          return value
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return
          let cookie = `${name}=${value}`
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
          if (options?.path) cookie += `; path=${options.path}`
          if (options?.domain) cookie += `; domain=${options.domain}`
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
          if (options?.secure) cookie += '; secure'
          document.cookie = cookie
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return
          document.cookie = `${name}=; path=${options?.path || '/'}; max-age=0`
        },
      },
    }
  )

  console.log('🔧 Supabaseクライアント作成（SSR対応）')
  console.log('🔧 SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('🔧 Cookie support: enabled')
  return supabaseInstance
}


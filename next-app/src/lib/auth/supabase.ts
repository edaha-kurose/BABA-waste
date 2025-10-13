/**
 * Supabase 認証ヘルパー関数（型定義エクスポート）
 * 
 * ⚠️ 重要: 実装は分離されています
 * 
 * ### クライアントサイドで使用する場合（'use client' コンポーネント）:
 * ```typescript
 * import { createBrowserClient } from '@/lib/auth/supabase-browser'
 * ```
 * 
 * ### サーバーサイドで使用する場合（Server Components, API Routes, Server Actions）:
 * ```typescript
 * import { createServerClient, getCurrentUser } from '@/lib/auth/supabase-server'
 * ```
 */

// 型定義のみエクスポート（実装はインポートしない）
export type { User, Session } from '@supabase/supabase-js'

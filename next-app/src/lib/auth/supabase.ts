/**
 * Supabase 認証ヘルパー関数（統合エクスポート）
 * 
 * ⚠️ 重要: このファイルは互換性のために残されています
 * 新しいコードでは以下を直接インポートしてください：
 * - クライアントサイド: '@/lib/auth/supabase-browser'
 * - サーバーサイド: '@/lib/auth/supabase-server'
 */

// クライアントサイド用（'use client' コンポーネントで使用）
export { createBrowserClient } from './supabase-browser'

// サーバーサイド用（Server Components, API Routes, Server Actions で使用）
export {
  createServerClient,
  createServiceRoleClient,
  getCurrentUser,
  getCurrentSession,
  getUserRole,
  getUserOrganizations,
  hasPermission,
  signOut,
  signInWithEmail,
  signUpWithEmail,
} from './supabase-server'


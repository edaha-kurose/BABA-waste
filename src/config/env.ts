// ============================================================================
// 環境変数設定
// 作成日: 2025-09-16
// 目的: 環境変数の管理とデフォルト値の設定
// ============================================================================

// Supabase設定
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

// データバックエンド設定
export const DATA_BACKEND_MODE = import.meta.env.VITE_DATA_BACKEND_MODE || 'dexie'
export const DATA_BACKEND_OVERRIDES = import.meta.env.VITE_DATA_BACKEND_OVERRIDES || ''

// データ参照先設定（相対パス）
export const DATA_SOURCE_PATH = import.meta.env.VITE_DATA_SOURCE_PATH || '.'
export const JWNET_FOLDER_PATH = import.meta.env.VITE_JWNET_FOLDER_PATH || './JWNET'

// JWNET設定
export const JWNET_GATEWAY_BASEURL = import.meta.env.VITE_JWNET_GATEWAY_BASEURL || 'https://gw.internal/jwnet'
export const JWNET_GATEWAY_TOKEN = import.meta.env.VITE_JWNET_GATEWAY_TOKEN || 'your-gateway-token'

// 開発モード設定
export const IS_DEVELOPMENT = import.meta.env.DEV
export const IS_PRODUCTION = import.meta.env.PROD

// デバッグ設定
export const DEBUG_MODE = import.meta.env.VITE_DEBUG === 'true' || IS_DEVELOPMENT

// データバックエンドモード取得関数
export const getDataBackendMode = (): 'dexie' | 'supabase' | 'dual' => {
  const mode = DATA_BACKEND_MODE.toLowerCase()
  if (mode === 'supabase') return 'supabase'
  if (mode === 'dual') return 'dual'
  return 'dexie' // デフォルトはdexie
}


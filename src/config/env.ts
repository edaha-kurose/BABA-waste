// ============================================================================
// 環境変数設定（後方互換性のため維持）
// 作成日: 2025-09-16
// 更新日: 2025-10-13 - env.validation.ts に移行
// 目的: 環境変数の管理とデフォルト値の設定
// ============================================================================

/**
 * @deprecated env.validation.ts の env を使用してください
 * 後方互換性のため残していますが、新規コードでは使用しないでください
 */

import { env, isDevelopment, isProduction, isDebugMode, getDataBackendMode as getMode } from './env.validation'

// Supabase設定
export const SUPABASE_URL = env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY

// データバックエンド設定
export const DATA_BACKEND_MODE = env.VITE_DATA_BACKEND_MODE
export const DATA_BACKEND_OVERRIDES = env.VITE_DATA_BACKEND_OVERRIDES

// データ参照先設定（相対パス）
export const DATA_SOURCE_PATH = env.VITE_DATA_SOURCE_PATH
export const JWNET_FOLDER_PATH = env.VITE_JWNET_FOLDER_PATH

// JWNET設定
export const JWNET_GATEWAY_BASEURL = env.VITE_JWNET_GATEWAY_BASEURL || 'https://gw.internal/jwnet'
export const JWNET_GATEWAY_TOKEN = env.VITE_JWNET_GATEWAY_TOKEN || 'your-gateway-token'

// 開発モード設定
export const IS_DEVELOPMENT = isDevelopment
export const IS_PRODUCTION = isProduction

// デバッグ設定
export const DEBUG_MODE = isDebugMode

// データバックエンドモード取得関数
export const getDataBackendMode = getMode


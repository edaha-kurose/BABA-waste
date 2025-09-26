// ============================================================================
// データパス設定
// 作成日: 2025-01-27
// 目的: データ参照先のパス管理
// ============================================================================

import { DATA_SOURCE_PATH, JWNET_FOLDER_PATH } from './env'

// ============================================================================
// データパス定数
// ============================================================================

export const DATA_PATHS = {
  // メインデータソース
  SOURCE: DATA_SOURCE_PATH,
  
  // JWNET関連
  JWNET: JWNET_FOLDER_PATH,
  
  // サンプルデータ
  SAMPLE_DATA: `${DATA_SOURCE_PATH}/sample-data`,
  
  // エクスポート先
  EXPORT: `${DATA_SOURCE_PATH}/export`,
  
  // ログ
  LOGS: `${DATA_SOURCE_PATH}/logs`,
  
  // バックアップ
  BACKUP: `${DATA_SOURCE_PATH}/backup`,
} as const

// ============================================================================
// パスユーティリティ関数
// ============================================================================

/**
 * データパスを取得
 */
export function getDataPath(key: keyof typeof DATA_PATHS): string {
  return DATA_PATHS[key]
}

/**
 * 相対パスを絶対パスに変換
 */
export function resolveDataPath(relativePath: string): string {
  return `${DATA_SOURCE_PATH}/${relativePath}`
}

/**
 * JWNETファイルのパスを取得
 */
export function getJwnetFilePath(filename: string): string {
  return `${JWNET_FOLDER_PATH}/${filename}`
}

/**
 * サンプルデータファイルのパスを取得
 */
export function getSampleDataPath(filename: string): string {
  return `${DATA_PATHS.SAMPLE_DATA}/${filename}`
}

/**
 * エクスポートファイルのパスを取得
 */
export function getExportPath(filename: string): string {
  return `${DATA_PATHS.EXPORT}/${filename}`
}



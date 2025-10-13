/**
 * 環境変数バリデーション
 * 目的: 起動時に環境変数の不備を検出し、型安全なアクセスを提供
 */

import { z } from 'zod';

// 環境変数スキーマ定義
const envSchema = z.object({
  // Supabase設定（Public - クライアントサイドで使用可）
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),

  // データバックエンド設定
  VITE_DATA_BACKEND_MODE: z.enum(['dexie', 'supabase', 'dual']).default('dexie'),
  VITE_DATA_BACKEND_OVERRIDES: z.string().optional().default(''),

  // データソースパス
  VITE_DATA_SOURCE_PATH: z.string().optional().default('.'),
  VITE_JWNET_FOLDER_PATH: z.string().optional().default('./JWNET'),

  // JWNET設定（開発環境ではオプショナル）
  VITE_JWNET_GATEWAY_BASEURL: z.string().url().optional(),
  VITE_JWNET_GATEWAY_TOKEN: z.string().optional(),

  // デバッグ設定
  VITE_DEBUG: z.enum(['true', 'false']).optional().default('false'),

  // Node環境
  NODE_ENV: z.enum(['development', 'test', 'production']).optional().default('development'),
  
  // モード
  MODE: z.enum(['development', 'production']).optional(),
  DEV: z.boolean().optional(),
  PROD: z.boolean().optional(),
});

// 環境変数の型を推論
export type Env = z.infer<typeof envSchema>;

// 環境変数をバリデーション
function validateEnv(): Env {
  try {
    // import.meta.env をバリデーション
    const parsed = envSchema.parse(import.meta.env);
    console.log('✅ 環境変数のバリデーション成功');
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ 環境変数のバリデーションエラー:');
      console.error(error.errors);
      
      // エラー詳細を表示
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      
      throw new Error('環境変数の設定に不備があります。.env ファイルを確認してください。');
    }
    throw error;
  }
}

// 型安全な環境変数をエクスポート
export const env = validateEnv();

// 開発環境かどうかを判定
export const isDevelopment = env.MODE === 'development' || env.DEV === true;
export const isProduction = env.MODE === 'production' || env.PROD === true;

// デバッグモードかどうかを判定
export const isDebugMode = env.VITE_DEBUG === 'true' || isDevelopment;

// データバックエンドモードを取得
export const getDataBackendMode = (): 'dexie' | 'supabase' | 'dual' => {
  return env.VITE_DATA_BACKEND_MODE;
};

// 型安全なアクセス用のヘルパー関数
export const getSupabaseConfig = () => ({
  url: env.VITE_SUPABASE_URL,
  anonKey: env.VITE_SUPABASE_ANON_KEY,
});

export const getJwnetConfig = () => ({
  baseUrl: env.VITE_JWNET_GATEWAY_BASEURL,
  token: env.VITE_JWNET_GATEWAY_TOKEN,
});

export const getDataPaths = () => ({
  source: env.VITE_DATA_SOURCE_PATH,
  jwnet: env.VITE_JWNET_FOLDER_PATH,
});


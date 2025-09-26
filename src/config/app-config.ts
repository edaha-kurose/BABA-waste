export type FeatureFlags = {
  DATA_BACKEND_MODE: 'dual' | 'dexie' | 'supabase'
  DATA_BACKEND_OVERRIDES?: Record<string, 'dual' | 'dexie' | 'supabase'>
}

export type NotificationConfig = {
  enabled: boolean
  baseUrl: string
  timezone: 'Asia/Tokyo' | string
  demoCollectorOverrideEmail: string
  dailySendHourJST: number // 22
}

export type AppConfig = {
  orgId: string
  featureFlags: FeatureFlags
  notifications: NotificationConfig
}

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function readEnv(name: string, fallback?: string): string | undefined {
  // Viteのimport.meta.env参照（存在しない場合はfallback）
  const v = (import.meta as any).env?.[name]
  return v ?? fallback
}

export function getAppConfig(): AppConfig {
  // Defaults
  const defaults: AppConfig = {
    orgId: 'default-org',
    featureFlags: {
      DATA_BACKEND_MODE: (readEnv('VITE_DATA_BACKEND_MODE', 'dexie') as any) || 'dexie',
      DATA_BACKEND_OVERRIDES: undefined,
    },
    notifications: {
      enabled: localStorage.getItem('notif.enabled') === 'true',
      baseUrl: localStorage.getItem('notif.baseUrl') || readEnv('VITE_BASE_URL', 'http://localhost:3000') || 'http://localhost:3000',
      timezone: 'Asia/Tokyo',
      demoCollectorOverrideEmail: 'environ_ke@yahoo.co.jp',
      dailySendHourJST: 22,
    },
  }
  // 追加の上書き余地
  return defaults
}

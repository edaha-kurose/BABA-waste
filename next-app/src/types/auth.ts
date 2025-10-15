/**
 * 認証・認可関連の型定義
 */

/**
 * アプリケーションロール
 * データベースのapp_role ENUM型に対応
 */
export type AppRole = 'ADMIN' | 'EMITTER' | 'TRANSPORTER'

/**
 * ロール別の権限マトリクス
 */
export const ROLE_PERMISSIONS = {
  ADMIN: {
    label: '管理者',
    canAccessDashboard: true,
    canAccessOrganizations: true,
    canAccessUsers: true,
    canAccessStores: true,
    canAccessPlans: true,
    canAccessCollections: true,
    canAccessBilling: true,
    canAccessJwnet: true,
    canAccessReports: true,
    canAccessSettings: true,
  },
  EMITTER: {
    label: '排出事業者',
    canAccessDashboard: true,
    canAccessOrganizations: false,
    canAccessUsers: false,
    canAccessStores: true,
    canAccessPlans: true,
    canAccessCollections: true,
    canAccessBilling: true,
    canAccessJwnet: false,
    canAccessReports: true,
    canAccessSettings: false,
  },
  TRANSPORTER: {
    label: '収集業者',
    canAccessDashboard: true,
    canAccessOrganizations: false,
    canAccessUsers: false,
    canAccessStores: false,
    canAccessPlans: false,
    canAccessCollections: true,
    canAccessBilling: false,
    canAccessJwnet: true,
    canAccessReports: false,
    canAccessSettings: false,
  },
} as const

/**
 * ロールが特定の権限を持っているかチェック
 */
export function hasPermission(
  role: AppRole | null,
  permission: keyof typeof ROLE_PERMISSIONS.ADMIN
): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role][permission] === true
}

/**
 * ロールラベル取得
 */
export function getRoleLabel(role: AppRole | null): string {
  if (!role) return '未設定'
  return ROLE_PERMISSIONS[role].label
}



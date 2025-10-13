/**
 * Role-Based Access Control (RBAC)
 * ロールベースアクセス制御
 */

export type Role = 'ADMIN' | 'COLLECTOR' | 'TRANSPORTER' | 'DISPOSER' | 'EMITTER' | 'USER'

export type Permission = 
  | 'organizations:read'
  | 'organizations:write'
  | 'organizations:delete'
  | 'stores:read'
  | 'stores:write'
  | 'stores:delete'
  | 'plans:read'
  | 'plans:write'
  | 'plans:delete'
  | 'collections:read'
  | 'collections:write'
  | 'collections:delete'
  | 'collection-requests:read'
  | 'collection-requests:write'
  | 'collection-requests:approve'
  | 'collection-requests:delete'
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'item-maps:read'
  | 'item-maps:write'
  | 'item-maps:delete'
  | 'jwnet:read'
  | 'jwnet:write'
  | 'reports:read'
  | 'reports:export'
  | 'settings:read'
  | 'settings:write'

// ロール階層（数値が高いほど権限が強い）
const roleHierarchy: Record<Role, number> = {
  ADMIN: 5,
  COLLECTOR: 4,
  TRANSPORTER: 3,
  DISPOSER: 3,
  EMITTER: 2,
  USER: 1,
}

// ロールごとの権限定義
const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    // すべての権限
    'organizations:read',
    'organizations:write',
    'organizations:delete',
    'stores:read',
    'stores:write',
    'stores:delete',
    'plans:read',
    'plans:write',
    'plans:delete',
    'collections:read',
    'collections:write',
    'collections:delete',
    'collection-requests:read',
    'collection-requests:write',
    'collection-requests:approve',
    'collection-requests:delete',
    'users:read',
    'users:write',
    'users:delete',
    'item-maps:read',
    'item-maps:write',
    'item-maps:delete',
    'jwnet:read',
    'jwnet:write',
    'reports:read',
    'reports:export',
    'settings:read',
    'settings:write',
  ],
  COLLECTOR: [
    'organizations:read',
    'stores:read',
    'plans:read',
    'collections:read',
    'collections:write',
    'collection-requests:read',
    'collection-requests:write',
    'item-maps:read',
    'jwnet:read',
    'reports:read',
    'settings:read',
  ],
  TRANSPORTER: [
    'organizations:read',
    'stores:read',
    'plans:read',
    'collections:read',
    'collection-requests:read',
    'item-maps:read',
    'reports:read',
    'settings:read',
  ],
  DISPOSER: [
    'organizations:read',
    'stores:read',
    'plans:read',
    'collections:read',
    'collection-requests:read',
    'item-maps:read',
    'reports:read',
    'settings:read',
  ],
  EMITTER: [
    'organizations:read',
    'stores:read',
    'plans:read',
    'collections:read',
    'collection-requests:read',
    'collection-requests:write',
    'item-maps:read',
    'reports:read',
  ],
  USER: [
    'organizations:read',
    'stores:read',
    'plans:read',
    'collections:read',
    'reports:read',
  ],
}

/**
 * ロールに特定の権限があるかチェック
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = rolePermissions[role] || []
  return permissions.includes(permission)
}

/**
 * ロールに複数の権限があるかチェック（すべて必要）
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * ロールに複数の権限のいずれかがあるかチェック（1つ以上）
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * ロールAがロールB以上の権限を持つかチェック
 */
export function isRoleHigherOrEqual(roleA: Role, roleB: Role): boolean {
  return roleHierarchy[roleA] >= roleHierarchy[roleB]
}

/**
 * リソースへのアクセス権限をチェック
 */
export function canAccessResource(
  role: Role,
  resource: 'organizations' | 'stores' | 'plans' | 'collections' | 'collection-requests' | 'users' | 'item-maps',
  action: 'read' | 'write' | 'delete' | 'approve'
): boolean {
  const permission = `${resource}:${action}` as Permission
  return hasPermission(role, permission)
}

/**
 * UIコンポーネントの表示可否を判定
 */
export function canViewComponent(role: Role, componentPermission: Permission): boolean {
  return hasPermission(role, componentPermission)
}

/**
 * ロールの日本語表示名を取得
 */
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    ADMIN: '管理者',
    COLLECTOR: '収集業者',
    TRANSPORTER: '運搬業者',
    DISPOSER: '処分業者',
    EMITTER: '排出事業者',
    USER: '一般ユーザー',
  }
  return displayNames[role] || role
}

/**
 * ロールの説明を取得
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    ADMIN: 'システム全体の管理権限',
    COLLECTOR: '廃棄物の収集・運搬業務',
    TRANSPORTER: '廃棄物の運搬業務',
    DISPOSER: '廃棄物の処分業務',
    EMITTER: '廃棄物の排出業務',
    USER: '閲覧権限のみ',
  }
  return descriptions[role] || ''
}

/**
 * 利用可能なすべてのロールを取得
 */
export function getAllRoles(): Role[] {
  return Object.keys(roleHierarchy) as Role[]
}

/**
 * ロールの権限一覧を取得
 */
export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role] || []
}


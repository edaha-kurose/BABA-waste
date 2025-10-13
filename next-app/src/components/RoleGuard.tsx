/**
 * ロールベースのコンポーネント表示制御
 * 特定のロールまたは権限を持つユーザーのみコンテンツを表示
 */

'use client'

import { ReactNode } from 'react'
import { useUser } from '@/lib/auth/session'
import { hasPermission, hasAnyPermission, hasAllPermissions, type Role, type Permission } from '@/lib/auth/rbac'

interface RoleGuardProps {
  children: ReactNode
  /**
   * 必要なロール（複数指定可）
   */
  roles?: Role | Role[]
  /**
   * 必要な権限（複数指定可）
   */
  permissions?: Permission | Permission[]
  /**
   * 複数権限の場合の条件
   * - 'all': すべての権限が必要
   * - 'any': いずれかの権限があればOK
   */
  permissionMode?: 'all' | 'any'
  /**
   * 権限がない場合に表示するコンテンツ
   */
  fallback?: ReactNode
}

export default function RoleGuard({
  children,
  roles,
  permissions,
  permissionMode = 'all',
  fallback = null,
}: RoleGuardProps) {
  const { userRole, loading } = useUser()

  // ローディング中は何も表示しない（またはスケルトン）
  if (loading) {
    return <>{fallback}</>
  }

  // ユーザーロールがない場合は非表示
  if (!userRole) {
    return <>{fallback}</>
  }

  const currentRole = userRole as Role

  // ロールチェック
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    if (!allowedRoles.includes(currentRole)) {
      return <>{fallback}</>
    }
  }

  // 権限チェック
  if (permissions) {
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions]
    
    let hasAccess = false
    if (permissionMode === 'all') {
      hasAccess = hasAllPermissions(currentRole, requiredPermissions)
    } else {
      hasAccess = hasAnyPermission(currentRole, requiredPermissions)
    }

    if (!hasAccess) {
      return <>{fallback}</>
    }
  }

  // すべての条件を満たす場合、子要素を表示
  return <>{children}</>
}

/**
 * 特定の権限を持つユーザーのみボタンを表示
 */
interface PermissionButtonProps extends React.ComponentProps<'button'> {
  permission: Permission
  fallback?: ReactNode
}

export function PermissionButton({ permission, fallback, children, ...props }: PermissionButtonProps) {
  return (
    <RoleGuard permissions={permission} fallback={fallback}>
      <button {...props}>{children}</button>
    </RoleGuard>
  )
}

/**
 * 管理者のみコンテンツを表示
 */
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard roles="ADMIN" fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

/**
 * 収集業者のみコンテンツを表示
 */
export function CollectorOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard roles="COLLECTOR" fallback={fallback}>
      {children}
    </RoleGuard>
  )
}


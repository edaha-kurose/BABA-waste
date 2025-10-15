/**
 * 保護されたルートコンポーネント
 * 認証されていないユーザーをログインページにリダイレクト
 * ロールベースのアクセス制御を実装
 */

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Spin, Result, Button } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'
import { AppRole } from '@/types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: AppRole | AppRole[]
  fallback?: React.ReactNode
}

export default function ProtectedRoute({
  children,
  requiredRole,
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userRole, loading } = useUser()

  useEffect(() => {
    if (!loading && !user) {
      // 認証されていない場合、ログインページにリダイレクト
      console.log('🔒 ProtectedRoute: 未認証 → ログインへ')
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [user, loading, router, pathname])

  // ローディング中
  if (loading) {
    return (
      fallback || (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <Spin size="large" tip="読み込み中..." />
        </div>
      )
    )
  }

  // 認証されていない
  if (!user) {
    return null
  }

  // ロールチェック
  if (requiredRole && userRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const hasRequiredRole = requiredRoles.includes(userRole as AppRole)

    if (!hasRequiredRole) {
      console.warn('🚫 ProtectedRoute: 権限不足', {
        userRole,
        requiredRole: requiredRoles,
      })
      
      return (
        <div style={{ padding: '24px' }}>
          <Result
            status="403"
            title="アクセス権限がありません"
            subTitle={`このページにアクセスするには、${requiredRoles.join('または')}の権限が必要です。`}
            icon={<LockOutlined />}
            extra={
              <Button type="primary" onClick={() => router.push('/dashboard')}>
                ダッシュボードに戻る
              </Button>
            }
          />
        </div>
      )
    }
  }

  console.log('✅ ProtectedRoute: 認証OK', { userRole })

  // 認証済み & 権限OK
  return <>{children}</>
}


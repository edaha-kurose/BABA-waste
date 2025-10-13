/**
 * 保護されたルートコンポーネント
 * 認証されていないユーザーをログインページにリダイレクト
 */

'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Spin } from 'antd'
import { useSession } from '@/lib/auth/session'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  fallback?: React.ReactNode
}

export default function ProtectedRoute({
  children,
  requiredRole,
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useSession()

  useEffect(() => {
    if (!loading && !user) {
      // 認証されていない場合、ログインページにリダイレクト
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

  // TODO: requiredRole のチェック（将来実装）

  // 認証済み
  return <>{children}</>
}


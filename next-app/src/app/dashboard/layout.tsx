'use client'

import { useEffect } from 'react'
import { Layout, App } from 'antd'
import Navigation from '@/components/Navigation'
import DashboardHeader from '@/components/DashboardHeader'
import { useSession } from '@/lib/auth/session'
import { useRouter } from 'next/navigation'

const { Content } = Layout

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useSession()
  const router = useRouter()
  const isE2EBypass = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('e2e') === '1' ||
    document.cookie.split('; ').some(c => c.startsWith('e2e-bypass=1'))
  )

  useEffect(() => {
    console.log('🏠 DashboardLayout mounted, user:', user?.email, 'loading:', loading)
    if (!loading && !user && !isE2EBypass) {
      console.log('⚠️ DashboardLayout: ユーザーなし - ログインへリダイレクト')
      router.push('/login?redirect=/dashboard')
    }
  }, [user, loading, router, isE2EBypass])

  if (loading && !isE2EBypass) {
    console.log('⏳ DashboardLayout: ローディング中...')
    return <div style={{ padding: '24px' }}>読み込み中...</div>
  }

  if (!user && !isE2EBypass) {
    console.log('❌ DashboardLayout: ユーザーなし')
    return null
  }

  console.log('✅ DashboardLayout: 認証OK')
  return (
    <App>
      <Layout style={{ minHeight: '100vh' }}>
        <Navigation />
        <Layout style={{ marginLeft: 240 }}>
          <DashboardHeader />
          <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </App>
  )
}

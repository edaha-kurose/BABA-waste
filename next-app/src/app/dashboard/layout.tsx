'use client'

import { useEffect } from 'react'
import { Layout } from 'antd'
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

  useEffect(() => {
    console.log('🏠 DashboardLayout mounted, user:', user?.email, 'loading:', loading)
    if (!loading && !user) {
      console.log('⚠️ DashboardLayout: ユーザーなし - ログインへリダイレクト')
      router.push('/login?redirect=/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    console.log('⏳ DashboardLayout: ローディング中...')
    return <div style={{ padding: '24px' }}>読み込み中...</div>
  }

  if (!user) {
    console.log('❌ DashboardLayout: ユーザーなし')
    return null
  }

  console.log('✅ DashboardLayout: 認証OK')
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Navigation />
      <Layout style={{ marginLeft: 200 }}>
        <DashboardHeader />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

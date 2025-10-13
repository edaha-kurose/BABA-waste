import { Layout } from 'antd'
import Navigation from '@/components/Navigation'
import DashboardHeader from '@/components/DashboardHeader'

const { Content } = Layout

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

import { Layout, Menu } from 'antd'
import Link from 'next/link'
import {
  DashboardOutlined,
  TeamOutlined,
  ShopOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons'

const { Header, Sider, Content } = Layout

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">ダッシュボード</Link>,
    },
    {
      key: 'organizations',
      icon: <TeamOutlined />,
      label: <Link href="/dashboard/organizations">組織管理</Link>,
    },
    {
      key: 'stores',
      icon: <ShopOutlined />,
      label: <Link href="/dashboard/stores">店舗管理</Link>,
    },
    {
      key: 'plans',
      icon: <FileTextOutlined />,
      label: <Link href="/dashboard/plans">収集予定</Link>,
    },
    {
      key: 'collections',
      icon: <CheckCircleOutlined />,
      label: <Link href="/dashboard/collections">収集実績</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link href="/dashboard/settings">設定</Link>,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#001529',
          color: 'white',
          padding: '0 24px',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
          🗑️ BABA Waste
        </div>
      </Header>
      <Layout>
        <Sider
          width={200}
          style={{
            backgroundColor: '#fff',
            borderRight: '1px solid #f0f0f0',
          }}
        >
          <Menu
            mode="inline"
            defaultSelectedKeys={['dashboard']}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content
            style={{
              margin: 0,
              minHeight: 280,
              backgroundColor: '#fff',
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}


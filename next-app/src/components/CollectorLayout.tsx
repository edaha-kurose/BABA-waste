'use client'

/**
 * 収集業者用レイアウトコンポーネント
 * デスクトップ版CollectorLayoutから移植
 */

import { useState, useMemo } from 'react'
import { Layout, Menu, Button, Avatar, Space, Typography, Dropdown } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useRouter, usePathname } from 'next/navigation'
import type { MenuProps } from 'antd'
import { useUser } from '@/lib/auth/session'
import { createBrowserClient } from '@/lib/auth/supabase-browser'

const { Header, Sider, Content } = Layout
const { Text } = Typography

type MenuItem = Required<MenuProps>['items'][number]

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem
}

// 収集業者用メニュー定義
const collectorMenuItems: MenuItem[] = [
  getItem('ダッシュボード', '/collector/dashboard', <DashboardOutlined />),
  getItem('回収依頼一覧', '/collector/requests', <FileTextOutlined />),
  getItem('回収実績登録', '/collector/registration', <CheckCircleOutlined />),
  getItem('回収報告', '/collector/collections', <CheckCircleOutlined />),
  getItem('設定', '/collector/settings', <SettingOutlined />),
]

export default function CollectorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useUser()
  const supabase = createBrowserClient()

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    router.push(e.key)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/collector-login')
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'ログアウト',
      onClick: handleLogout,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* サイドバー */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        width={250}
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ 
          padding: '24px 16px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Text strong style={{ fontSize: collapsed ? 14 : 16 }}>
            {collapsed ? '収集' : '収集業者システム'}
          </Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={collectorMenuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
      </Sider>

      <Layout>
        {/* ヘッダー */}
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />

          <Space>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Button type="text">
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <Text>{user?.email || '収集業者'}</Text>
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Header>

        {/* メインコンテンツ */}
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}


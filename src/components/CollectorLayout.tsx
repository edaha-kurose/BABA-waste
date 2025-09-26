import React, { useState } from 'react'
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LogoutOutlined,
  UserOutlined,
  FileTextOutlined,
  PlusOutlined,
  SettingOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import type { User } from '@contracts/v0/schema'

const { Header, Sider, Content } = Layout
const { Title } = Typography

interface CollectorLayoutProps {
  collector: User
  onLogout: () => void
  children: React.ReactNode
}

interface MenuItem {
  key: string
  icon: React.ReactNode
  label: string
  path: string
}

const CollectorLayout: React.FC<CollectorLayoutProps> = ({ collector, onLogout, children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // メニュー項目の定義（システム管理者と統一）
  const menuItems = [
    {
      key: '/requests',
      icon: <FileTextOutlined />,
      label: '廃棄依頼一覧',
    },
    {
      key: '/collection-registration',
      icon: <PlusOutlined />,
      label: '回収情報登録',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '設定',
    },
  ]

  // 設定は統合されたページに遷移
  const settingsSubMenuItems = []

  // ユーザーメニュー（システム管理者と統一）
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'プロフィール',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'ログアウト',
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
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ textAlign: 'center', margin: 0 }}>
            {collapsed ? '収集業者' : '収集業者システム'}
          </Title>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
          onClick={({ key }) => {
            console.log('Menu clicked:', key)
            
            // ログアウトの場合は特別処理
            if (key === 'logout') {
              onLogout()
              return
            }
            
            navigate(key)
          }}
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
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {menuItems.find(item => item.key === location.pathname)?.label || 'ダッシュボード'}
            </Title>
          </div>

          <Space>
            {/* 明示的なログアウトボタン（ドロップダウンとは別に表示） */}
            <Button type="default" icon={<LogoutOutlined />} onClick={onLogout}>
              ログアウト
            </Button>
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: ({ key }) => {
                  console.log('User menu clicked:', key)
                  
                  // ログアウトの場合は特別処理
                  if (key === 'logout') {
                    onLogout()
                    return
                  }
                  
                  // その他のメニュー項目の処理
                  if (key === 'profile') {
                    // プロフィール画面への遷移など
                    console.log('Profile clicked')
                  }
                },
              }}
              placement="bottomRight"
              arrow
            >
              <Button type="text" style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <span style={{ marginLeft: 8 }}>{collector.company_name || '収集業者'}</span>
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

export default CollectorLayout

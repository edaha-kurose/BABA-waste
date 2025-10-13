'use client'

import { Layout, Avatar, Dropdown, Space, Typography } from 'antd'
import { UserOutlined, BellOutlined, SettingOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'

const { Header } = Layout
const { Text } = Typography

export default function DashboardHeader() {
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'プロフィール',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: '設定',
      icon: <SettingOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'ログアウト',
      danger: true,
    },
  ]

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div>
        <Text strong style={{ fontSize: 18 }}>
          廃棄物管理システム
        </Text>
      </div>

      <Space size="large">
        <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
        
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} />
            <Text>管理者</Text>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}


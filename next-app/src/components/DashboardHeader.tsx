'use client'

import { useRouter } from 'next/navigation'
import { Layout, Avatar, Dropdown, Space, Typography, Badge, message } from 'antd'
import { UserOutlined, BellOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useUser, logoutUser } from '@/lib/auth/session'
import { getRoleDisplayName } from '@/lib/auth/rbac'

const { Header } = Layout
const { Text } = Typography

export default function DashboardHeader() {
  const router = useRouter()
  const { user, userRole, userOrg, loading } = useUser()

  const handleMenuClick: MenuProps['onClick'] = async (e) => {
    if (e.key === 'logout') {
      try {
        await logoutUser()
        message.success('ログアウトしました')
        router.push('/login')
      } catch (error) {
        message.error('ログアウトに失敗しました')
      }
    } else if (e.key === 'profile') {
      router.push('/dashboard/profile')
    } else if (e.key === 'settings') {
      router.push('/dashboard/settings')
    }
  }

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
      icon: <LogoutOutlined />,
      danger: true,
    },
  ]

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー'
  const roleName = userRole ? getRoleDisplayName(userRole as any) : ''

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
        {userOrg && (
          <Text type="secondary" style={{ marginLeft: 12, fontSize: 14 }}>
            {userOrg.name}
          </Text>
        )}
      </div>

      <Space size="large">
        <Badge count={0} showZero={false}>
          <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
        </Badge>
        
        <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Text strong>{userName}</Text>
              {roleName && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {roleName}
                </Text>
              )}
            </div>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}


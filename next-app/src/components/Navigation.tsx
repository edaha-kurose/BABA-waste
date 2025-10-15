'use client'

import { useState, useMemo } from 'react'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  ShopOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloudServerOutlined,
  DollarOutlined,
  DatabaseOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import { useRouter, usePathname } from 'next/navigation'
import type { MenuProps } from 'antd'
import { useUser } from '@/lib/auth/session'
import { AppRole, hasPermission } from '@/types/auth'

const { Sider } = Layout

type MenuItem = Required<MenuProps>['items'][number]

interface MenuItemConfig {
  label: string
  key: string
  icon: React.ReactNode
  permission?: keyof typeof import('@/types/auth').ROLE_PERMISSIONS.ADMIN
}

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

// メニュー定義（権限チェック付き）
const allMenuItems: MenuItemConfig[] = [
  {
    label: 'ダッシュボード',
    key: '/dashboard',
    icon: <DashboardOutlined />,
    permission: 'canAccessDashboard',
  },
  {
    label: '組織管理',
    key: '/dashboard/organizations',
    icon: <TeamOutlined />,
    permission: 'canAccessOrganizations',
  },
  {
    label: '店舗管理',
    key: '/dashboard/stores',
    icon: <ShopOutlined />,
    permission: 'canAccessStores',
  },
  {
    label: '収集予定',
    key: '/dashboard/plans',
    icon: <CalendarOutlined />,
    permission: 'canAccessPlans',
  },
  {
    label: '収集依頼',
    key: '/dashboard/collection-requests',
    icon: <FileTextOutlined />,
    permission: 'canAccessCollections',
  },
  {
    label: '収集実績',
    key: '/dashboard/collections',
    icon: <CheckCircleOutlined />,
    permission: 'canAccessCollections',
  },
  {
    label: '請求管理',
    key: '/dashboard/billing',
    icon: <DollarOutlined />,
    permission: 'canAccessBilling',
  },
  {
    label: '廃棄物マスター',
    key: '/dashboard/waste-masters',
    icon: <DatabaseOutlined />,
    permission: 'canAccessSettings',
  },
  {
    label: '事業者組み合わせ',
    key: '/dashboard/jwnet-party-combinations',
    icon: <LinkOutlined />,
    permission: 'canAccessJwnet',
  },
  {
    label: 'JWNET 連携',
    key: '/dashboard/jwnet',
    icon: <CloudServerOutlined />,
    permission: 'canAccessJwnet',
  },
  {
    label: '設定',
    key: '/dashboard/settings',
    icon: <SettingOutlined />,
    permission: 'canAccessSettings',
  },
]

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { userRole } = useUser()

  // ロールに応じてメニューをフィルタリング
  const filteredMenuItems = useMemo(() => {
    return allMenuItems
      .filter((item) => {
        if (!item.permission) return true // 権限チェックなしのメニュー
        return hasPermission(userRole as AppRole, item.permission)
      })
      .map((item) => getItem(item.label, item.key, item.icon))
  }, [userRole])

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'logout') {
      // ログアウト処理
      router.push('/login')
    } else {
      router.push(e.key)
    }
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
      trigger={null}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div
        style={{
          height: 32,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        {!collapsed && 'BABA Waste'}
      </div>
      
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]}
        items={filteredMenuItems}
        onClick={handleMenuClick}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Menu
          theme="dark"
          mode="inline"
          items={[
            getItem('ログアウト', 'logout', <LogoutOutlined />),
          ]}
          onClick={handleMenuClick}
        />
      </div>
    </Sider>
  )
}


'use client'

import { useState } from 'react'
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

const { Sider } = Layout

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

const menuItems: MenuItem[] = [
  getItem('ダッシュボード', '/dashboard', <DashboardOutlined />),
  getItem('組織管理', '/dashboard/organizations', <TeamOutlined />),
  getItem('店舗管理', '/dashboard/stores', <ShopOutlined />),
  getItem('収集予定', '/dashboard/plans', <CalendarOutlined />),
  getItem('収集依頼', '/dashboard/collection-requests', <FileTextOutlined />),
  getItem('収集実績', '/dashboard/collections', <CheckCircleOutlined />),
  getItem('請求管理', '/dashboard/billing', <DollarOutlined />),
  getItem('廃棄物マスター', '/dashboard/waste-masters', <DatabaseOutlined />),
  getItem('事業者組み合わせ', '/dashboard/jwnet-party-combinations', <LinkOutlined />),
  getItem('JWNET 連携', '/dashboard/jwnet', <CloudServerOutlined />),
  getItem('設定', '/dashboard/settings', <SettingOutlined />),
]

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

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
        items={menuItems}
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


'use client'

import { useState, useMemo } from 'react'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  WarningOutlined,
  HistoryOutlined,
  ShopOutlined,
  SettingOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloudServerOutlined,
  LinkOutlined,
  UserOutlined,
  BookOutlined,
  MailOutlined,
} from '@ant-design/icons'
import { useRouter, usePathname } from 'next/navigation'
import type { MenuProps } from 'antd'
import { useUser } from '@/lib/auth/session'
import { AppRole, hasPermission } from '@/types/auth'

const { Sider } = Layout

type MenuItem = Required<MenuProps>['items'][number]

type PermissionKey = 
  | 'canAccessDashboard'
  | 'canAccessOrganizations'
  | 'canAccessUsers'
  | 'canAccessStores'
  | 'canAccessPlans'
  | 'canAccessCollections'
  | 'canAccessBilling'
  | 'canAccessReports'
  | 'canAccessSettings'
  | 'canAccessJwnet'

interface MenuItemConfig {
  label: string
  key: string
  icon: React.ReactNode
  permission: PermissionKey
  children?: MenuItemConfig[]
}

// 業務フロー順に整理されたメニュー構造
const allMenuItems: MenuItemConfig[] = [
  {
    label: 'ダッシュボード',
    key: '/dashboard',
    icon: <DashboardOutlined />,
    permission: 'canAccessDashboard',
  },
  {
    label: 'システムガイド',
    key: '/dashboard/system-guide',
    icon: <BookOutlined />,
    permission: 'canAccessDashboard',
  },
  {
    label: '廃棄物管理',
    key: 'waste-management',
    icon: <FileTextOutlined />,
    permission: 'canAccessPlans',
    children: [
      {
        label: '廃棄依頼一覧',
        key: '/dashboard/waste-requests',
        icon: <FileTextOutlined />,
        permission: 'canAccessPlans',
      },
      {
        label: '予定管理',
        key: '/dashboard/plans',
        icon: <FileTextOutlined />,
        permission: 'canAccessPlans',
      },
      {
        label: '回収情報登録',
        key: '/dashboard/collections',
        icon: <CheckCircleOutlined />,
        permission: 'canAccessCollections',
      },
      {
        label: '回収実績データ',
        key: '/dashboard/actuals',
        icon: <BarChartOutlined />,
        permission: 'canAccessReports',
      },
    ],
  },
  {
    label: '請求管理',
    key: '/dashboard/billing',
    icon: <FileTextOutlined />,
    permission: 'canAccessBilling',
  },
  {
    label: 'レポート・分析',
    key: 'reports',
    icon: <BarChartOutlined />,
    permission: 'canAccessReports',
    children: [
      {
        label: '回収レポート',
        key: '/dashboard/collection-report',
        icon: <BarChartOutlined />,
        permission: 'canAccessReports',
      },
      {
        label: '統計レポート',
        key: '/dashboard/reports',
        icon: <BarChartOutlined />,
        permission: 'canAccessReports',
      },
    ],
  },
  {
    label: 'JWNET連携',
    key: 'jwnet',
    icon: <LinkOutlined />,
    permission: 'canAccessJwnet',
    children: [
      {
        label: 'JWNET管理',
        key: '/dashboard/jwnet-management',
        icon: <DatabaseOutlined />,
        permission: 'canAccessJwnet',
      },
      {
        label: 'JWNET登録データ',
        key: '/dashboard/jwnet-registration-data',
        icon: <DatabaseOutlined />,
        permission: 'canAccessJwnet',
      },
      {
        label: '仮登録管理',
        key: '/dashboard/temp-registrations',
        icon: <WarningOutlined />,
        permission: 'canAccessJwnet',
      },
    ],
  },
  {
    label: '店舗・業者管理',
    key: 'store-collector',
    icon: <ShopOutlined />,
    permission: 'canAccessStores',
    children: [
      {
        label: '店舗管理',
        key: '/dashboard/stores',
        icon: <ShopOutlined />,
        permission: 'canAccessStores',
      },
      {
        label: '店舗品目業者マトリクス',
        key: '/dashboard/store-item-matrix',
        icon: <DatabaseOutlined />,
        permission: 'canAccessStores',
      },
      {
        label: '外部店舗管理',
        key: '/dashboard/external-stores',
        icon: <ShopOutlined />,
        permission: 'canAccessSettings',
      },
      {
        label: '収集業者管理',
        key: '/dashboard/collectors',
        icon: <CloudServerOutlined />,
        permission: 'canAccessSettings',
      },
      {
        label: '一斉ヒアリング管理',
        key: '/dashboard/mass-hearings',
        icon: <TeamOutlined />,
        permission: 'canAccessSettings',
      },
    ],
  },
  {
    label: 'システム管理',
    key: 'system',
    icon: <SettingOutlined />,
    permission: 'canAccessSettings',
    children: [
      {
        label: 'テナント管理',
        key: '/dashboard/organizations',
        icon: <TeamOutlined />,
        permission: 'canAccessOrganizations',
      },
      {
        label: 'ユーザー管理',
        key: '/dashboard/users',
        icon: <UserOutlined />,
        permission: 'canAccessUsers',
      },
      {
        label: 'テストデータ生成',
        key: '/dashboard/admin/seed-data',
        icon: <DatabaseOutlined />,
        permission: 'canAccessSettings',
      },
      {
        label: 'マスター管理',
        key: 'masters',
        icon: <DatabaseOutlined />,
        permission: 'canAccessSettings',
        children: [
          {
            label: '廃棄品目リスト',
            key: '/dashboard/item-maps',
            icon: <DatabaseOutlined />,
            permission: 'canAccessSettings',
          },
          {
            label: '廃棄物コードマスター',
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
        ],
      },
      {
        label: '取り込み履歴',
        key: '/dashboard/import',
        icon: <HistoryOutlined />,
        permission: 'canAccessSettings',
      },
      {
        label: 'メール送信履歴',
        key: '/dashboard/email-logs',
        icon: <MailOutlined />,
        permission: 'canAccessSettings',
      },
      {
        label: '収集業者請求一覧',
        key: '/dashboard/admin/collector-billings',
        icon: <FileTextOutlined />,
        permission: 'canAccessBilling',
      },
      {
        label: 'テナント請求書管理',
        key: '/dashboard/admin/tenant-invoices',
        icon: <BarChartOutlined />,
        permission: 'canAccessBilling',
      },
      {
        label: '設定',
        key: '/dashboard/settings',
        icon: <SettingOutlined />,
        permission: 'canAccessSettings',
      },
    ],
  },
]

// 収集業者専用メニュー
const collectorMenuItems: MenuItemConfig[] = [
  {
    label: 'ダッシュボード',
    key: '/dashboard',
    icon: <DashboardOutlined />,
    permission: 'canAccessDashboard',
  },
  {
    label: '収集予定',
    key: '/dashboard/collection-requests',
    icon: <FileTextOutlined />,
    permission: 'canAccessCollections',
  },
  {
    label: '収集登録',
    key: '/dashboard/collections',
    icon: <CheckCircleOutlined />,
    permission: 'canAccessCollections',
  },
  {
    label: '収集実績',
    key: '/dashboard/actuals',
    icon: <BarChartOutlined />,
    permission: 'canAccessReports',
  },
  {
    label: 'ヒアリング回答',
    key: '/dashboard/collector-hearings',
    icon: <TeamOutlined />,
    permission: 'canAccessCollections',
  },
  {
    label: '請求管理',
    key: '/dashboard/collector/billing',
    icon: <BarChartOutlined />,
    permission: 'canAccessBilling',
  },
  {
    label: '設定',
    key: '/dashboard/settings',
    icon: <SettingOutlined />,
    permission: 'canAccessSettings',
  },
]

export default function Navigation() {
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { userRole, loading } = useUser()

  // ロールに基づいてメニューアイテムをフィルタリング
  const filteredMenuItems = useMemo(() => {
    if (loading || !userRole) return []

    // 収集業者の場合は専用メニュー
    const menuSource = userRole === 'TRANSPORTER' ? collectorMenuItems : allMenuItems

    const filterItems = (items: MenuItemConfig[]): MenuItemConfig[] => {
      return items
        .filter((item) => hasPermission(userRole as AppRole, item.permission))
        .map((item) => {
          if (item.children) {
            const filteredChildren = filterItems(item.children)
            if (filteredChildren.length === 0) return null
            return { ...item, children: filteredChildren }
          }
          return item
        })
        .filter((item): item is MenuItemConfig => item !== null)
    }

    return filterItems(menuSource)
  }, [userRole, loading])

  // MenuItemConfigをAntdのMenuItemに変換
  const convertToMenuItem = (item: MenuItemConfig): MenuItem => {
    if (item.children) {
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: item.children.map(convertToMenuItem),
      }
    }
    return {
      key: item.key,
      icon: item.icon,
      label: item.label,
    }
  }

  const menuItems: MenuItem[] = filteredMenuItems.map(convertToMenuItem)

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    router.push(e.key)
  }

  // 現在のパスに基づいて選択されたキーを決定
  const selectedKeys = [pathname]

  // サブメニューが開いているべきかを決定
  const openKeys = useMemo(() => {
    const keys: string[] = []
    allMenuItems.forEach((item) => {
      if (item.children) {
        const isChildSelected = item.children.some((child) => child.key === pathname)
        if (isChildSelected) {
          keys.push(item.key)
        }
      }
    })
    return keys
  }, [pathname])

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
      }}
      theme="dark"
      width={240}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: 'white',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'linear-gradient(135deg, #1a3d2e 0%, #234d38 100%)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {collapsed ? (
          <div style={{ 
            fontSize: 28, 
            fontWeight: 'bold',
            color: '#52c41a',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            B
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ 
              fontSize: 22, 
              fontWeight: 'bold',
              letterSpacing: '2px',
              color: '#52c41a',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              BABAICHI
            </div>
            <div style={{ 
              fontSize: 11, 
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '1px'
            }}>
              廃棄物管理システム
            </div>
          </div>
        )}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={selectedKeys}
        defaultOpenKeys={openKeys}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
      />
    </Sider>
  )
}

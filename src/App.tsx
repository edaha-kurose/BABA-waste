// ============================================================================
// メインアプリケーションコンポーネント
// 作成日: 2025-09-16
// 目的: 廃棄物管理システムのメインアプリケーション
// ============================================================================

import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Avatar, Space, Typography, message } from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  WarningOutlined,
  HistoryOutlined,
  ShopOutlined,
  TeamOutlined
} from '@ant-design/icons'

// ページコンポーネント
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WasteRequestList from './pages/WasteRequestList'
import CollectionRegistration from './pages/CollectionRegistration'
import JwnetRegistrationData from './pages/JwnetRegistrationData'
import CollectionReport from './pages/CollectionReport'
import Settings from './pages/Settings'
import CollectorLogin from './pages/CollectorLogin'
import CollectorDashboard from './pages/CollectorDashboard'
import CollectorApp from './pages/CollectorApp'
import TempRegistrationManagement from './pages/TempRegistrationManagement'
import ImportHistory from './pages/ImportHistory'
import ManagedStores from './pages/ManagedStores'
import TestDataManagement from './pages/TestDataManagement'
import StoreCollectorAssignments from './pages/StoreCollectorAssignments'
import StoreManagement from './pages/StoreManagement'

// 認証関連
import { getCurrentUser, signOut } from '@/utils/supabase'

const { Header, Sider, Content } = Layout
const { Title } = Typography

// メニューアイテム
const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: 'ダッシュボード',
  },
  {
    key: '/waste-request-list',
    icon: <FileTextOutlined />,
    label: '廃棄依頼一覧',
  },
  {
    key: '/collection-registration',
    icon: <CheckCircleOutlined />,
    label: '回収情報登録',
  },
  {
    key: '/jwnet-registration-data',
    icon: <DatabaseOutlined />,
    label: 'JWNET登録データ',
  },
  {
    key: '/collection-report',
    icon: <BarChartOutlined />,
    label: '回収実績データ',
  },
  {
    key: '/temp-registration-management',
    icon: <WarningOutlined />,
    label: '仮登録管理',
  },
  {
    key: '/import-history',
    icon: <HistoryOutlined />,
    label: '取り込み履歴',
  },
  {
    key: '/store-management',
    icon: <ShopOutlined />,
    label: '店舗管理',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '設定',
  },
]

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentCollector, setCurrentCollector] = useState<any>(null)
  const [showCollectorLogin, setShowCollectorLogin] = useState(false)
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedKey, setSelectedKey] = useState(location.pathname)

  // 認証状態の確認
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication...')
        const user = await getCurrentUser()
        console.log('Current user:', user)
        setCurrentUser(user)
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        console.log('Setting loading to false')
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // ルート変更時のメニュー選択状態更新
  useEffect(() => {
    console.log('Location changed:', location.pathname)
    setSelectedKey(location.pathname)
  }, [location.pathname])

  // ログアウト処理
  const handleLogout = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        message.error('ログアウトに失敗しました')
        return
      }
      
      setCurrentUser(null)
      setCurrentCollector(null)
      message.success('ログアウトしました')
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      message.error('ログアウトに失敗しました')
    }
  }

  // 収集業者ログイン成功処理
  const handleCollectorLogin = (collector: any) => {
    setCurrentCollector(collector)
    setCurrentUser(null)
    message.success(`${collector.company_name} としてログインしました`)
  }

  // 収集業者ログアウト処理
  const handleCollectorLogout = () => {
    setCurrentCollector(null)
    message.success('ログアウトしました')
  }

  // 管理者ログインに戻る
  const handleBackToAdmin = () => {
    setCurrentCollector(null)
    setCurrentUser(null)
    setShowCollectorLogin(false)
  }

  // 収集業者ログイン画面を表示
  const handleShowCollectorLogin = () => {
    setShowCollectorLogin(true)
  }

  // ユーザーメニュー
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'プロフィール',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '設定',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'ログアウト',
      onClick: handleLogout,
    },
  ]

  // ローディング中
  if (loading) {
    console.log('Showing loading screen')
    return (
      <div className="center" style={{ height: '100vh' }}>
        <div className="loading-lg"></div>
        <span className="ml-2">読み込み中...</span>
      </div>
    )
  }

  // 収集業者ログインの場合
  if (currentCollector) {
    return <CollectorApp collector={currentCollector} onLogout={handleCollectorLogout} />
  }

  // 収集業者ログイン画面を表示
  if (showCollectorLogin) {
    return <CollectorLogin onLoginSuccess={handleCollectorLogin} onBackToAdmin={handleBackToAdmin} />
  }

  // 未認証の場合
  if (!currentUser) {
    console.log('No current user, showing login')
    return <Login onLoginSuccess={setCurrentUser} onShowCollectorLogin={handleShowCollectorLogin} />
  }

  console.log('Current user:', currentUser)
  console.log('Selected key:', selectedKey)
  console.log('Location:', location.pathname)

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
        <div className="p-4 border-b">
          <Title level={4} className="text-center mb-0">
            {collapsed ? '廃棄物' : '廃棄物管理システム'}
          </Title>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => {
            console.log('Menu clicked:', key)
            setSelectedKey(key)
            
            // ログアウトの場合は特別処理
            if (key === 'logout') {
              handleLogout()
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
            <Title level={3} className="mb-0">
              {menuItems.find(item => item.key === selectedKey)?.label || 'ダッシュボード'}
            </Title>
          </div>

          <Space>
            <Button onClick={handleLogout} icon={<LogoutOutlined />}>ログアウト</Button>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Button type="text" className="flex items-center">
                <Avatar size="small" icon={<UserOutlined />} />
                <span className="ml-2">{currentUser.email || 'ユーザー'}</span>
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
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/waste-request-list" element={<WasteRequestList />} />
            <Route path="/collection-registration" element={<CollectionRegistration />} />
            <Route path="/jwnet-registration-data" element={<JwnetRegistrationData />} />
            <Route path="/collection-report" element={<CollectionReport />} />
            <Route path="/temp-registration-management" element={<TempRegistrationManagement />} />
            <Route path="/import-history" element={<ImportHistory />} />
            <Route path="/managed-stores" element={<ManagedStores />} />
            <Route path="/store-collector-assignments" element={<StoreCollectorAssignments />} />
            <Route path="/store-management" element={<StoreManagement />} />
            <Route path="/test-data-management" element={<TestDataManagement />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App

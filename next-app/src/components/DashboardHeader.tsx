'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Layout, Avatar, Dropdown, Space, Typography, Badge, message, Tag, Select, Spin } from 'antd'
import { UserOutlined, BellOutlined, SettingOutlined, LogoutOutlined, BankOutlined, SwapOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useUser, logoutUser } from '@/lib/auth/session'
import { getRoleDisplayName } from '@/lib/auth/rbac'

const { Header } = Layout
const { Text } = Typography

interface TenantInfo {
  id: string
  name: string
  code: string
  org_type: string
}

export default function DashboardHeader() {
  const router = useRouter()
  const { user, userRole, userOrg, loading } = useUser()
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null)
  const [tenants, setTenants] = useState<TenantInfo[]>([])
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [tenantsLoading, setTenantsLoading] = useState(false)

  // システム管理者かどうかを判定 & テナント一覧取得
  useEffect(() => {
    const fetchTenants = async () => {
      setTenantsLoading(true)
      try {
        const response = await fetch('/api/organizations/managed-tenants')
        if (response.ok && response.status === 200) {
          const data = await response.json()
          setIsSystemAdmin(true)
          setTenants(data.data || [])

          // セッションストレージから復元
          const savedOrgId = sessionStorage.getItem('selected_org_id')
          if (savedOrgId && data.data.some((t: TenantInfo) => t.id === savedOrgId)) {
            const tenant = data.data.find((t: TenantInfo) => t.id === savedOrgId)
            setSelectedTenant(tenant)
          } else if (data.data.length > 0) {
            // デフォルト選択
            setSelectedTenant(data.data[0])
            sessionStorage.setItem('selected_org_id', data.data[0].id)
          }
        } else {
          setIsSystemAdmin(false)
        }
      } catch (error) {
        console.error('[DashboardHeader] テナント取得エラー:', error)
        setIsSystemAdmin(false)
      } finally {
        setTenantsLoading(false)
      }
    }
    fetchTenants()
  }, [])

  // テナント切り替えハンドラ
  const handleTenantChange = (orgId: string) => {
    const tenant = tenants.find(t => t.id === orgId)
    if (tenant) {
      setSelectedTenant(tenant)
      sessionStorage.setItem('selected_org_id', orgId)
      
      // イベントを発火して他のコンポーネントに通知
      window.dispatchEvent(
        new CustomEvent('tenant-changed', { detail: { orgId } })
      )
      
      message.success(`管理対象を「${tenant.name}」に切り替えました`)
      
      // ページリロードして最新データを取得
      router.refresh()
    }
  }

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
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fdf9 100%)',
        padding: '0 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #e8f5e9',
        boxShadow: '0 2px 12px rgba(45, 134, 89, 0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text strong style={{ 
            fontSize: 20, 
            color: '#2d8659',
            letterSpacing: '0.5px',
            lineHeight: '1.2'
          }}>
            BABAICHI 廃棄物管理
          </Text>
          <Text style={{ 
            fontSize: 11, 
            color: '#666',
            letterSpacing: '1px'
          }}>
            循環型社会の実現
          </Text>
        </div>

        {isSystemAdmin ? (
          <>
            <div style={{ 
              width: '2px', 
              height: '40px', 
              background: 'linear-gradient(180deg, #2d8659 0%, #52c41a 100%)',
              borderRadius: '1px'
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color="blue" icon={<BankOutlined />} style={{ margin: 0, fontSize: 11 }}>
                  システム管理
                </Tag>
                <Text strong style={{ fontSize: 13, color: '#333' }}>
                  BABA株式会社
                </Text>
              </div>
              {tenantsLoading ? (
                <Spin size="small" />
              ) : tenants.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SwapOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                  <Select
                    value={selectedTenant?.id}
                    onChange={handleTenantChange}
                    style={{ width: 280 }}
                    size="small"
                    options={tenants.map(t => ({
                      label: `${t.name} (${t.code})`,
                      value: t.id,
                    }))}
                    placeholder="テナントを選択"
                  />
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  管理対象テナントなし
                </Text>
              )}
            </div>
          </>
        ) : userOrg && (
          <>
            <div style={{ 
              width: '2px', 
              height: '32px', 
              background: 'linear-gradient(180deg, #2d8659 0%, #52c41a 100%)',
              borderRadius: '1px'
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Text strong style={{ fontSize: 15, color: '#333' }}>
                {userOrg.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {userOrg.code}
              </Text>
            </div>
          </>
        )}
      </div>

      <Space size="large">
        <Badge count={0} showZero={false}>
          <BellOutlined style={{ 
            fontSize: 20, 
            cursor: 'pointer',
            color: '#2d8659',
            transition: 'all 0.3s'
          }} />
        </Badge>
        
        <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar 
              icon={<UserOutlined />} 
              style={{ 
                backgroundColor: '#2d8659',
                boxShadow: '0 2px 8px rgba(45, 134, 89, 0.3)'
              }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Text strong style={{ color: '#333' }}>{userName}</Text>
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


'use client'

import { useState, useEffect } from 'react'
import { Select, Spin, Card } from 'antd'
import { BankOutlined } from '@ant-design/icons'

interface Tenant {
  id: string
  name: string
  code: string
}

interface TenantSelectorProps {
  onTenantChange?: (orgId: string) => void
}

export function TenantSelector({ onTenantChange }: TenantSelectorProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [isCollector, setIsCollector] = useState(false)

  useEffect(() => {
    checkTenants()
  }, [])

  const checkTenants = async () => {
    setLoading(true)
    try {
      console.log('[TenantSelector] テナント一覧取得開始...')
      
      // まずシステム管理者用APIを試す
      let response = await fetch('/api/organizations/managed-tenants')
      
      console.log('[TenantSelector] システム管理者API:', {
        status: response.status,
        ok: response.ok,
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('[TenantSelector] システム管理者テナント一覧取得成功:', {
          count: data.data?.length,
          tenants: data.data,
        })
        
        setTenants(data.data || [])
        setIsSystemAdmin(true)
        setIsCollector(false)
        
        // デフォルト選択（セッションストレージから復元）
        const saved = sessionStorage.getItem('selected_org_id')
        if (saved && data.data.some((t: Tenant) => t.id === saved)) {
          console.log('[TenantSelector] セッションから復元:', saved)
          setSelectedOrgId(saved)
          onTenantChange?.(saved)
        } else if (data.data.length > 0) {
          console.log('[TenantSelector] デフォルト選択:', data.data[0].id)
          setSelectedOrgId(data.data[0].id)
          sessionStorage.setItem('selected_org_id', data.data[0].id)
          onTenantChange?.(data.data[0].id)
        } else {
          console.warn('[TenantSelector] テナント一覧が空です')
        }
        return
      }
      
      // システム管理者でない場合、収集業者用APIを試す
      if (response.status === 403) {
        console.log('[TenantSelector] 収集業者用API試行...')
        response = await fetch('/api/collectors/client-organizations')
        
        console.log('[TenantSelector] 収集業者API:', {
          status: response.status,
          ok: response.ok,
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('[TenantSelector] 収集業者クライアント一覧取得成功:', {
            count: data.data?.length,
            clients: data.data,
          })
          
          setTenants(data.data || [])
          setIsSystemAdmin(false)
          setIsCollector(true)
          
          // デフォルト選択（セッションストレージから復元）
          const saved = sessionStorage.getItem('selected_org_id')
          if (saved && data.data.some((t: Tenant) => t.id === saved)) {
            console.log('[TenantSelector] セッションから復元:', saved)
            setSelectedOrgId(saved)
            onTenantChange?.(saved)
          } else if (data.data.length > 0) {
            console.log('[TenantSelector] デフォルト選択:', data.data[0].id)
            setSelectedOrgId(data.data[0].id)
            sessionStorage.setItem('selected_org_id', data.data[0].id)
            onTenantChange?.(data.data[0].id)
          } else {
            console.warn('[TenantSelector] クライアント一覧が空です')
          }
          return
        }
      }
      
      // どちらのAPIも失敗した場合
      console.log('[TenantSelector] テナント切り替え機能は利用できません')
      setIsSystemAdmin(false)
      setIsCollector(false)
    } catch (error) {
      console.error('[TenantSelector] 例外エラー:', error)
      setIsSystemAdmin(false)
      setIsCollector(false)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (orgId: string) => {
    setSelectedOrgId(orgId)
    sessionStorage.setItem('selected_org_id', orgId)
    
    // 親コンポーネントに通知
    onTenantChange?.(orgId)
    
    // イベントを発火して他のコンポーネントに通知
    window.dispatchEvent(
      new CustomEvent('tenant-changed', { detail: { orgId } })
    )
  }

  if (!isSystemAdmin && !isCollector) {
    return null
  }

  const label = isSystemAdmin ? '管理対象テナント:' : '取引先企業:'
  const backgroundColor = isSystemAdmin ? '#f0f5ff' : '#fff1f0'
  const borderColor = isSystemAdmin ? '#adc6ff' : '#ffccc7'
  const iconColor = isSystemAdmin ? '#1890ff' : '#cf1322'

  return (
    <Card 
      size="small" 
      style={{ 
        marginBottom: 16,
        backgroundColor,
        borderColor,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BankOutlined style={{ fontSize: 18, color: iconColor }} />
        <span style={{ fontWeight: 500, color: iconColor }}>
          {label}
        </span>
        {loading ? (
          <Spin size="small" />
        ) : (
          <Select
            style={{ width: 300 }}
            value={selectedOrgId}
            onChange={handleChange}
            options={tenants.map(t => ({
              label: `${t.name} (${t.code})`,
              value: t.id,
            }))}
            placeholder={isSystemAdmin ? 'テナントを選択してください' : '取引先を選択してください'}
          />
        )}
      </div>
    </Card>
  )
}

// カスタムフック: 選択中のテナントIDを取得
export function useSelectedTenant(): string | null {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  useEffect(() => {
    // 初期値をセッションストレージから取得
    const saved = sessionStorage.getItem('selected_org_id')
    if (saved) {
      setSelectedOrgId(saved)
    }

    // tenant-changed イベントを監視
    const handleTenantChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ orgId: string }>
      setSelectedOrgId(customEvent.detail.orgId)
    }

    window.addEventListener('tenant-changed', handleTenantChange)

    return () => {
      window.removeEventListener('tenant-changed', handleTenantChange)
    }
  }, [])

  return selectedOrgId
}


'use client'

/**
 * システムガイドページ
 * - ロールに応じたガイドを表示
 * - システム管理者: タブで両方のガイドを表示
 * - 収集業者: セットアップガイドのみ表示
 */

import { useState, useEffect } from 'react'
import { Card, Tabs, Spin, Alert } from 'antd'
import type { TabsProps } from 'antd'
import { BookOutlined, SettingOutlined, CheckSquareOutlined } from '@ant-design/icons'
import { SystemGuideForAdmin } from '@/components/SystemGuideForAdmin'
import { SystemGuideForCollector } from '@/components/SystemGuideForCollector'
import { useSelectedTenant } from '@/components/TenantSelector'
import { useUser } from '@/lib/auth/session'

export default function SystemGuidePage() {
  const { user, userOrg } = useUser()
  const selectedTenantId = useSelectedTenant()
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // ページタイトル設定
  useEffect(() => {
    document.title = 'システムガイド - BABA 廃棄物管理システム'
  }, [])

  // システム管理者判定
  useEffect(() => {
    const checkSystemAdmin = async () => {
      try {
        const response = await fetch('/api/dashboard/validation-status')
        if (response.ok) {
          const data = await response.json()
          setIsSystemAdmin(data.meta?.is_system_admin || false)
        }
      } catch (error) {
        console.error('Failed to check system admin status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSystemAdmin()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Spin tip="読み込み中..." size="large">
            <div style={{ padding: 50 }} />
          </Spin>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>
        <BookOutlined /> システムガイド
      </h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        システムのセットアップ状況を確認し、必要な設定を完了してください
      </p>

      {isSystemAdmin ? (
        // システム管理者: タブで両方のガイドを表示
        <Tabs
          defaultActiveKey="admin"
          size="large"
          items={[
            {
              key: 'admin',
              label: (
                <span>
                  <SettingOutlined />
                  システム管理会社
                </span>
              ),
              children: <SystemGuideForAdmin orgId={selectedTenantId} />,
            },
            {
              key: 'collector',
              label: (
                <span>
                  <CheckSquareOutlined />
                  収集業者
                </span>
              ),
              children: (
                <>
                  <Alert
                    message="💡 ヒント"
                    description="このタブは収集業者向けのセットアップガイドです。管理対象の収集業者に案内する内容を確認できます。"
                    type="info"
                    showIcon
                    closable
                    style={{ marginBottom: 16 }}
                  />
                  <SystemGuideForCollector />
                </>
              ),
            },
          ]}
        />
      ) : (
        // 収集業者: セットアップガイドのみ表示
        <SystemGuideForCollector />
      )}
    </div>
  )
}

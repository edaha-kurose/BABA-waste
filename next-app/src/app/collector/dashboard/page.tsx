'use client'

/**
 * 収集業者ダッシュボード
 * デスクトップ版CollectorDashboardから移植
 */

import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Spin, Alert, Typography } from 'antd'
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  TruckOutlined,
} from '@ant-design/icons'
import CollectorLayout from '@/components/CollectorLayout'

const { Title, Text } = Typography

interface CollectorStats {
  pendingRequests: number
  todayCollections: number
  weekCollections: number
  monthCollections: number
}

export default function CollectorDashboardPage() {
  const [stats, setStats] = useState<CollectorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/collector/stats')
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'データの取得に失敗しました')
        }

        const data = await response.json()
        setStats(data)
      } catch (err) {
        console.error('[CollectorDashboard] Error:', err)
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <CollectorLayout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Spin size="large" tip="読み込み中..." />
        </div>
      </CollectorLayout>
    )
  }

  if (error) {
    return (
      <CollectorLayout>
        <Alert
          message="エラー"
          description={error}
          type="error"
          showIcon
        />
      </CollectorLayout>
    )
  }

  return (
    <CollectorLayout>
      <Title level={2}>ダッシュボード</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        収集業務の状況を確認できます
      </Text>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="未対応の依頼"
              value={stats?.pendingRequests ?? 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本日の回収予定"
              value={stats?.todayCollections ?? 0}
              prefix={<TruckOutlined />}
              valueStyle={{ color: '#1890ff' }}
              suffix="件"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今週の回収実績"
              value={stats?.weekCollections ?? 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix="件"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今月の回収実績"
              value={stats?.monthCollections ?? 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#13c2c2' }}
              suffix="件"
            />
          </Card>
        </Col>
      </Row>

      {/* TODO: 今後、グラフや詳細情報を追加 */}
    </CollectorLayout>
  )
}





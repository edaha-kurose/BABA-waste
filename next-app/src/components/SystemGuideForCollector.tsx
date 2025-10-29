'use client'

import { useState, useEffect } from 'react'
import { Card, Alert, List, Badge, Button, Spin, Space, Typography, Progress } from 'antd'
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  LinkOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'

const { Text, Title } = Typography

interface ValidationStatus {
  waste_type_masters: {
    status: 'complete' | 'incomplete'
    total: number
    missing: number
    details: Array<{
      collector_id: string
      collector_name: string
      count: number
      items: Array<{
        id: string
        waste_type_name: string
        waste_type_code: string
      }>
    }>
  }
  store_matrix: {
    status: 'complete' | 'incomplete'
    total: number
    missing: number
  }
}

export function SystemGuideForCollector() {
  const router = useRouter()
  const [status, setStatus] = useState<ValidationStatus | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchValidationStatus()
  }, [])

  const fetchValidationStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dashboard/validation-status')
      const data = await response.json()
      setStatus(data.data)
    } catch (error) {
      console.error('Failed to fetch validation status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <Spin tip="設定状況を確認中...">
          <div style={{ padding: 50 }} />
        </Spin>
      </Card>
    )
  }

  if (!status) return null

  // 完了率を計算
  const completedTasks = [
    status.waste_type_masters.status === 'complete',
    status.store_matrix.status === 'complete',
  ].filter(Boolean).length

  const totalTasks = 2
  const completionRate = Math.round((completedTasks / totalTasks) * 100)

  const myCollectorData = status.waste_type_masters.details[0] // 自社のデータのみ

  return (
    <Card 
      title={
        <Space>
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
          <span>📋 設定チェックリスト</span>
        </Space>
      }
    >
      {/* 完了率表示 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={5}>設定完了率</Title>
        <Progress 
          percent={completionRate} 
          status={completionRate === 100 ? 'success' : 'active'}
          strokeColor={completionRate === 100 ? '#52c41a' : '#1890ff'}
        />
        <Text type="secondary">
          {completedTasks} / {totalTasks} 項目完了
        </Text>
      </div>

      {/* タスクリスト */}
      <List
        size="large"
        dataSource={[
          {
            id: 'waste_type_masters',
            title: '廃棄物単価設定',
            status: status.waste_type_masters.status,
            description: status.waste_type_masters.status === 'complete'
              ? `✅ 全ての品目に単価が設定されています（${status.waste_type_masters.total}品目）`
              : `⚠️ ${myCollectorData?.count || 0}品目の単価が未設定です`,
            action: status.waste_type_masters.status === 'incomplete' && (
              <Button 
                type="primary"
                icon={<LinkOutlined />}
                onClick={() => router.push('/dashboard/waste-masters')}
              >
                単価を設定する
              </Button>
            ),
            details: status.waste_type_masters.status === 'incomplete' && myCollectorData ? (
              <List
                size="small"
                dataSource={myCollectorData.items}
                renderItem={item => (
                  <List.Item>
                    <Text type="secondary">
                      • {item.waste_type_name} ({item.waste_type_code})
                    </Text>
                  </List.Item>
                )}
                style={{ marginTop: 8 }}
              />
            ) : null,
          },
          {
            id: 'store_matrix',
            title: '店舗別収集設定',
            status: status.store_matrix.status,
            description: status.store_matrix.status === 'complete'
              ? `✅ 全ての店舗で収集業者が割り当てられています（${status.store_matrix.total}店舗）`
              : `⚠️ ${status.store_matrix.missing}店舗で設定が未完了です`,
            action: status.store_matrix.status === 'incomplete' && (
              <Button 
                type="primary"
                icon={<LinkOutlined />}
                onClick={() => router.push('/dashboard/store-collector-assignments')}
              >
                店舗設定を確認する
              </Button>
            ),
            details: null,
          },
        ]}
        renderItem={item => (
          <List.Item
            extra={
              item.status === 'complete' ? (
                <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              ) : (
                <ClockCircleOutlined style={{ fontSize: 24, color: '#faad14' }} />
              )
            }
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>{item.title}</Text>
                  {item.status === 'incomplete' && (
                    <Badge status="warning" text="未完了" />
                  )}
                </Space>
              }
              description={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text>{item.description}</Text>
                  {item.details}
                  {item.action && <div style={{ marginTop: 8 }}>{item.action}</div>}
                </Space>
              }
            />
          </List.Item>
        )}
      />

      {/* 完了メッセージ */}
      {completionRate === 100 ? (
        <Alert
          message="✅ 全ての設定が完了しています"
          description="請求処理を開始できます。月末の回収実績登録を忘れずに行ってください。"
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      ) : (
        <Alert
          message="💡 設定を完了してください"
          description="未設定のまま月末を迎えると請求が生成できません。早めに設定をお願いします。"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  )
}




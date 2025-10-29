'use client'

import { useState, useEffect } from 'react'
import { Card, Alert, List, Badge, Button, Spin, Collapse, Space, Typography } from 'antd'
import { 
  WarningOutlined, 
  CheckCircleOutlined, 
  LinkOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'

const { Text } = Typography
const { Panel } = Collapse

interface ValidationStatus {
  collectors: {
    status: 'complete' | 'incomplete'
    count: number
  }
  stores: {
    status: 'complete' | 'incomplete'
    count: number
  }
  item_maps: {
    status: 'complete' | 'incomplete'
    count: number
  }
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
    details: Array<{
      store_id: string
      store_name: string
      total_items: number
      assigned_items: number
      missing_items: number
      link: string
    }>
  }
}

interface SystemGuideForAdminProps {
  orgId: string | null
}

export function SystemGuideForAdmin({ orgId }: SystemGuideForAdminProps) {
  const router = useRouter()
  const [status, setStatus] = useState<ValidationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)

  useEffect(() => {
    if (orgId) {
      fetchValidationStatus()
    }
  }, [orgId])

  const fetchValidationStatus = async () => {
    if (!orgId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/validation-status?org_id=${orgId}`)
      const data = await response.json()
      setStatus(data.data)
      setIsSystemAdmin(data.meta?.is_system_admin || false)
    } catch (error) {
      console.error('Failed to fetch validation status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!orgId) {
    return (
      <Card>
        <Alert
          message="テナントを選択してください"
          description="管理対象のテナントを選択すると、設定状況が表示されます。"
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Card>
    )
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

  const hasIncompleteItems = 
    status.collectors.status === 'incomplete' ||
    status.stores.status === 'incomplete' ||
    status.item_maps.status === 'incomplete' ||
    status.waste_type_masters.status === 'incomplete' ||
    status.store_matrix.status === 'incomplete'

  return (
    <Card 
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: hasIncompleteItems ? '#faad14' : '#52c41a' }} />
          <span>📊 テナント管理ダッシュボード</span>
        </Space>
      }
    >
      {hasIncompleteItems && (
        <Alert
          message="⚠️ 未完了の設定項目があります"
          description="以下の項目を確認し、必要に応じて収集業者に設定を依頼してください。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      <Collapse defaultActiveKey={hasIncompleteItems ? ['incomplete'] : []}>
        <Panel 
          header={
            <Space>
              {status.collectors.status === 'complete' ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <WarningOutlined style={{ color: '#faad14' }} />
              )}
              <span>① 収集業者マスター</span>
              <Badge 
                count={status.collectors.count} 
                style={{ backgroundColor: status.collectors.status === 'complete' ? '#52c41a' : '#faad14' }}
              />
            </Space>
          } 
          key="collectors"
        >
          {status.collectors.status === 'complete' ? (
            <Text type="success">✅ {status.collectors.count}社登録済み</Text>
          ) : (
            <Alert
              message="収集業者が未登録です"
              type="warning"
              showIcon
            />
          )}
        </Panel>

        <Panel 
          header={
            <Space>
              {status.stores.status === 'complete' ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <WarningOutlined style={{ color: '#faad14' }} />
              )}
              <span>② 店舗マスター</span>
              <Badge 
                count={status.stores.count} 
                style={{ backgroundColor: status.stores.status === 'complete' ? '#52c41a' : '#faad14' }}
              />
            </Space>
          } 
          key="stores"
        >
          {status.stores.status === 'complete' ? (
            <Text type="success">✅ {status.stores.count}店舗登録済み</Text>
          ) : (
            <Alert
              message="店舗が未登録です"
              type="warning"
              showIcon
            />
          )}
        </Panel>

        <Panel 
          header={
            <Space>
              {status.item_maps.status === 'complete' ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <WarningOutlined style={{ color: '#faad14' }} />
              )}
              <span>③ 廃棄品目リスト</span>
              <Badge 
                count={status.item_maps.count} 
                style={{ backgroundColor: status.item_maps.status === 'complete' ? '#52c41a' : '#faad14' }}
              />
            </Space>
          } 
          key="item_maps"
        >
          {status.item_maps.status === 'complete' ? (
            <Text type="success">✅ {status.item_maps.count}品目登録済み</Text>
          ) : (
            <Alert
              message="廃棄品目が未登録です"
              type="warning"
              showIcon
            />
          )}
        </Panel>

        <Panel 
          header={
            <Space>
              {status.waste_type_masters.status === 'complete' ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <WarningOutlined style={{ color: '#faad14' }} />
              )}
              <span>④ 廃棄物単価設定</span>
              {status.waste_type_masters.missing > 0 && (
                <Badge 
                  count={`${status.waste_type_masters.missing}件未設定`} 
                  style={{ backgroundColor: '#ff4d4f' }}
                />
              )}
            </Space>
          } 
          key="waste_type_masters"
        >
          {status.waste_type_masters.status === 'complete' ? (
            <Text type="success">✅ 全て設定済み（{status.waste_type_masters.total}件）</Text>
          ) : (
            <Alert
              message={`⚠️ ${status.waste_type_masters.missing}件の単価が未設定です`}
              description={
                <List
                  size="small"
                  dataSource={status.waste_type_masters.details}
                  renderItem={item => (
                    <List.Item>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>{item.collector_name}</Text>
                        <Text type="secondary">{item.count}品目が単価未設定</Text>
                        <Button 
                          type="link" 
                          size="small"
                          icon={<LinkOutlined />}
                          onClick={() => router.push(`/dashboard/waste-masters?from=dashboard&issue=price&collector_id=${item.collector_id}`)}
                        >
                          単価設定画面へ
                        </Button>
                      </Space>
                    </List.Item>
                  )}
                />
              }
              type="warning"
              showIcon
            />
          )}
        </Panel>

        <Panel 
          header={
            <Space>
              {status.store_matrix.status === 'complete' ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <WarningOutlined style={{ color: '#faad14' }} />
              )}
              <span>⑤ 店舗×品目×業者マトリクス</span>
              {status.store_matrix.missing > 0 && (
                <Badge 
                  count={`${status.store_matrix.missing}店舗未設定`} 
                  style={{ backgroundColor: '#ff4d4f' }}
                />
              )}
            </Space>
          } 
          key="store_matrix"
        >
          {status.store_matrix.status === 'complete' ? (
            <Text type="success">✅ 全店舗設定済み（{status.store_matrix.total}店舗）</Text>
          ) : (
            <Alert
              message={`⚠️ ${status.store_matrix.missing}店舗で設定が未完了です`}
              description={
                <List
                  size="small"
                  dataSource={status.store_matrix.details}
                  renderItem={item => (
                    <List.Item>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text strong>{item.store_name}</Text>
                        <Text type="secondary">
                          {item.missing_items}品目が未割当（{item.assigned_items}/{item.total_items}品目割当済み）
                        </Text>
                        <Button 
                          type="link" 
                          size="small"
                          icon={<LinkOutlined />}
                          onClick={() => router.push(item.link)}
                        >
                          マトリクス設定画面へ
                        </Button>
                      </Space>
                    </List.Item>
                  )}
                />
              }
              type="warning"
              showIcon
            />
          )}
        </Panel>
      </Collapse>

      {!hasIncompleteItems && (
        <Alert
          message="✅ 全ての設定が完了しています"
          description="このテナントは請求処理を開始できます。"
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Card>
  )
}


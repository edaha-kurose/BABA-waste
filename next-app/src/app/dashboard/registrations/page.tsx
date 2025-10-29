'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Descriptions,
  Typography,
  Alert,
  Progress,
  Tooltip,
} from 'antd'
import {
  FileTextOutlined,
  EyeOutlined,
  ReloadOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'

const { Title, Text } = Typography

interface Registration {
  id: string
  org_id: string
  plan_id: string
  manifest_no?: string
  status: 'PENDING' | 'REGISTERED' | 'FAILED' | 'ERROR'
  error_code?: string
  last_sent_at?: string
  created_at: string
  plan?: {
    id: string
    planned_date: string
    planned_qty: number
    unit: string
    stores?: {
      name: string
      store_code: string
    }
    item_maps?: {
      item_label: string
      jwnet_code: string
    }
  }
}

export default function RegistrationsPage() {
  const { userOrg } = useUser()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  // データ取得
  const fetchRegistrations = async () => {
    if (!userOrg?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // モックデータ
      const mockData: Registration[] = [
        {
          id: '1',
          org_id: userOrg.id,
          plan_id: 'plan-1',
          manifest_no: 'MF-2025-10-001',
          status: 'REGISTERED',
          last_sent_at: '2025-10-16T10:00:00Z',
          created_at: '2025-10-16T09:00:00Z',
          plan: {
            id: 'plan-1',
            planned_date: '2025-10-20',
            planned_qty: 2.5,
            unit: 'T',
            stores: {
              name: '本店',
              store_code: 'ST001',
            },
            item_maps: {
              item_label: '混合廃棄物',
              jwnet_code: 'W0101',
            },
          },
        },
        {
          id: '2',
          org_id: userOrg.id,
          plan_id: 'plan-2',
          status: 'PENDING',
          created_at: '2025-10-15T10:00:00Z',
          plan: {
            id: 'plan-2',
            planned_date: '2025-10-22',
            planned_qty: 1.2,
            unit: 'T',
            stores: {
              name: '支店A',
              store_code: 'ST002',
            },
            item_maps: {
              item_label: '蛍光灯',
              jwnet_code: 'W0202',
            },
          },
        },
        {
          id: '3',
          org_id: userOrg.id,
          plan_id: 'plan-3',
          manifest_no: 'MF-2025-10-003',
          status: 'REGISTERED',
          last_sent_at: '2025-10-14T09:00:00Z',
          created_at: '2025-10-14T08:00:00Z',
          plan: {
            id: 'plan-3',
            planned_date: '2025-10-18',
            planned_qty: 3.0,
            unit: 'T',
            stores: {
              name: '支店B',
              store_code: 'ST003',
            },
            item_maps: {
              item_label: '産業廃棄物',
              jwnet_code: 'W0303',
            },
          },
        },
        {
          id: '4',
          org_id: userOrg.id,
          plan_id: 'plan-4',
          status: 'ERROR',
          error_code: 'JWNET_API_ERROR',
          last_sent_at: '2025-10-13T10:00:00Z',
          created_at: '2025-10-13T09:00:00Z',
          plan: {
            id: 'plan-4',
            planned_date: '2025-10-25',
            planned_qty: 1.8,
            unit: 'T',
            stores: {
              name: '支店C',
              store_code: 'ST004',
            },
            item_maps: {
              item_label: '廃プラスチック',
              jwnet_code: 'W0404',
            },
          },
        },
      ]
      setRegistrations(mockData)
    } catch (err) {
      console.error('Failed to fetch registrations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userOrg?.id) {
      fetchRegistrations()
    }
  }, [userOrg?.id])

  // ステータスタグ
  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      PENDING: { color: 'orange', icon: <SyncOutlined spin />, text: '登録待ち' },
      REGISTERED: { color: 'green', icon: <CheckCircleOutlined />, text: '登録済' },
      FAILED: { color: 'red', icon: <CloseCircleOutlined />, text: '失敗' },
      ERROR: { color: 'red', icon: <CloseCircleOutlined />, text: 'エラー' },
    }
    const { color, icon, text } = config[status] || { color: 'gray', icon: null, text: status }
    return (
      <Tag color={color} icon={icon}>
        {text}
      </Tag>
    )
  }

  // 詳細表示
  const showDetail = (registration: Registration) => {
    setSelectedRegistration(registration)
    setDetailModalVisible(true)
  }

  // JWNET送信
  const handleSend = async (id: string) => {
    try {
      setSendingId(id)
      // TODO: 実際のJWNET送信API呼び出し
      await new Promise((resolve) => setTimeout(resolve, 2000))
      alert('JWNETへの本登録を開始しました')
      fetchRegistrations()
    } catch (err) {
      console.error('Failed to send to JWNET:', err)
      alert('JWNETへの登録に失敗しました')
    } finally {
      setSendingId(null)
    }
  }

  // 統計情報の計算
  const stats = {
    total: registrations.length,
    pending: registrations.filter((r) => r.status === 'PENDING').length,
    registered: registrations.filter((r) => r.status === 'REGISTERED').length,
    error: registrations.filter((r) => r.status === 'ERROR' || r.status === 'FAILED').length,
  }

  // テーブル列定義
  const columns = [
    {
      title: 'マニフェスト番号',
      dataIndex: 'manifest_no',
      key: 'manifest_no',
      width: 200,
      render: (no: string) => no || <Text type="secondary">未発行</Text>,
    },
    {
      title: '店舗',
      key: 'store',
      width: 200,
      render: (_: any, record: Registration) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.plan?.stores?.name}</Text>
          <Text type="secondary">{record.plan?.stores?.store_code}</Text>
        </Space>
      ),
    },
    {
      title: '品目',
      key: 'item',
      width: 200,
      render: (_: any, record: Registration) => (
        <Space direction="vertical" size={0}>
          <Text>{record.plan?.item_maps?.item_label}</Text>
          <Text type="secondary">({record.plan?.item_maps?.jwnet_code})</Text>
        </Space>
      ),
    },
    {
      title: '予定日',
      dataIndex: ['plan', 'planned_date'],
      key: 'planned_date',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '数量',
      key: 'quantity',
      width: 120,
      render: (_: any, record: Registration) =>
        `${record.plan?.planned_qty} ${record.plan?.unit}`,
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '最終送信',
      dataIndex: 'last_sent_at',
      key: 'last_sent_at',
      width: 180,
      render: (date: string) => (date ? new Date(date).toLocaleString('ja-JP') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: Registration) => (
        <Space>
          <Tooltip title="詳細">
            <Button icon={<EyeOutlined />} onClick={() => showDetail(record)} size="small" />
          </Tooltip>
          {(record.status === 'PENDING' || record.status === 'ERROR') && (
            <Tooltip title="JWNET本登録">
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleSend(record.id)}
                loading={sendingId === record.id}
                size="small"
              >
                本登録
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Title level={2}>
            <FileTextOutlined /> JWNET本登録管理
          </Title>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchRegistrations} loading={loading}>
            更新
          </Button>
        }
      >
        <Alert
          message="JWNET本登録について"
          description="JWNETへの本登録データを管理します。予約済みのデータをもとに本登録を行います。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 統計カード */}
        <Card style={{ marginBottom: 16 }}>
          <Space size="large">
            <div>
              <Text type="secondary">全体</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{stats.total}件</div>
            </div>
            <div>
              <Text type="secondary">登録待ち</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                {stats.pending}件
              </div>
            </div>
            <div>
              <Text type="secondary">登録済</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                {stats.registered}件
              </div>
            </div>
            <div>
              <Text type="secondary">エラー</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>
                {stats.error}件
              </div>
            </div>
          </Space>
          <Progress
            percent={Math.round((stats.registered / stats.total) * 100)}
            status={stats.error > 0 ? 'exception' : 'active'}
            style={{ marginTop: 16 }}
          />
        </Card>

        <Table
          columns={columns}
          dataSource={registrations}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
          }}
        />
      </Card>

      {/* 詳細モーダル */}
      <Modal
        title="JWNET本登録詳細"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedRegistration(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false)
              setSelectedRegistration(null)
            }}
          >
            閉じる
          </Button>,
        ]}
        width={800}
      >
        {selectedRegistration && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本情報" bordered column={2}>
              <Descriptions.Item label="マニフェスト番号" span={2}>
                {selectedRegistration.manifest_no || <Text type="secondary">未発行</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="店舗" span={2}>
                {selectedRegistration.plan?.stores?.name} (
                {selectedRegistration.plan?.stores?.store_code})
              </Descriptions.Item>
              <Descriptions.Item label="品目" span={2}>
                {selectedRegistration.plan?.item_maps?.item_label} (
                {selectedRegistration.plan?.item_maps?.jwnet_code})
              </Descriptions.Item>
              <Descriptions.Item label="予定日">
                {new Date(
                  selectedRegistration.plan?.planned_date || ''
                ).toLocaleDateString('ja-JP')}
              </Descriptions.Item>
              <Descriptions.Item label="数量">
                {selectedRegistration.plan?.planned_qty} {selectedRegistration.plan?.unit}
              </Descriptions.Item>
              <Descriptions.Item label="ステータス">
                {getStatusTag(selectedRegistration.status)}
              </Descriptions.Item>
              <Descriptions.Item label="最終送信">
                {selectedRegistration.last_sent_at
                  ? new Date(selectedRegistration.last_sent_at).toLocaleString('ja-JP')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="作成日時" span={2}>
                {new Date(selectedRegistration.created_at).toLocaleString('ja-JP')}
              </Descriptions.Item>
            </Descriptions>

            {selectedRegistration.error_code && (
              <Alert
                message="エラー情報"
                description={selectedRegistration.error_code}
                type="error"
                showIcon
              />
            )}
          </Space>
        )}
      </Modal>
    </div>
  )
}








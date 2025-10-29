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
  CalendarOutlined,
  EyeOutlined,
  ReloadOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'

const { Title, Text } = Typography

interface Reservation {
  id: string
  org_id: string
  plan_id: string
  jwnet_temp_id?: string
  payload_hash: string
  status: 'PENDING' | 'RESERVED' | 'FAILED' | 'ERROR'
  last_sent_at?: string
  error_code?: string
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

export default function ReservationsPage() {
  const { userOrg } = useUser()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  // データ取得
  const fetchReservations = async () => {
    if (!userOrg?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // モックデータ
      const mockData: Reservation[] = [
        {
          id: '1',
          org_id: userOrg.id,
          plan_id: 'plan-1',
          jwnet_temp_id: 'TEMP-2025-10-001',
          payload_hash: 'hash-001',
          status: 'PENDING',
          created_at: '2025-10-16T10:00:00Z',
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
          jwnet_temp_id: 'TEMP-2025-10-002',
          payload_hash: 'hash-002',
          status: 'RESERVED',
          last_sent_at: '2025-10-15T14:30:00Z',
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
          jwnet_temp_id: 'TEMP-2025-10-003',
          payload_hash: 'hash-003',
          status: 'ERROR',
          last_sent_at: '2025-10-14T09:00:00Z',
          error_code: 'JWNET_CONNECTION_ERROR',
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
          payload_hash: 'hash-004',
          status: 'FAILED',
          last_sent_at: '2025-10-13T10:00:00Z',
          error_code: 'INVALID_DATA',
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
      setReservations(mockData)
    } catch (err) {
      console.error('Failed to fetch reservations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userOrg?.id) {
      fetchReservations()
    }
  }, [userOrg?.id])

  // ステータスタグ
  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      PENDING: { color: 'orange', icon: <SyncOutlined spin />, text: '送信待ち' },
      RESERVED: { color: 'green', icon: <CheckCircleOutlined />, text: '予約済' },
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
  const showDetail = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setDetailModalVisible(true)
  }

  // JWNET送信
  const handleSend = async (id: string) => {
    try {
      setSendingId(id)
      // TODO: 実際のJWNET送信API呼び出し
      await new Promise((resolve) => setTimeout(resolve, 2000))
      alert('JWNETへの送信を開始しました')
      fetchReservations()
    } catch (err) {
      console.error('Failed to send to JWNET:', err)
      alert('JWNETへの送信に失敗しました')
    } finally {
      setSendingId(null)
    }
  }

  // 統計情報の計算
  const stats = {
    total: reservations.length,
    pending: reservations.filter((r) => r.status === 'PENDING').length,
    reserved: reservations.filter((r) => r.status === 'RESERVED').length,
    error: reservations.filter((r) => r.status === 'ERROR' || r.status === 'FAILED').length,
  }

  // テーブル列定義
  const columns = [
    {
      title: 'JWNET仮ID',
      dataIndex: 'jwnet_temp_id',
      key: 'jwnet_temp_id',
      width: 180,
      render: (id: string) => id || <Text type="secondary">未発行</Text>,
    },
    {
      title: '店舗',
      key: 'store',
      width: 200,
      render: (_: any, record: Reservation) => (
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
      render: (_: any, record: Reservation) => (
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
      render: (_: any, record: Reservation) => `${record.plan?.planned_qty} ${record.plan?.unit}`,
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
      render: (_: any, record: Reservation) => (
        <Space>
          <Tooltip title="詳細">
            <Button icon={<EyeOutlined />} onClick={() => showDetail(record)} size="small" />
          </Tooltip>
          {(record.status === 'PENDING' || record.status === 'ERROR' || record.status === 'FAILED') && (
            <Tooltip title="JWNET送信">
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleSend(record.id)}
                loading={sendingId === record.id}
                size="small"
              >
                送信
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
            <CalendarOutlined /> JWNET予約管理
          </Title>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchReservations} loading={loading}>
            更新
          </Button>
        }
      >
        <Alert
          message="JWNET予約について"
          description="JWNETへの予約データを管理します。ステータスがPENDINGまたはERRORの場合、再送信が可能です。"
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
              <Text type="secondary">送信待ち</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
                {stats.pending}件
              </div>
            </div>
            <div>
              <Text type="secondary">予約済</Text>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                {stats.reserved}件
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
            percent={Math.round((stats.reserved / stats.total) * 100)}
            status={stats.error > 0 ? 'exception' : 'active'}
            style={{ marginTop: 16 }}
          />
        </Card>

        <Table
          columns={columns}
          dataSource={reservations}
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
        title="JWNET予約詳細"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedReservation(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false)
              setSelectedReservation(null)
            }}
          >
            閉じる
          </Button>,
        ]}
        width={800}
      >
        {selectedReservation && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本情報" bordered column={2}>
              <Descriptions.Item label="JWNET仮ID" span={2}>
                {selectedReservation.jwnet_temp_id || <Text type="secondary">未発行</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="店舗" span={2}>
                {selectedReservation.plan?.stores?.name} (
                {selectedReservation.plan?.stores?.store_code})
              </Descriptions.Item>
              <Descriptions.Item label="品目" span={2}>
                {selectedReservation.plan?.item_maps?.item_label} (
                {selectedReservation.plan?.item_maps?.jwnet_code})
              </Descriptions.Item>
              <Descriptions.Item label="予定日">
                {new Date(
                  selectedReservation.plan?.planned_date || ''
                ).toLocaleDateString('ja-JP')}
              </Descriptions.Item>
              <Descriptions.Item label="数量">
                {selectedReservation.plan?.planned_qty} {selectedReservation.plan?.unit}
              </Descriptions.Item>
              <Descriptions.Item label="ステータス">
                {getStatusTag(selectedReservation.status)}
              </Descriptions.Item>
              <Descriptions.Item label="最終送信">
                {selectedReservation.last_sent_at
                  ? new Date(selectedReservation.last_sent_at).toLocaleString('ja-JP')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="作成日時" span={2}>
                {new Date(selectedReservation.created_at).toLocaleString('ja-JP')}
              </Descriptions.Item>
            </Descriptions>

            {selectedReservation.error_code && (
              <Alert
                message="エラー情報"
                description={selectedReservation.error_code}
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








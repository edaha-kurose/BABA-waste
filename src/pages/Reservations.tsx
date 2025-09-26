// ============================================================================
// 予約管理ページ
// 作成日: 2025-09-16
// 目的: 予約の一覧表示とステータス管理
// ============================================================================

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  Tag,
  Modal,
  message,
} from 'antd'
import {
  ReloadOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'

const { Title } = Typography

const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  // データ取得
  const fetchReservations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // モック予約データ
      const mockReservations = [
        {
          id: '1',
          plan_id: '1',
          jwnet_temp_id: 'JW001',
          payload_hash: 'hash001',
          status: 'RESERVED',
          last_sent_at: '2025-09-16T10:00:00Z',
          error_code: null,
          created_at: '2025-09-16T09:00:00Z',
        },
        {
          id: '2',
          plan_id: '2',
          jwnet_temp_id: null,
          payload_hash: 'hash002',
          status: 'PENDING',
          last_sent_at: null,
          error_code: null,
          created_at: '2025-09-16T09:30:00Z',
        },
        {
          id: '3',
          plan_id: '3',
          jwnet_temp_id: null,
          payload_hash: 'hash003',
          status: 'FAILED',
          last_sent_at: '2025-09-16T11:00:00Z',
          error_code: 'GATEWAY_ERROR',
          created_at: '2025-09-16T10:00:00Z',
        },
      ]
      setReservations(mockReservations)
    } catch (err) {
      console.error('Failed to fetch reservations:', err)
      setError('予約データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReservations()
  }, [])

  // 予約送信
  const handleSendReservations = async () => {
    try {
      setSending(true)
      
      // モック実装
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      message.success('予約を送信しました')
      fetchReservations()
    } catch (err) {
      console.error('Failed to send reservations:', err)
      message.error('予約の送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  // ステータス表示
  const getStatusTag = (status: string) => {
    const statusConfig = {
      RESERVED: { color: 'green', text: '予約済み' },
      PENDING: { color: 'orange', text: '送信待ち' },
      FAILED: { color: 'red', text: '送信失敗' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'gray', text: status }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // テーブル列定義
  const columns = [
    {
      title: '予約ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'JWNET予約ID',
      dataIndex: 'jwnet_temp_id',
      key: 'jwnet_temp_id',
      render: (id: string) => id || '-',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '送信日時',
      dataIndex: 'last_sent_at',
      key: 'last_sent_at',
      render: (date: string) => date ? new Date(date).toLocaleString('ja-JP') : '-',
    },
    {
      title: 'エラーコード',
      dataIndex: 'error_code',
      key: 'error_code',
      render: (code: string) => code || '-',
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('ja-JP'),
    },
  ]

  if (loading) {
    return (
      <div className="center" style={{ height: '400px' }}>
        <Spin size="large" />
        <span className="ml-2">データを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="エラー"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchReservations}>
            再試行
          </Button>
        }
      />
    )
  }

  const pendingCount = reservations.filter(r => r.status === 'PENDING').length
  const failedCount = reservations.filter(r => r.status === 'FAILED').length
  const reservedCount = reservations.filter(r => r.status === 'RESERVED').length

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          予約管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchReservations}>
            更新
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendReservations}
            loading={sending}
            disabled={pendingCount === 0}
          >
            予約送信 ({pendingCount})
          </Button>
        </Space>
      </div>

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="総予約数"
              value={reservations.length}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="送信待ち"
              value={pendingCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="予約済み"
              value={reservedCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="送信失敗"
              value={failedCount}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 予約一覧テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={reservations}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total}件`,
          }}
        />
      </Card>
    </div>
  )
}

export default Reservations




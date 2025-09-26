// ============================================================================
// 本登録管理ページ
// 作成日: 2025-09-16
// 目的: 本登録の一覧表示とステータス管理
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

const Registrations: React.FC = () => {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  // データ取得
  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // モック本登録データ
      const mockRegistrations = [
        {
          id: '1',
          plan_id: '1',
          manifest_no: 'MN001',
          status: 'REGISTERED',
          last_sent_at: '2025-09-16T10:00:00Z',
          error_code: null,
          created_at: '2025-09-16T09:00:00Z',
        },
        {
          id: '2',
          plan_id: '2',
          manifest_no: null,
          status: 'PENDING',
          last_sent_at: null,
          error_code: null,
          created_at: '2025-09-16T09:30:00Z',
        },
        {
          id: '3',
          plan_id: '3',
          manifest_no: null,
          status: 'ERROR',
          last_sent_at: '2025-09-16T11:00:00Z',
          error_code: 'GATEWAY_ERROR',
          created_at: '2025-09-16T10:00:00Z',
        },
      ]
      setRegistrations(mockRegistrations)
    } catch (err) {
      console.error('Failed to fetch registrations:', err)
      setError('本登録データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegistrations()
  }, [])

  // 本登録送信
  const handleSendRegistrations = async () => {
    try {
      setSending(true)
      
      // モック実装
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      message.success('本登録を送信しました')
      fetchRegistrations()
    } catch (err) {
      console.error('Failed to send registrations:', err)
      message.error('本登録の送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  // ステータス表示
  const getStatusTag = (status: string) => {
    const statusConfig = {
      REGISTERED: { color: 'green', text: '登録済み' },
      PENDING: { color: 'orange', text: '送信待ち' },
      ERROR: { color: 'red', text: '送信失敗' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'gray', text: status }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // テーブル列定義
  const columns = [
    {
      title: '本登録ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'マニフェスト番号',
      dataIndex: 'manifest_no',
      key: 'manifest_no',
      render: (no: string) => no || '-',
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
          <Button size="small" onClick={fetchRegistrations}>
            再試行
          </Button>
        }
      />
    )
  }

  const pendingCount = registrations.filter(r => r.status === 'PENDING').length
  const errorCount = registrations.filter(r => r.status === 'ERROR').length
  const registeredCount = registrations.filter(r => r.status === 'REGISTERED').length

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          本登録管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchRegistrations}>
            更新
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendRegistrations}
            loading={sending}
            disabled={pendingCount === 0}
          >
            本登録送信 ({pendingCount})
          </Button>
        </Space>
      </div>

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="総本登録数"
              value={registrations.length}
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
              title="登録済み"
              value={registeredCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="送信失敗"
              value={errorCount}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 本登録一覧テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={registrations}
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

export default Registrations




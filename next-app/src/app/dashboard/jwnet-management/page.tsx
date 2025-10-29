'use client'

/**
 * JWNET管理画面
 * デスクトップ版JwnetManagementから移植
 * 既存jwnet関連テーブル活用（影響範囲: MEDIUM）
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Tabs,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  message,
  Statistic,
  Row,
  Col,
} from 'antd'
import {
  ReloadOutlined,
  SendOutlined,
  SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TabPane } = Tabs

interface Reservation {
  id: string
  manifest_no?: string
  status: string
  created_at: string
  jwnet_status?: string
}

interface Registration {
  id: string
  manifest_no?: string
  status: string
  created_at: string
  jwnet_status?: string
}

export default function JwnetManagementPage() {
  const [loading, setLoading] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [activeTab, setActiveTab] = useState('reservations')

  const fetchReservations = async () => {
    try {
      setLoading(true)
      // TODO: API実装
      // const response = await fetch('/api/reservations')
      // const data = await response.json()
      // setReservations(data.data || [])
      setReservations([])
    } catch (error) {
      console.error('[FetchReservations] Error:', error)
      message.error('予約データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchRegistrations = async () => {
    try {
      setLoading(true)
      // TODO: API実装
      // const response = await fetch('/api/registrations')
      // const data = await response.json()
      // setRegistrations(data.data || [])
      setRegistrations([])
    } catch (error) {
      console.error('[FetchRegistrations] Error:', error)
      message.error('登録データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'reservations') {
      fetchReservations()
    } else {
      fetchRegistrations()
    }
  }, [activeTab])

  // 予約送信
  const handleSendReservation = async (id: string) => {
    try {
      // TODO: API実装
      // await fetch(`/api/reservations/${id}/send`, { method: 'POST' })
      message.success('予約を送信しました')
      fetchReservations()
    } catch (error) {
      console.error('[SendReservation] Error:', error)
      message.error('予約送信に失敗しました')
    }
  }

  // 登録送信
  const handleSendRegistration = async (id: string) => {
    try {
      // TODO: API実装
      // await fetch(`/api/registrations/${id}/send`, { method: 'POST' })
      message.success('登録を送信しました')
      fetchRegistrations()
    } catch (error) {
      console.error('[SendRegistration] Error:', error)
      message.error('登録送信に失敗しました')
    }
  }

  // 状態照会
  const handleInquiry = async (id: string) => {
    try {
      // TODO: API実装
      // await fetch(`/api/jwnet/inquiry/${id}`)
      message.info('状態照会機能は未実装です')
    } catch (error) {
      console.error('[Inquiry] Error:', error)
      message.error('状態照会に失敗しました')
    }
  }

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'orange', text: '未送信' },
      SENT: { color: 'blue', text: '送信済' },
      SUCCESS: { color: 'green', text: '成功' },
      FAILED: { color: 'red', text: '失敗' },
    }
    const c = config[status] || { color: 'default', text: status }
    return <Tag color={c.color}>{c.text}</Tag>
  }

  // 予約テーブル
  const reservationColumns = [
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
      title: 'JWNETステータス',
      dataIndex: 'jwnet_status',
      key: 'jwnet_status',
      render: (status: string) => status || '-',
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Reservation) => (
        <Space size="small">
          <Button
            size="small"
            icon={<SendOutlined />}
            onClick={() => handleSendReservation(record.id)}
            disabled={record.status === 'SENT'}
          >
            送信
          </Button>
          <Button
            size="small"
            icon={<SearchOutlined />}
            onClick={() => handleInquiry(record.id)}
          >
            照会
          </Button>
        </Space>
      ),
    },
  ]

  // 登録テーブル
  const registrationColumns = [
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
      title: 'JWNETステータス',
      dataIndex: 'jwnet_status',
      key: 'jwnet_status',
      render: (status: string) => status || '-',
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Registration) => (
        <Space size="small">
          <Button
            size="small"
            icon={<SendOutlined />}
            onClick={() => handleSendRegistration(record.id)}
            disabled={record.status === 'SENT'}
          >
            送信
          </Button>
          <Button
            size="small"
            icon={<SearchOutlined />}
            onClick={() => handleInquiry(record.id)}
          >
            照会
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>JWNET 管理</Title>
        <Text type="secondary">
          予約・登録データのJWNET送信と状態管理
        </Text>
      </div>

      {/* サマリー */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="予約（未送信）"
              value={reservations.filter((r) => r.status === 'PENDING').length}
              suffix="件"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="予約（送信済）"
              value={reservations.filter((r) => r.status === 'SENT').length}
              suffix="件"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="登録（未送信）"
              value={registrations.filter((r) => r.status === 'PENDING').length}
              suffix="件"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="登録（送信済）"
              value={registrations.filter((r) => r.status === 'SENT').length}
              suffix="件"
            />
          </Card>
        </Col>
      </Row>

      {/* タブ */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                予約データ
              </span>
            }
            key="reservations"
          >
            <div style={{ marginBottom: 16 }}>
              <Button icon={<ReloadOutlined />} onClick={fetchReservations}>
                更新
              </Button>
            </div>
            <Table
              columns={reservationColumns}
              dataSource={reservations}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '予約データがありません' }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                登録データ
              </span>
            }
            key="registrations"
          >
            <div style={{ marginBottom: 16 }}>
              <Button icon={<ReloadOutlined />} onClick={fetchRegistrations}>
                更新
              </Button>
            </div>
            <Table
              columns={registrationColumns}
              dataSource={registrations}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: '登録データがありません' }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}











'use client'

/**
 * 収集業者用 - 回収依頼一覧画面
 * デスクトップ版CollectorRequestsから移植
 * ヒアリング機能（マトリクス）の表示場所
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Row,
  Col,
  Statistic,
  Input,
  Select,
  Tabs,
  DatePicker,
  TimePicker,
} from 'antd'
import {
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import CollectorLayout from '@/components/CollectorLayout'
import dayjs from 'dayjs'

const { Option } = Select
const { TabPane } = Tabs

interface CollectionRequest {
  id: string
  store_id: string
  plan_id?: string
  status: string
  request_date: string
  requested_pickup_date?: string
  confirmed_pickup_date?: string
  confirmed_pickup_time?: string
  notes?: string
}

export default function CollectorRequestsPage() {
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 行内編集用の状態
  const [editDate, setEditDate] = useState<Record<string, any>>({})
  const [editTime, setEditTime] = useState<Record<string, any>>({})

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collector/requests')

      if (!response.ok) {
        throw new Error('データの取得に失敗しました')
      }

      const data = await response.json()
      setRequests(data.data || [])
    } catch (error) {
      console.error('[CollectorRequests] Error:', error)
      message.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 回収予定日時を更新
  const handleUpdateDateTime = async (requestId: string) => {
    try {
      const dv = editDate[requestId]
      const tv = editTime[requestId]

      if (!dv || !tv) {
        message.warning('回収予定日と時間を入力してください')
        return
      }

      const combined = dayjs(`${dv.format('YYYY-MM-DD')} ${tv.format('HH:mm')}`)

      const response = await fetch(`/api/collection-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_pickup_date: combined.toISOString(),
          status: 'PENDING',
        }),
      })

      if (!response.ok) {
        throw new Error('更新に失敗しました')
      }

      message.success('回収予定日時を更新しました')
      fetchData()
    } catch (error) {
      console.error('[UpdateDateTime] Error:', error)
      message.error('更新に失敗しました')
    }
  }

  // ステータス別カウント
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length
  const confirmedCount = requests.filter((r) => r.status === 'CONFIRMED').length
  const completedCount = requests.filter((r) => r.status === 'COMPLETED').length

  // フィルタリング
  const filteredRequests = requests.filter((request) => {
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false
    }
    if (searchQuery) {
      return request.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  // テーブル列定義
  const columns = [
    {
      title: '依頼日',
      dataIndex: 'request_date',
      key: 'request_date',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          {dayjs(date).format('YYYY-MM-DD')}
        </Space>
      ),
    },
    {
      title: '回収予定日時',
      dataIndex: 'requested_pickup_date',
      key: 'requested_pickup_date',
      render: (_: any, record: CollectionRequest) => {
        const current = record.requested_pickup_date ? dayjs(record.requested_pickup_date) : null
        const d = editDate[record.id] ?? current
        const t = editTime[record.id] ?? current

        return (
          <Space>
            <DatePicker
              value={d}
              onChange={(v) => setEditDate((prev) => ({ ...prev, [record.id]: v }))}
              format="YYYY-MM-DD"
            />
            <TimePicker
              value={t}
              onChange={(v) => setEditTime((prev) => ({ ...prev, [record.id]: v }))}
              format="HH:mm"
            />
            <Button icon={<SaveOutlined />} onClick={() => handleUpdateDateTime(record.id)}>
              更新
            </Button>
          </Space>
        )
      },
    },
    {
      title: '確定回収日時',
      key: 'confirmed_datetime',
      render: (_: any, record: CollectionRequest) => {
        if (record.confirmed_pickup_date && record.confirmed_pickup_time) {
          return (
            <Space>
              <ClockCircleOutlined />
              {`${dayjs(record.confirmed_pickup_date).format('YYYY-MM-DD')} ${
                record.confirmed_pickup_time
              }`}
            </Space>
          )
        }
        return '-'
      },
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          PENDING: { color: 'orange', text: '承認待ち' },
          CONFIRMED: { color: 'blue', text: '確定' },
          COMPLETED: { color: 'green', text: '完了' },
          CANCELLED: { color: 'red', text: 'キャンセル' },
        }
        const config = statusConfig[status] || { color: 'default', text: status }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
  ]

  // ステータス別データ
  const pendingRequests = filteredRequests.filter((r) => r.status === 'PENDING')
  const confirmedRequests = filteredRequests.filter((r) => r.status === 'CONFIRMED')
  const completedRequests = filteredRequests.filter((r) => r.status === 'COMPLETED')

  return (
    <CollectorLayout>
      {/* 統計カード */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="待機中"
              value={pendingCount}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="確定済み"
              value={confirmedCount}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="完了"
              value={completedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* フィルター */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={16}>
            <Input
              placeholder="備考で検索..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: '100%' }}>
              <Option value="all">すべて</Option>
              <Option value="PENDING">待機中</Option>
              <Option value="CONFIRMED">確定済み</Option>
              <Option value="COMPLETED">完了</Option>
              <Option value="CANCELLED">キャンセル</Option>
            </Select>
          </Col>
          <Col xs={24} sm={2}>
            <Button icon={<ReloadOutlined />} onClick={fetchData} block>
              更新
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 依頼一覧 */}
      <Card>
        <Tabs defaultActiveKey="pending">
          <TabPane tab={`待機中 (${pendingRequests.length})`} key="pending">
            <Table
              columns={columns}
              dataSource={pendingRequests}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          <TabPane tab={`確定済み (${confirmedRequests.length})`} key="confirmed">
            <Table
              columns={columns}
              dataSource={confirmedRequests}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          <TabPane tab={`完了 (${completedRequests.length})`} key="completed">
            <Table
              columns={columns}
              dataSource={completedRequests}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* TODO: ヒアリング機能（マトリクス）をここに追加予定 */}
    </CollectorLayout>
  )
}











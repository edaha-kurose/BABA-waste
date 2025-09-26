import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Form,
  Input,
  Space,
  message,
  Tag,
  Row,
  Col,
  Typography,
  DatePicker,
  TimePicker,
  Statistic,
  Tabs,
  Select,
} from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  CalendarOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { PlanRepository } from '@/modules/plans/repository'
import type { CollectionRequest, Store, Plan, User } from '@contracts/v0/schema'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

interface CollectorRequestsProps {
  collector: User
}

const CollectorRequests: React.FC<CollectorRequestsProps> = ({ collector }) => {
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
const [form] = Form.useForm()
// 行内編集用の一時状態（回収予定日時）
const [editDate, setEditDate] = useState<Record<string, any>>({})
const [editTime, setEditTime] = useState<Record<string, any>>({})
const [openDatePicker, setOpenDatePicker] = useState<Record<string, boolean>>({})
const [openTimePicker, setOpenTimePicker] = useState<Record<string, boolean>>({})

  // フィルター関連
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [requestsData, storesData, plansData] = await Promise.all([
        CollectionRequestRepository.findByCollectorId(collector.id),
        StoreRepository.findMany(),
        PlanRepository.findMany(),
      ])
      
      setRequests(requestsData)
      setStores(storesData)
      setPlans(plansData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError(`データの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [collector.id])

  // モーダル版の確定処理は廃止（行内更新に統一）

  // 依頼キャンセル
  const handleCancel = async (id: string) => {
    try {
      await CollectionRequestRepository.update(id, {
        status: 'CANCELLED',
      })
      message.success('依頼をキャンセルしました')
      fetchData()
    } catch (err) {
      console.error('Failed to cancel request:', err)
      message.error('依頼のキャンセルに失敗しました')
    }
  }

  // 確定モーダルを開く
  const openConfirmModal = (_request: CollectionRequest) => {}

  // 確定モーダルを閉じる
  const closeConfirmModal = () => {}

  // ステータス別の色（日時未入力ならデフォルト）
  const getStatusColor = (status: string, preferred?: string | null) => {
    if (!preferred) return 'default'
    switch (status) {
      case 'PENDING': return 'orange'
      case 'CONFIRMED': return 'blue'
      case 'COMPLETED': return 'green'
      case 'CANCELLED': return 'red'
      default: return 'default'
    }
  }

  // ステータス別のラベル（日時未入力なら「日時入力待ち」）
  const getStatusLabel = (status: string, preferred?: string | null) => {
    if (!preferred) return '日時入力待ち'
    switch (status) {
      case 'PENDING': return '承認待ち'
      case 'CONFIRMED': return '確定'
      case 'COMPLETED': return '完了'
      case 'CANCELLED': return 'キャンセル'
      default: return status
    }
  }

  // フィルタリング
  const filteredRequests = requests.filter(request => {
    // ステータスフィルター
    if (statusFilter !== 'all' && request.status !== statusFilter) {
      return false
    }

    // 検索クエリ
    if (searchQuery) {
      const store = stores.find(s => s.id === request.store_id)
      const plan = plans.find(p => p.id === request.plan_id)
      const query = searchQuery.toLowerCase()
      
      return (
        store?.name.toLowerCase().includes(query) ||
        plan?.item_name.toLowerCase().includes(query) ||
        request.notes?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // 統計データ
  const pendingCount = requests.filter(r => r.status === 'PENDING').length
  const confirmedCount = requests.filter(r => r.status === 'CONFIRMED').length
  const completedCount = requests.filter(r => r.status === 'COMPLETED').length
  const cancelledCount = requests.filter(r => r.status === 'CANCELLED').length

  // テーブル列定義
  const columns = [
    {
      title: '店舗',
      dataIndex: 'store_id',
      key: 'store_id',
      render: (storeId: string) => {
        const store = stores.find(s => s.id === storeId)
        return store ? (
          <Space>
            <ShopOutlined />
            {store.name}
          </Space>
        ) : storeId
      },
    },
    {
      title: '予定内容',
      dataIndex: 'plan_id',
      key: 'plan_id',
      render: (planId: string) => {
        const plan = plans.find(p => p.id === planId)
        return plan ? (
          <div>
            <div><strong>{plan.item_name}</strong></div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {plan.planned_quantity}{plan.unit} - {dayjs(plan.planned_pickup_date).format('YYYY-MM-DD')}
            </div>
          </div>
        ) : planId
      },
    },
    {
      title: '依頼日',
      dataIndex: 'request_date',
      key: 'request_date',
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          {dayjs(date).format('YYYY-MM-DD HH:mm')}
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
        const t = editTime[record.id] ?? (current ? current : null)
        return (
          <Space>
            <Input placeholder="YYYYMMDD" style={{ width: 110 }} suffix={<CalendarOutlined onClick={()=> setOpenDatePicker(prev=>({ ...prev, [record.id]: true }))} />} onPressEnter={(e)=>{ const val=(e.currentTarget.value||'').trim(); if(/^\d{8}$/.test(val)){ const parsed=dayjs(val,'YYYYMMDD'); if(parsed.isValid()) setEditDate(prev=>({ ...prev, [record.id]: parsed }))}}} />
            <Input placeholder="HHmm" style={{ width: 90 }} suffix={<ClockCircleOutlined onClick={()=> setOpenTimePicker(prev=>({ ...prev, [record.id]: true }))} />} onPressEnter={(e)=>{ const val=(e.currentTarget.value||'').trim(); if(/^\d{3,4}$/.test(val)){ const padded=val.padStart(4,'0'); const parsed=dayjs(padded,'HHmm'); if(parsed.isValid()) setEditTime(prev=>({ ...prev, [record.id]: parsed }))}}} />
            {/* アイコンで開く非表示ピッカー */}
            <DatePicker
              open={!!openDatePicker[record.id]}
              onOpenChange={(o)=> setOpenDatePicker(prev=>({ ...prev, [record.id]: o }))}
              value={d}
              onChange={(v)=> setEditDate(prev=>({ ...prev, [record.id]: v }))}
              style={{ width: 0, opacity: 0, position: 'absolute' }}
            />
            <TimePicker
              open={!!openTimePicker[record.id]}
              onOpenChange={(o)=> setOpenTimePicker(prev=>({ ...prev, [record.id]: o }))}
              value={t}
              format="HH:mm"
              onChange={(v)=> setEditTime(prev=>({ ...prev, [record.id]: v }))}
              style={{ width: 0, opacity: 0, position: 'absolute' }}
            />
            <Button icon={<SaveOutlined />} onClick={async()=>{
              try {
                const dv = editDate[record.id]
                const tv = editTime[record.id]
                if (!dv || !tv) { message.warning('回収予定日と時間を入力してください'); return }
                const combined = dayjs(`${dv.format('YYYY-MM-DD')} ${tv.format('HH:mm')}`)
                // 希望を更新したら確定はリセットし、再承認フローへ
                await CollectionRequestRepository.update(record.id, {
                  requested_pickup_date: combined.toISOString(),
                  status: 'PENDING',
                  confirmed_pickup_date: undefined as any,
                  confirmed_pickup_time: undefined as any,
                } as any)
                message.success('回収予定日時を更新しました')
                fetchData()
              } catch (e) {
                console.error(e)
                message.error('更新に失敗しました')
              }
            }}>更新</Button>
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
              {`${dayjs(record.confirmed_pickup_date).format('YYYY-MM-DD')} ${record.confirmed_pickup_time}`}
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
      render: (status: string, record: CollectionRequest) => (
        <Tag color={getStatusColor(status, record.requested_pickup_date)}>
          {getStatusLabel(status, record.requested_pickup_date)}
        </Tag>
      ),
    },
    // 確定ボタン列は削除（行内更新に一本化）
  ]

  // ステータス別のフィルタ
  const pendingRequests = filteredRequests.filter(r => r.status === 'PENDING')
  const confirmedRequests = filteredRequests.filter(r => r.status === 'CONFIRMED')
  const completedRequests = filteredRequests.filter(r => r.status === 'COMPLETED')
  const cancelledRequests = filteredRequests.filter(r => r.status === 'CANCELLED')

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={4} type="danger">エラーが発生しました</Title>
          <p>{error}</p>
          <Button onClick={fetchData}>再試行</Button>
        </div>
      </Card>
    )
  }

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              廃棄依頼一覧
            </Title>
            <Text type="secondary">
              自社に関連する廃棄依頼の一覧と管理
            </Text>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              更新
            </Button>
          </Col>
        </Row>
      </div>

      {/* 統計カード */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="待機中"
              value={pendingCount}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="確定済み"
              value={confirmedCount}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="完了"
              value={completedCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="キャンセル"
              value={cancelledCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* フィルター */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8}>
            <Input
              placeholder="店舗名、物品名、備考で検索..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">すべて</Option>
              <Option value="PENDING">待機中</Option>
              <Option value="CONFIRMED">確定済み</Option>
              <Option value="COMPLETED">完了</Option>
              <Option value="CANCELLED">キャンセル</Option>
            </Select>
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
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
              }}
            />
          </TabPane>
          <TabPane tab={`確定済み (${confirmedRequests.length})`} key="confirmed">
            <Table
              columns={columns}
              dataSource={confirmedRequests}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
              }}
            />
          </TabPane>
          <TabPane tab={`完了 (${completedRequests.length})`} key="completed">
            <Table
              columns={columns}
              dataSource={completedRequests}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
              }}
            />
          </TabPane>
          <TabPane tab={`キャンセル (${cancelledRequests.length})`} key="cancelled">
            <Table
              columns={columns}
              dataSource={cancelledRequests}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* モーダル版UIは削除済み（行内編集で更新） */}
    </div>
  )
}

export default CollectorRequests

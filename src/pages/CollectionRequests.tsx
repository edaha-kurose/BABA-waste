import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Tag,
  Row,
  Col,
  Typography,
  DatePicker,
  TimePicker,
  Tabs,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { CollectorRepository } from '@/modules/collectors/repository'
import { PlanRepository } from '@/modules/plans/repository'
import { jwnetService } from '@/services/jwnet-service'
import type { CollectionRequest, Store, Collector, Plan } from '@contracts/v0/schema'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select
const { TabPane } = Tabs

interface CollectionRequestFormData {
  store_id: string
  collector_id: string
  plan_id: string
  request_date: string
  requested_pickup_date?: string
  notes?: string
}

const CollectionRequests: React.FC = () => {
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRequest, setEditingRequest] = useState<CollectionRequest | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [requestsData, storesData, collectorsData, plansData] = await Promise.all([
        CollectionRequestRepository.findMany(),
        StoreRepository.findMany(),
        CollectorRepository.findMany(),
        PlanRepository.findMany()
      ])
      
      setRequests(requestsData)
      setStores(storesData)
      setCollectors(collectorsData)
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
  }, [])

  // フォーム送信
  const handleSubmit = async (values: CollectionRequestFormData) => {
    try {
      const requestData = {
        org_id: 'demo-org-id',
        ...values,
        status: 'PENDING' as const,
      }

      if (editingRequest) {
        await CollectionRequestRepository.update(editingRequest.id, requestData)
        message.success('廃棄依頼を更新しました')
      } else {
        await CollectionRequestRepository.create(requestData)
        message.success('廃棄依頼を作成しました')
      }
      
      setModalVisible(false)
      setEditingRequest(null)
      form.resetFields()
      fetchData()
    } catch (err) {
      console.error('Failed to save request:', err)
      message.error('廃棄依頼の保存に失敗しました')
    }
  }

  // 依頼確定
  const handleConfirm = async (id: string, confirmedDate: string, confirmedTime: string) => {
    try {
      // 依頼を確定
      await CollectionRequestRepository.update(id, {
        status: 'CONFIRMED',
        confirmed_pickup_date: confirmedDate,
        confirmed_pickup_time: confirmedTime,
      })
      
      // JWNET予約登録を送信
      try {
        const jwnetResult = await jwnetService.submitReservation(id)
        message.success(`依頼を確定し、JWNET予約登録を送信しました (ID: ${jwnetResult.jwnetId})`)
      } catch (jwnetError) {
        console.error('JWNET submission failed:', jwnetError)
        message.warning('依頼は確定しましたが、JWNET予約登録の送信に失敗しました')
      }
      
      fetchData()
    } catch (err) {
      console.error('Failed to confirm request:', err)
      message.error('依頼の確定に失敗しました')
    }
  }

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

  // 削除
  const handleDelete = async (id: string) => {
    try {
      await CollectionRequestRepository.delete(id)
      message.success('廃棄依頼を削除しました')
      fetchData()
    } catch (err) {
      console.error('Failed to delete request:', err)
      message.error('廃棄依頼の削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (request: CollectionRequest) => {
    setEditingRequest(request)
    form.setFieldsValue({
      ...request,
      request_date: request.request_date ? dayjs(request.request_date) : null,
      requested_pickup_date: request.requested_pickup_date ? dayjs(request.requested_pickup_date) : null,
    })
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingRequest(null)
    form.resetFields()
    setModalVisible(true)
  }

  // モーダルキャンセル
  const handleModalCancel = () => {
    setModalVisible(false)
    setEditingRequest(null)
    form.resetFields()
  }

  // ステータス別の色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'orange'
      case 'CONFIRMED': return 'blue'
      case 'COMPLETED': return 'green'
      case 'CANCELLED': return 'red'
      default: return 'default'
    }
  }

  // ステータス別のラベル
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return '待機中'
      case 'CONFIRMED': return '確定済み'
      case 'COMPLETED': return '完了'
      case 'CANCELLED': return 'キャンセル'
      default: return status
    }
  }

  // テーブル列定義
  const columns = [
    {
      title: '店舗',
      dataIndex: 'store_id',
      key: 'store_id',
      render: (storeId: string) => {
        const store = stores.find(s => s.id === storeId)
        return store ? store.name : storeId
      },
    },
    {
      title: '収集業者',
      dataIndex: 'collector_id',
      key: 'collector_id',
      render: (collectorId: string) => {
        const collector = collectors.find(c => c.id === collectorId)
        return collector ? collector.company_name : collectorId
      },
    },
    {
      title: '予定',
      dataIndex: 'plan_id',
      key: 'plan_id',
      render: (planId: string) => {
        const plan = plans.find(p => p.id === planId)
        return plan ? `${plan.item_name} (${plan.planned_quantity}${plan.unit})` : planId
      },
    },
    {
      title: '依頼日',
      dataIndex: 'request_date',
      key: 'request_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '希望回収日',
      dataIndex: 'requested_pickup_date',
      key: 'requested_pickup_date',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '確定回収日時',
      key: 'confirmed_datetime',
      render: (_: any, record: CollectionRequest) => {
        if (record.confirmed_pickup_date && record.confirmed_pickup_time) {
          return `${dayjs(record.confirmed_pickup_date).format('YYYY-MM-DD')} ${record.confirmed_pickup_time}`
        }
        return '-'
      },
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: CollectionRequest) => (
        <Space>
          {record.status === 'PENDING' && (
            <Button
              type="text"
              icon={<CheckOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '依頼を確定しますか？',
                  content: (
                    <div>
                      <p>確定回収日時を入力してください：</p>
                      <Form
                        onFinish={(values) => {
                          handleConfirm(
                            record.id,
                            values.confirmed_date.format('YYYY-MM-DD'),
                            values.confirmed_time.format('HH:mm')
                          )
                        }}
                      >
                        <Form.Item
                          name="confirmed_date"
                          label="確定回収日"
                          rules={[{ required: true, message: '確定回収日を選択してください' }]}
                        >
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item
                          name="confirmed_time"
                          label="確定回収時間"
                          rules={[{ required: true, message: '確定回収時間を選択してください' }]}
                        >
                          <TimePicker style={{ width: '100%' }} format="HH:mm" />
                        </Form.Item>
                      </Form>
                    </div>
                  ),
                  onOk: () => {
                    // フォーム送信は上記のonFinishで処理
                  },
                })
              }}
            >
              確定
            </Button>
          )}
          {record.status === 'PENDING' && (
            <Button
              type="text"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleCancel(record.id)}
            >
              キャンセル
            </Button>
          )}
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="この廃棄依頼を削除しますか？"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            >
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ステータス別のフィルタ
  const pendingRequests = requests.filter(r => r.status === 'PENDING')
  const confirmedRequests = requests.filter(r => r.status === 'CONFIRMED')
  const completedRequests = requests.filter(r => r.status === 'COMPLETED')
  const cancelledRequests = requests.filter(r => r.status === 'CANCELLED')

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
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            <ClockCircleOutlined /> 廃棄依頼管理
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新規依頼
          </Button>
        </div>

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

      {/* 作成・編集モーダル */}
      <Modal
        title={editingRequest ? '廃棄依頼編集' : '廃棄依頼作成'}
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="store_id"
                label="店舗"
                rules={[
                  { required: true, message: '店舗を選択してください' },
                ]}
              >
                <Select placeholder="店舗を選択してください">
                  {stores.map(store => (
                    <Option key={store.id} value={store.id}>
                      {store.name} ({store.store_code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="collector_id"
                label="収集業者"
                rules={[
                  { required: true, message: '収集業者を選択してください' },
                ]}
              >
                <Select placeholder="収集業者を選択してください">
                  {collectors.map(collector => (
                    <Option key={collector.id} value={collector.id}>
                      {collector.company_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="plan_id"
            label="予定"
            rules={[
              { required: true, message: '予定を選択してください' },
            ]}
          >
            <Select placeholder="予定を選択してください">
              {plans.map(plan => (
                <Option key={plan.id} value={plan.id}>
                  {plan.item_name} ({plan.planned_quantity}{plan.unit}) - {dayjs(plan.planned_pickup_date).format('YYYY-MM-DD')}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="request_date"
                label="依頼日"
                rules={[
                  { required: true, message: '依頼日を選択してください' },
                ]}
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder="依頼日を選択してください"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="requested_pickup_date"
                label="希望回収日"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="希望回収日を選択してください"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="備考"
          >
            <Input.TextArea placeholder="備考を入力してください" rows={3} />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleModalCancel}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRequest ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CollectionRequests

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
  message,
  Tag,
  Row,
  Col,
  Typography,
  DatePicker,
  TimePicker,
  Statistic,
  Tabs,
  Alert,
  Badge,
  Spin,
} from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  CalendarOutlined,
  UserOutlined,
  LogoutOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { PlanRepository } from '@/modules/plans/repository'
import { WasteTypeMasterRepository } from '@/modules/waste-type-masters/repository'
import type { CollectionRequest, Store, Plan, Collector, WasteTypeMaster, WasteTypeMasterCreate, WasteTypeMasterUpdate } from '@contracts/v0/schema'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

interface CollectorDashboardProps {
  collector: Collector
  onLogout: () => void
}

const CollectorDashboard: React.FC<CollectorDashboardProps> = ({ collector, onLogout }) => {
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [wasteTypeMasters, setWasteTypeMasters] = useState<WasteTypeMaster[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 廃棄物種別マスター関連の状態
  const [wasteTypeModalVisible, setWasteTypeModalVisible] = useState(false)
  const [editingWasteType, setEditingWasteType] = useState<WasteTypeMaster | null>(null)
  const [wasteTypeSearchQuery, setWasteTypeSearchQuery] = useState('')
  const [wasteTypeForm] = Form.useForm()
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<CollectionRequest | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [requestsData, storesData, plansData, wasteTypeMastersData] = await Promise.all([
        CollectionRequestRepository.findByCollectorId(collector.id),
        StoreRepository.findMany(),
        PlanRepository.findMany(),
        WasteTypeMasterRepository.findByCollectorId(collector.id),
      ])
      
      setRequests(requestsData)
      setStores(storesData)
      setPlans(plansData)
      setWasteTypeMasters(wasteTypeMastersData)
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

  // 依頼確定
  const handleConfirm = async (values: { confirmed_date: any, confirmed_time: any, notes?: string }) => {
    if (!selectedRequest) return

    try {
      await CollectionRequestRepository.update(selectedRequest.id, {
        status: 'CONFIRMED',
        confirmed_pickup_date: values.confirmed_date.format('YYYY-MM-DD'),
        confirmed_pickup_time: values.confirmed_time.format('HH:mm'),
        notes: values.notes,
      })
      
      message.success('依頼を確定しました')
      setConfirmModalVisible(false)
      setSelectedRequest(null)
      form.resetFields()
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

  // 確定モーダルを開く
  const openConfirmModal = (request: CollectionRequest) => {
    setSelectedRequest(request)
    setConfirmModalVisible(true)
    form.resetFields()
  }

  // 確定モーダルを閉じる
  const closeConfirmModal = () => {
    setConfirmModalVisible(false)
    setSelectedRequest(null)
    form.resetFields()
  }

  // 廃棄物種別マスター管理
  const handleWasteTypeCreate = () => {
    setEditingWasteType(null)
    wasteTypeForm.resetFields()
    setWasteTypeModalVisible(true)
  }

  const handleWasteTypeEdit = (wasteType: WasteTypeMaster) => {
    setEditingWasteType(wasteType)
    wasteTypeForm.setFieldsValue(wasteType)
    setWasteTypeModalVisible(true)
  }

  const handleWasteTypeSubmit = async (values: WasteTypeMasterCreate | WasteTypeMasterUpdate) => {
    try {
      const data = {
        ...values,
        collector_id: collector.id,
        org_id: collector.org_id,
        created_by_collector: collector.id,
      }

      if (editingWasteType) {
        await WasteTypeMasterRepository.update(editingWasteType.id, data)
        message.success('廃棄物種別を更新しました')
      } else {
        await WasteTypeMasterRepository.create(data as WasteTypeMasterCreate)
        message.success('廃棄物種別を作成しました')
      }
      
      setWasteTypeModalVisible(false)
      fetchData()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作に失敗しました')
    }
  }

  const handleWasteTypeDelete = async (id: string) => {
    try {
      await WasteTypeMasterRepository.delete(id)
      message.success('廃棄物種別を削除しました')
      fetchData()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  const handleWasteTypeCancel = () => {
    setWasteTypeModalVisible(false)
    setEditingWasteType(null)
    wasteTypeForm.resetFields()
  }

  // 廃棄物種別マスター検索
  const filteredWasteTypeMasters = wasteTypeMasters.filter(wasteType => {
    if (!wasteTypeSearchQuery) return true
    const query = wasteTypeSearchQuery.toLowerCase()
    return (
      wasteType.waste_type_code.toLowerCase().includes(query) ||
      wasteType.waste_type_name.toLowerCase().includes(query) ||
      wasteType.waste_category.toLowerCase().includes(query) ||
      wasteType.jwnet_waste_code.toLowerCase().includes(query)
    )
  })

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
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => openConfirmModal(record)}
            >
              確定
            </Button>
          )}
          {record.status === 'PENDING' && (
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={() => handleCancel(record.id)}
            >
              キャンセル
            </Button>
          )}
        </Space>
      ),
    },
  ]

  // 廃棄物種別マスターのテーブル定義
  const wasteTypeColumns = [
    {
      title: '廃棄物種別コード',
      dataIndex: 'waste_type_code',
      key: 'waste_type_code',
      width: 120,
    },
    {
      title: '廃棄物種別名称',
      dataIndex: 'waste_type_name',
      key: 'waste_type_name',
      ellipsis: true,
    },
    {
      title: '廃棄物の種類',
      dataIndex: 'waste_category',
      key: 'waste_category',
      width: 150,
      ellipsis: true,
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      ),
    },
    {
      title: '分類',
      dataIndex: 'waste_classification',
      key: 'waste_classification',
      width: 120,
      render: (classification: string) => {
        const color = classification === '産業廃棄物' ? 'red' : 
                    classification === '特別管理産業廃棄物' ? 'orange' : 
                    classification === '一般廃棄物' ? 'green' : 'default'
        return <Tag color={color}>{classification}</Tag>
      },
    },
    {
      title: 'JWNET廃棄物コード',
      dataIndex: 'jwnet_waste_code',
      key: 'jwnet_waste_code',
      width: 120,
    },
    {
      title: 'JWNET廃棄物名称',
      dataIndex: 'jwnet_waste_name',
      key: 'jwnet_waste_name',
      ellipsis: true,
    },
    {
      title: '単位',
      dataIndex: 'unit_name',
      key: 'unit_name',
      width: 80,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: WasteTypeMaster) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleWasteTypeEdit(record)}
          >
            編集
          </Button>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleWasteTypeDelete(record.id)}
          >
            削除
          </Button>
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
      {/* ヘッダー */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {collector.company_name}
                </Title>
                <Text type="secondary">
                  担当者: {collector.contact_person} | {collector.email}
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                更新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 統計カード */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
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
          <TabPane tab={`廃棄物種別マスター (${wasteTypeMasters.length})`} key="waste-types">
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col flex="auto">
                  <Input
                    placeholder="廃棄物種別で検索..."
                    prefix={<SearchOutlined />}
                    value={wasteTypeSearchQuery}
                    onChange={(e) => setWasteTypeSearchQuery(e.target.value)}
                    allowClear
                  />
                </Col>
                <Col>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleWasteTypeCreate}
                  >
                    新規作成
                  </Button>
                </Col>
              </Row>
            </div>
            <Table
              columns={wasteTypeColumns}
              dataSource={filteredWasteTypeMasters}
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

      {/* 確定モーダル */}
      <Modal
        title="依頼確定"
        open={confirmModalVisible}
        onCancel={closeConfirmModal}
        footer={null}
        width={500}
      >
        {selectedRequest && (
          <div style={{ marginBottom: 16 }}>
            <Alert
              message="依頼内容"
              description={
                <div>
                  <p><strong>店舗:</strong> {stores.find(s => s.id === selectedRequest.store_id)?.name}</p>
                  <p><strong>予定:</strong> {plans.find(p => p.id === selectedRequest.plan_id)?.item_name}</p>
                  <p><strong>希望回収日:</strong> {selectedRequest.requested_pickup_date ? dayjs(selectedRequest.requested_pickup_date).format('YYYY-MM-DD') : '未指定'}</p>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleConfirm}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="confirmed_date"
                label="確定回収日"
                rules={[
                  { required: true, message: '確定回収日を選択してください' },
                ]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="確定回収日を選択してください"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="confirmed_time"
                label="確定回収時間"
                rules={[
                  { required: true, message: '確定回収時間を選択してください' },
                ]}
              >
                <TimePicker
                  style={{ width: '100%' }}
                  format="HH:mm"
                  placeholder="確定回収時間を選択してください"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="備考"
          >
            <Input.TextArea
              placeholder="備考を入力してください（任意）"
              rows={3}
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={closeConfirmModal}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                確定
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 廃棄物種別マスター作成・編集モーダル */}
      <Modal
        title={editingWasteType ? '廃棄物種別編集' : '廃棄物種別作成'}
        open={wasteTypeModalVisible}
        onCancel={handleWasteTypeCancel}
        footer={null}
        width={800}
      >
        <Form
          form={wasteTypeForm}
          layout="vertical"
          onFinish={handleWasteTypeSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="waste_type_code"
                label="廃棄物種別コード"
                rules={[
                  { required: true, message: '廃棄物種別コードを入力してください' },
                  { min: 1, max: 20, message: '1-20文字で入力してください' },
                ]}
                extra="業者独自の廃棄物種別コード"
              >
                <Input placeholder="例: WT001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="waste_type_name"
                label="廃棄物種別名称"
                rules={[
                  { required: true, message: '廃棄物種別名称を入力してください' },
                  { min: 1, max: 255, message: '1-255文字で入力してください' },
                ]}
              >
                <Input placeholder="例: プラスチック類" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="waste_category"
                label="廃棄物の種類"
                rules={[
                  { required: true, message: '廃棄物の種類を入力してください' },
                  { min: 1, max: 100, message: '1-100文字で入力してください' },
                ]}
              >
                <Input placeholder="例: プラスチック類" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="waste_classification"
                label="廃棄物の分類"
                rules={[
                  { required: true, message: '廃棄物の分類を選択してください' },
                ]}
              >
                <Select placeholder="廃棄物の分類を選択してください">
                  <Option value="産業廃棄物">産業廃棄物</Option>
                  <Option value="特別管理産業廃棄物">特別管理産業廃棄物</Option>
                  <Option value="一般廃棄物">一般廃棄物</Option>
                  <Option value="その他">その他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="jwnet_waste_code"
                label="JWNET廃棄物コード"
                rules={[
                  { required: true, message: 'JWNET廃棄物コードを入力してください' },
                  { min: 1, max: 20, message: '1-20文字で入力してください' },
                ]}
                extra="JWNET連携に必要な廃棄物コード"
              >
                <Input placeholder="例: 1500000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="jwnet_waste_name"
                label="JWNET廃棄物名称"
                rules={[
                  { required: true, message: 'JWNET廃棄物名称を入力してください' },
                  { min: 1, max: 255, message: '1-255文字で入力してください' },
                ]}
                extra="JWNET連携に必要な廃棄物名称"
              >
                <Input placeholder="例: がれき類（工作物の新築、改築又は除去に伴って生じた不要物）" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="unit_code"
                label="単位コード"
                rules={[
                  { required: true, message: '単位コードを入力してください' },
                  { min: 1, max: 10, message: '1-10文字で入力してください' },
                ]}
              >
                <Input placeholder="例: 2" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit_name"
                label="単位名称"
                rules={[
                  { required: true, message: '単位名称を入力してください' },
                  { min: 1, max: 20, message: '1-20文字で入力してください' },
                ]}
              >
                <Input placeholder="例: ｍ³" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="説明"
          >
            <Input.TextArea
              placeholder="廃棄物種別の詳細説明（任意）"
              rows={3}
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleWasteTypeCancel}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                {editingWasteType ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CollectorDashboard

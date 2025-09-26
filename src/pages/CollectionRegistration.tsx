import React, { useState, useEffect } from 'react'
import { 
  Card, Tabs, Table, Button, Space, Tag, Modal, 
  Form, Input, Select, DatePicker, InputNumber, message, 
  Typography, Row, Col, Statistic, Alert,
  Tooltip, Popconfirm, Divider
} from 'antd'
import { 
  CheckCircleOutlined, CalendarOutlined, 
  PlusOutlined, EditOutlined, DeleteOutlined,
  FileTextOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, ReloadOutlined,
  UploadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { CollectionRepository } from '@/modules/collections/repository'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { CollectorRepository } from '@/modules/collectors/repository'
import { PlanRepository } from '@/modules/plans/repository'
import { WasteTypeMasterRepository } from '@/modules/waste-type-masters/repository'
import type { Collection, CollectionRequest, Store, Collector, Plan, WasteTypeMaster } from '@contracts/v0/schema'

const { Title, Text } = Typography
const { TabPane } = Tabs
const { Option } = Select

// ============================================================================
// 回収情報登録画面
// ============================================================================

const CollectionRegistration: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('registration')
  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [wasteTypes, setWasteTypes] = useState<WasteTypeMaster[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      const [collectionsData, requestsData, storesData, collectorsData, plansData, wasteTypesData] = await Promise.all([
        CollectionRepository.findMany(),
        CollectionRequestRepository.findMany(),
        StoreRepository.findMany(),
        CollectorRepository.findMany(),
        PlanRepository.findMany(),
        WasteTypeMasterRepository.findMany()
      ])
      setCollections(collectionsData)
      setRequests(requestsData)
      setStores(storesData)
      setCollectors(collectorsData)
      setPlans(plansData)
      setWasteTypes(wasteTypesData)
    } catch (error) {
      console.error('データ取得エラー:', error)
      message.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 店舗名取得
  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId)
    return store?.name || '不明な店舗'
  }

  // 収集業者名取得
  const getCollectorName = (collectorId: string) => {
    const collector = collectors.find(c => c.id === collectorId)
    return collector?.name || collector?.company_name || '不明な業者'
  }

  // 廃棄物種別名取得
  const getWasteTypeName = (wasteTypeId: string) => {
    const wasteType = wasteTypes.find(w => w.id === wasteTypeId)
    return wasteType?.description || '不明な種別'
  }

  // ステータス表示
  const getStatusTag = (status: string) => {
    const statusConfig = {
      'PENDING': { color: 'orange', text: '待機中', icon: <ClockCircleOutlined /> },
      'COLLECTED': { color: 'green', text: '回収済み', icon: <CheckCircleOutlined /> },
      'VERIFIED': { color: 'blue', text: '確認済み', icon: <CheckCircleOutlined /> },
      'REJECTED': { color: 'red', text: '却下', icon: <ExclamationCircleOutlined /> }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  // 回収情報登録タブの列定義
  const registrationColumns = [
    {
      title: '回収ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {id.slice(-8)}
        </Text>
      )
    },
    {
      title: '店舗名',
      dataIndex: 'store_id',
      key: 'store_id',
      render: (storeId: string) => getStoreName(storeId)
    },
    {
      title: '収集業者',
      dataIndex: 'collector_id',
      key: 'collector_id',
      render: (collectorId: string) => getCollectorName(collectorId)
    },
    {
      title: '廃棄物種別',
      dataIndex: 'waste_type_id',
      key: 'waste_type_id',
      render: (wasteTypeId: string) => getWasteTypeName(wasteTypeId)
    },
    {
      title: '回収量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: Collection) => (
        <Text>{quantity} {record.unit}</Text>
      )
    },
    {
      title: '回収日',
      dataIndex: 'collected_at',
      key: 'collected_at',
      render: (date: string) => dayjs(date).format('YYYY/MM/DD HH:mm')
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: Collection) => (
        <Space size="small">
          <Tooltip title="編集">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="この回収情報を削除しますか？"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Tooltip title="削除">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  // 回収日程確認タブの列定義
  const scheduleColumns = [
    {
      title: '依頼ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {id.slice(-8)}
        </Text>
      )
    },
    {
      title: '店舗名',
      dataIndex: 'store_id',
      key: 'store_id',
      render: (storeId: string) => getStoreName(storeId)
    },
    {
      title: '収集業者',
      dataIndex: 'collector_id',
      key: 'collector_id',
      render: (collectorId: string) => getCollectorName(collectorId)
    },
    {
      title: '希望回収日',
      dataIndex: 'requested_pickup_date',
      key: 'requested_pickup_date',
      render: (date: string) => date ? dayjs(date).format('YYYY/MM/DD') : '-'
    },
    {
      title: '確定回収日',
      dataIndex: 'confirmed_pickup_date',
      key: 'confirmed_pickup_date',
      render: (date: string) => date ? dayjs(date).format('YYYY/MM/DD') : '-'
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record: CollectionRequest) => (
        <Space size="small">
          {record.status === 'CONFIRMED' && (
            <Button 
              type="primary" 
              size="small"
              onClick={() => handleStartCollection(record)}
            >
              回収開始
            </Button>
          )}
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditRequest(record)}
          />
        </Space>
      )
    }
  ]

  // 編集処理
  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection)
    form.setFieldsValue({
      ...collection,
      collected_at: collection.actual_pickup_date ? dayjs(collection.actual_pickup_date) : null
    })
    setIsModalVisible(true)
  }

  // 削除処理
  const handleDelete = async (id: string) => {
    try {
      await CollectionRepository.delete(id)
      message.success('回収情報を削除しました')
      fetchData()
    } catch (error) {
      console.error('削除エラー:', error)
      message.error('削除に失敗しました')
    }
  }

  // 回収開始処理
  const handleStartCollection = async (request: CollectionRequest) => {
    try {
      // 回収情報を作成
      const collectionData = {
        request_id: request.id,
        store_id: request.store_id,
        collector_id: request.collector_id,
        waste_type_id: '', // 実際の実装では適切な廃棄物種別を設定
        quantity: 0,
        unit: 'kg',
        collected_at: new Date().toISOString(),
        status: 'PENDING' as const,
        notes: ''
      }
      await CollectionRepository.create(collectionData)

      // 依頼ステータスを更新
      await CollectionRequestRepository.update(request.id, {
        ...request,
        status: 'COLLECTED'
      })

      message.success('回収を開始しました')
      fetchData()
    } catch (error) {
      console.error('回収開始エラー:', error)
      message.error('回収開始に失敗しました')
    }
  }

  // 依頼編集処理
  const handleEditRequest = (request: CollectionRequest) => {
    // 依頼編集のロジック（必要に応じて実装）
    message.info('依頼編集機能は開発中です')
  }

  // モーダル保存処理
  const handleModalSave = async () => {
    try {
      const values = await form.validateFields()
      const collectionData = {
        ...values,
        collected_at: values.collected_at?.toISOString()
      }

      if (editingCollection) {
        await CollectionRepository.update(editingCollection.id, collectionData)
        message.success('回収情報を更新しました')
      } else {
        await CollectionRepository.create(collectionData)
        message.success('回収情報を作成しました')
      }

      setIsModalVisible(false)
      setEditingCollection(null)
      form.resetFields()
      fetchData()
    } catch (error) {
      console.error('保存エラー:', error)
      message.error('保存に失敗しました')
    }
  }

  // 統計情報
  const stats = {
    total: collections.length,
    pending: collections.filter(c => c.status === 'SCHEDULED').length,
    collected: collections.filter(c => c.status === 'COMPLETED').length,
    verified: collections.filter(c => c.status === 'VERIFIED').length
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <CheckCircleOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  回収情報登録
                </Title>
                <Text type="secondary">
                  廃棄物回収実績の登録と日程管理
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchData}
                loading={loading}
              >
                更新
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingCollection(null)
                  form.resetFields()
                  setIsModalVisible(true)
                }}
              >
                新規登録
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 統計情報 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="総回収数"
              value={stats.total}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待機中"
              value={stats.pending}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="回収済み"
              value={stats.collected}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="確認済み"
              value={stats.verified}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* メインコンテンツ */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
        >
          <TabPane 
            tab={
              <span>
                <CheckCircleOutlined />
                回収情報登録
              </span>
            } 
            key="registration"
          >
            <Table
              columns={registrationColumns}
              dataSource={collections}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `全 ${total} 件`
              }}
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <CalendarOutlined />
                回収日程確認
              </span>
            } 
            key="schedule"
          >
            <Alert
              message="回収日程確認"
              description="確定した回収日程の確認と回収開始を行います。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Table
              columns={scheduleColumns}
              dataSource={requests.filter(r => r.status === 'CONFIRMED' || r.status === 'COMPLETED')}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `全 ${total} 件`
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 編集モーダル */}
      <Modal
        title={editingCollection ? '回収情報編集' : '新規回収情報登録'}
        open={isModalVisible}
        onOk={handleModalSave}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingCollection(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="store_id"
            label="店舗"
            rules={[{ required: true, message: '店舗を選択してください' }]}
          >
            <Select placeholder="店舗を選択">
              {stores.map(store => (
                <Option key={store.id} value={store.id}>
                  {store.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="collector_id"
            label="収集業者"
            rules={[{ required: true, message: '収集業者を選択してください' }]}
          >
            <Select placeholder="収集業者を選択">
              {collectors.map(collector => (
                <Option key={collector.id} value={collector.id}>
                  {collector.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="waste_type_id"
            label="廃棄物種別"
            rules={[{ required: true, message: '廃棄物種別を選択してください' }]}
          >
            <Select placeholder="廃棄物種別を選択">
              {wasteTypes.map(wasteType => (
                <Option key={wasteType.id} value={wasteType.id}>
                  {wasteType.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="回収量"
                rules={[{ required: true, message: '回収量を入力してください' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  placeholder="回収量"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="単位"
                rules={[{ required: true, message: '単位を選択してください' }]}
              >
                <Select placeholder="単位を選択">
                  <Option value="kg">kg</Option>
                  <Option value="L">L</Option>
                  <Option value="PCS">個</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="collected_at"
            label="回収日時"
            rules={[{ required: true, message: '回収日時を選択してください' }]}
          >
            <DatePicker 
              showTime 
              style={{ width: '100%' }} 
              format="YYYY-MM-DD HH:mm"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="ステータス"
            rules={[{ required: true, message: 'ステータスを選択してください' }]}
          >
            <Select placeholder="ステータスを選択">
              <Option value="PENDING">待機中</Option>
              <Option value="COLLECTED">回収済み</Option>
              <Option value="VERIFIED">確認済み</Option>
              <Option value="REJECTED">却下</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="備考"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CollectionRegistration




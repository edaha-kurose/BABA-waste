import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Tag,
  Row,
  Col,
  Typography,
  Tabs,
  Statistic,
  Alert,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  InputNumber,
  Select,
  Upload,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { CollectionRepository } from '@/modules/collections/repository'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { CollectorRepository } from '@/modules/collectors/repository'
import { PlanRepository } from '@/modules/plans/repository'
import { WasteTypeMasterRepository } from '@/modules/waste-type-masters/repository'
import { jwnetService } from '@/services/jwnet-service'
import type { Collection, CollectionRequest, Store, Collector, Plan, WasteTypeMaster } from '@contracts/v0/schema'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select
const { TextArea } = Input

const Collections: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([])
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [wasteTypeMasters, setWasteTypeMasters] = useState<WasteTypeMaster[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [
        collectionsData,
        requestsData,
        storesData,
        collectorsData,
        plansData,
        wasteTypeMastersData
      ] = await Promise.all([
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
  }, [])

  // 新規作成
  const handleCreate = () => {
    setEditingCollection(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 編集
  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection)
    form.setFieldsValue({
      ...collection,
      actual_pickup_date: collection.actual_pickup_date ? dayjs(collection.actual_pickup_date) : null,
    })
    setModalVisible(true)
  }

  // 保存
  const handleSave = async (values: any) => {
    try {
      const collectionData = {
        ...values,
        actual_pickup_date: values.actual_pickup_date?.toISOString(),
        org_id: 'org-1', // 実際の実装では認証されたユーザーのorg_idを使用
      }

      if (editingCollection) {
        await CollectionRepository.update(editingCollection.id, collectionData)
        message.success('収集実績を更新しました')
      } else {
        await CollectionRepository.create(collectionData)
        message.success('収集実績を作成しました')
      }

      setModalVisible(false)
      fetchData()
    } catch (err) {
      console.error('Failed to save collection:', err)
      message.error('収集実績の保存に失敗しました')
    }
  }

  // 削除
  const handleDelete = async (id: string) => {
    try {
      await CollectionRepository.delete(id)
      message.success('収集実績を削除しました')
      fetchData()
    } catch (err) {
      console.error('Failed to delete collection:', err)
      message.error('収集実績の削除に失敗しました')
    }
  }

  // JWNET本登録送信
  const handleSubmitToJwnet = async (id: string) => {
    try {
      const jwnetResult = await jwnetService.submitRegistration(id)
      message.success(`JWNET本登録を送信しました (ID: ${jwnetResult.jwnetId})`)
      fetchData()
    } catch (err) {
      console.error('JWNET submission failed:', err)
      message.error('JWNET本登録の送信に失敗しました')
    }
  }

  // ステータス別の色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'blue'
      case 'IN_PROGRESS': return 'orange'
      case 'COMPLETED': return 'green'
      case 'CANCELLED': return 'red'
      default: return 'default'
    }
  }

  // ステータス別のラベル
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return '予定'
      case 'IN_PROGRESS': return '進行中'
      case 'COMPLETED': return '完了'
      case 'CANCELLED': return 'キャンセル'
      default: return status
    }
  }

  // 統計データ
  const stats = {
    total: collections.length,
    scheduled: collections.filter(c => c.status === 'SCHEDULED').length,
    inProgress: collections.filter(c => c.status === 'IN_PROGRESS').length,
    completed: collections.filter(c => c.status === 'COMPLETED').length,
    cancelled: collections.filter(c => c.status === 'CANCELLED').length,
  }

  // テーブル列定義
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <span style={{ fontFamily: 'monospace' }}>{id.slice(-8)}</span>,
    },
    {
      title: '店舗',
      key: 'store',
      render: (_: any, record: Collection) => {
        const request = requests.find(r => r.id === record.collection_request_id)
        const store = request ? stores.find(s => s.id === request.store_id) : null
        return store ? store.name : '-'
      },
    },
    {
      title: '収集業者',
      key: 'collector',
      render: (_: any, record: Collection) => {
        const request = requests.find(r => r.id === record.collection_request_id)
        const collector = request ? collectors.find(c => c.id === request.collector_id) : null
        return collector ? collector.company_name : '-'
      },
    },
    {
      title: '収集日時',
      dataIndex: 'actual_pickup_date',
      key: 'actual_pickup_date',
      render: (date: string, record: Collection) => {
        if (!date) return '-'
        const formattedDate = dayjs(date).format('YYYY-MM-DD')
        const time = record.actual_pickup_time || '-'
        return `${formattedDate} ${time}`
      },
    },
    {
      title: '数量',
      key: 'quantity',
      render: (_: any, record: Collection) => `${record.actual_quantity} ${record.unit}`,
    },
    {
      title: '運転手',
      dataIndex: 'driver_name',
      key: 'driver_name',
      render: (name: string) => name || '-',
    },
    {
      title: '車両番号',
      dataIndex: 'vehicle_number',
      key: 'vehicle_number',
      render: (number: string) => number || '-',
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
      title: 'JWNET登録',
      key: 'jwnet',
      render: (_: any, record: Collection) => (
        <Space>
          {record.jwnet_registration_id ? (
            <Tag color="green">登録済み</Tag>
          ) : (
            <Button
              type="link"
              size="small"
              onClick={() => handleSubmitToJwnet(record.id)}
            >
              JWNET送信
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Collection) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            削除
          </Button>
        </Space>
      ),
    },
  ]

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
            <Title level={3} style={{ margin: 0 }}>
              <CheckCircleOutlined /> 収集実績管理
            </Title>
            <p style={{ margin: 0, color: '#666' }}>
              廃棄物の収集実績を記録・管理します
            </p>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新規作成
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 統計カード */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="総数" value={stats.total} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="予定" value={stats.scheduled} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="進行中" value={stats.inProgress} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic title="完了" value={stats.completed} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      {/* テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={collections}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
          }}
        />
      </Card>

      {/* 作成・編集モーダル */}
      <Modal
        title={editingCollection ? '収集実績編集' : '収集実績作成'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="collection_request_id"
            label="廃棄依頼"
            rules={[{ required: true, message: '廃棄依頼を選択してください' }]}
          >
            <Select placeholder="廃棄依頼を選択">
              {requests.map(request => {
                const store = stores.find(s => s.id === request.store_id)
                const collector = collectors.find(c => c.id === request.collector_id)
                return (
                  <Option key={request.id} value={request.id}>
                    {store?.name} - {collector?.company_name}
                  </Option>
                )
              })}
            </Select>
          </Form.Item>

          <Form.Item
            name="actual_pickup_date"
            label="収集日"
            rules={[{ required: true, message: '収集日を選択してください' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="actual_pickup_time"
            label="収集時間"
            rules={[{ required: true, message: '収集時間を選択してください' }]}
          >
            <TimePicker style={{ width: '100%' }} format="HH:mm" />
          </Form.Item>

          <Form.Item
            name="waste_type_master_id"
            label="廃棄物種別"
            rules={[{ required: true, message: '廃棄物種別を選択してください' }]}
          >
            <Select 
              placeholder="廃棄物種別を選択"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {wasteTypeMasters.map(wasteType => (
                <Option key={wasteType.id} value={wasteType.id}>
                  {wasteType.waste_type_code} - {wasteType.waste_type_name} ({wasteType.jwnet_waste_code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="actual_quantity"
            label="実際の数量"
            rules={[{ required: true, message: '実際の数量を入力してください' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
          </Form.Item>

          <Form.Item
            name="unit"
            label="単位"
            rules={[{ required: true, message: '単位を選択してください' }]}
          >
            <Select placeholder="単位を選択">
              <Option value="kg">kg</Option>
              <Option value="L">L</Option>
              <Option value="PCS">PCS</Option>
              <Option value="m³">m³</Option>
              <Option value="T">T</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="driver_name"
            label="運転手名"
          >
            <Input placeholder="運転手名を入力" />
          </Form.Item>

          <Form.Item
            name="vehicle_number"
            label="車両番号"
          >
            <Input placeholder="車両番号を入力" />
          </Form.Item>

          <Form.Item
            name="status"
            label="ステータス"
            rules={[{ required: true, message: 'ステータスを選択してください' }]}
          >
            <Select placeholder="ステータスを選択">
              <Option value="SCHEDULED">予定</Option>
              <Option value="IN_PROGRESS">進行中</Option>
              <Option value="COMPLETED">完了</Option>
              <Option value="CANCELLED">キャンセル</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="photo_urls"
            label="写真URL"
          >
            <TextArea
              rows={3}
              placeholder="写真URLを1行に1つずつ入力"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備考"
          >
            <TextArea
              rows={3}
              placeholder="備考を入力"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Collections

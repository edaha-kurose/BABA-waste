import React, { useState, useEffect } from 'react'
import { 
  Card, Tabs, Table, Button, Space, Tag, Modal, 
  Form, Input, Select, DatePicker, message, 
  Typography, Row, Col, Statistic, Alert,
  Tooltip, Popconfirm, Progress, Badge
} from 'antd'
import { 
  DatabaseOutlined, CodeOutlined, 
  PlusOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, ReloadOutlined,
  SendOutlined, EyeOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { JwnetReservationRepository } from '@/modules/jwnet-reservations/repository'
import { JwnetRegistrationRepository } from '@/modules/jwnet-registrations/repository'
import { JwnetWasteCodeRepository } from '@/modules/jwnet-waste-codes/repository'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { CollectionRepository } from '@/modules/collections/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { CollectorRepository } from '@/modules/collectors/repository'
import { PlanRepository } from '@/modules/plans/repository'
import type { 
  JwnetReservation, JwnetRegistration, JwnetWasteCode,
  CollectionRequest, Collection, Store, Collector, Plan 
} from '@contracts/v0/schema'

const { Title, Text } = Typography
const { TabPane } = Tabs
const { Option } = Select

// ============================================================================
// JWNET登録データ画面
// ============================================================================

const JwnetRegistrationData: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('jwnet-management')
  const [loading, setLoading] = useState(false)
  const [reservations, setReservations] = useState<JwnetReservation[]>([])
  const [registrations, setRegistrations] = useState<JwnetRegistration[]>([])
  const [wasteCodes, setWasteCodes] = useState<JwnetWasteCode[]>([])
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      const [
        reservationsData, registrationsData, wasteCodesData,
        requestsData, collectionsData, storesData, collectorsData, plansData
      ] = await Promise.all([
        JwnetReservationRepository.findMany(),
        JwnetRegistrationRepository.findMany(),
        JwnetWasteCodeRepository.findMany(),
        CollectionRequestRepository.findMany(),
        CollectionRepository.findMany(),
        StoreRepository.findMany(),
        CollectorRepository.findMany(),
        PlanRepository.findMany()
      ])
      setReservations(reservationsData)
      setRegistrations(registrationsData)
      setWasteCodes(wasteCodesData)
      setRequests(requestsData)
      setCollections(collectionsData)
      setStores(storesData)
      setCollectors(collectorsData)
      setPlans(plansData)
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

  // JWNETステータス表示
  const getJwnetStatusTag = (status: string) => {
    const statusConfig = {
      'PENDING': { color: 'orange', text: '送信待ち', icon: <ClockCircleOutlined /> },
      'SENT': { color: 'blue', text: '送信済み', icon: <SendOutlined /> },
      'CONFIRMED': { color: 'green', text: '確認済み', icon: <CheckCircleOutlined /> },
      'REJECTED': { color: 'red', text: '却下', icon: <ExclamationCircleOutlined /> },
      'ERROR': { color: 'red', text: 'エラー', icon: <ExclamationCircleOutlined /> }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  // JWNET管理タブの列定義
  const jwnetManagementColumns = [
    {
      title: 'ID',
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
      title: '種別',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'RESERVATION' ? 'blue' : 'green'}>
          {type === 'RESERVATION' ? '予約' : '本登録'}
        </Tag>
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
      title: 'JWNETステータス',
      dataIndex: 'jwnet_status',
      key: 'jwnet_status',
      render: (status: string) => getJwnetStatusTag(status)
    },
    {
      title: '送信日時',
      dataIndex: 'sent_at',
      key: 'sent_at',
      render: (date: string) => date ? dayjs(date).format('YYYY/MM/DD HH:mm') : '-'
    },
    {
      title: '確認日時',
      dataIndex: 'confirmed_at',
      key: 'confirmed_at',
      render: (date: string) => date ? dayjs(date).format('YYYY/MM/DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: any) => (
        <Space size="small">
          <Tooltip title="詳細">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleView(record)}
            />
          </Tooltip>
          {record.jwnet_status === 'PENDING' && (
            <Tooltip title="送信">
              <Button 
                type="primary" 
                size="small"
                icon={<SendOutlined />}
                onClick={() => handleSend(record)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  // 廃棄物コードタブの列定義
  const wasteCodeColumns = [
    {
      title: 'コード',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {code}
        </Text>
      )
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'カテゴリ',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      )
    },
    {
      title: '処理方法',
      dataIndex: 'disposal_method',
      key: 'disposal_method'
    },
    {
      title: '単位',
      dataIndex: 'unit',
      key: 'unit',
      render: (unit: string) => (
        <Tag color="green">{unit}</Tag>
      )
    },
    {
      title: '有効',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Badge 
          status={isActive ? 'success' : 'default'} 
          text={isActive ? '有効' : '無効'} 
        />
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: JwnetWasteCode) => (
        <Space size="small">
          <Tooltip title="編集">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditWasteCode(record)}
            />
          </Tooltip>
          <Popconfirm
            title="この廃棄物コードを削除しますか？"
            onConfirm={() => handleDeleteWasteCode(record.id)}
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

  // 詳細表示処理
  const handleView = (record: any) => {
    Modal.info({
      title: 'JWNETデータ詳細',
      width: 600,
      content: (
        <div>
          <p><strong>ID:</strong> {record.id}</p>
          <p><strong>種別:</strong> {record.type === 'RESERVATION' ? '予約' : '本登録'}</p>
          <p><strong>店舗:</strong> {getStoreName(record.store_id)}</p>
          <p><strong>収集業者:</strong> {getCollectorName(record.collector_id)}</p>
          <p><strong>ステータス:</strong> {record.jwnet_status}</p>
          <p><strong>送信日時:</strong> {record.sent_at ? dayjs(record.sent_at).format('YYYY/MM/DD HH:mm') : '-'}</p>
          <p><strong>確認日時:</strong> {record.confirmed_at ? dayjs(record.confirmed_at).format('YYYY/MM/DD HH:mm') : '-'}</p>
          <p><strong>備考:</strong> {record.notes || '-'}</p>
        </div>
      )
    })
  }

  // 送信処理
  const handleSend = async (record: any) => {
    try {
      // JWNET送信のロジック（モック実装）
      message.success('JWNETに送信しました')
      fetchData()
    } catch (error) {
      console.error('送信エラー:', error)
      message.error('送信に失敗しました')
    }
  }

  // 廃棄物コード編集処理
  const handleEditWasteCode = (wasteCode: JwnetWasteCode) => {
    setEditingItem(wasteCode)
    form.setFieldsValue(wasteCode)
    setIsModalVisible(true)
  }

  // 廃棄物コード削除処理
  const handleDeleteWasteCode = async (id: string) => {
    try {
      await JwnetWasteCodeRepository.delete(id)
      message.success('廃棄物コードを削除しました')
      fetchData()
    } catch (error) {
      console.error('削除エラー:', error)
      message.error('削除に失敗しました')
    }
  }

  // モーダル保存処理
  const handleModalSave = async () => {
    try {
      const values = await form.validateFields()

      if (editingItem) {
        await JwnetWasteCodeRepository.update(editingItem.id, values)
        message.success('廃棄物コードを更新しました')
      } else {
        await JwnetWasteCodeRepository.create(values)
        message.success('廃棄物コードを作成しました')
      }

      setIsModalVisible(false)
      setEditingItem(null)
      form.resetFields()
      fetchData()
    } catch (error) {
      console.error('保存エラー:', error)
      message.error('保存に失敗しました')
    }
  }

  // 統計情報
  const stats = {
    totalReservations: reservations.length,
    totalRegistrations: registrations.length,
    pendingReservations: reservations.filter(r => r.status === 'PENDING').length,
    confirmedReservations: reservations.filter(r => r.status === 'ACCEPTED').length,
    totalWasteCodes: wasteCodes.length,
    activeWasteCodes: wasteCodes.filter(w => w.is_active).length
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <DatabaseOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  JWNET登録データ
                </Title>
                <Text type="secondary">
                  JWNET連携データの管理と廃棄物コード設定
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
                  setEditingItem(null)
                  form.resetFields()
                  setIsModalVisible(true)
                }}
              >
                廃棄物コード追加
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
              title="予約データ数"
              value={stats.totalReservations}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本登録データ数"
              value={stats.totalRegistrations}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="送信待ち"
              value={stats.pendingReservations}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="廃棄物コード数"
              value={stats.totalWasteCodes}
              prefix={<CodeOutlined />}
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
                <DatabaseOutlined />
                JWNET管理
              </span>
            } 
            key="jwnet-management"
          >
            <Alert
              message="JWNET管理"
              description="JWNETへの予約・本登録データの送信状況を管理します。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            {/* 予約データ */}
            <Card title="予約データ" style={{ marginBottom: '16px' }}>
              <Table
                columns={jwnetManagementColumns}
                dataSource={reservations}
                rowKey="id"
                loading={loading}
                pagination={{
                  pageSize: 5,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `全 ${total} 件`
                }}
              />
            </Card>

            {/* 本登録データ */}
            <Card title="本登録データ">
              <Table
                columns={jwnetManagementColumns}
                dataSource={registrations}
                rowKey="id"
                loading={loading}
                pagination={{
                  pageSize: 5,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `全 ${total} 件`
                }}
              />
            </Card>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <CodeOutlined />
                廃棄物コード
              </span>
            } 
            key="waste-codes"
          >
            <Alert
              message="廃棄物コード管理"
              description="JWNET連携に必要な廃棄物コードのマスターを管理します。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Table
              columns={wasteCodeColumns}
              dataSource={wasteCodes}
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
        title={editingItem ? '廃棄物コード編集' : '新規廃棄物コード追加'}
        open={isModalVisible}
        onOk={handleModalSave}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingItem(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="code"
            label="コード"
            rules={[{ required: true, message: 'コードを入力してください' }]}
          >
            <Input placeholder="廃棄物コード" />
          </Form.Item>

          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '名称を入力してください' }]}
          >
            <Input placeholder="廃棄物名称" />
          </Form.Item>

          <Form.Item
            name="category"
            label="カテゴリ"
            rules={[{ required: true, message: 'カテゴリを入力してください' }]}
          >
            <Input placeholder="廃棄物カテゴリ" />
          </Form.Item>

          <Form.Item
            name="disposal_method"
            label="処理方法"
            rules={[{ required: true, message: '処理方法を入力してください' }]}
          >
            <Input placeholder="処理方法" />
          </Form.Item>

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

          <Form.Item
            name="is_active"
            label="有効"
            valuePropName="checked"
          >
            <input type="checkbox" />
          </Form.Item>

          <Form.Item
            name="description"
            label="説明"
          >
            <Input.TextArea rows={3} placeholder="廃棄物コードの説明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default JwnetRegistrationData




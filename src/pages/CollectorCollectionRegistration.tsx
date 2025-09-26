import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  Row,
  Col,
  Typography,
  message,
  Space,
  Divider,
  Table,
  Tag,
  Modal,
  InputNumber,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
  ShopOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { CollectionRepository } from '@/modules/collections/repository'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { WasteTypeMasterRepository } from '@/modules/waste-type-masters/repository'
import type { Collection, CollectionCreate, CollectionRequest, Store, User, WasteTypeMaster } from '@contracts/v0/schema'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

interface CollectorCollectionRegistrationProps {
  collector: User
}

interface CollectionItem {
  id: string
  waste_type_id: string
  quantity: number
  unit: string
  notes?: string
}

const CollectorCollectionRegistration: React.FC<CollectorCollectionRegistrationProps> = ({ collector }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [wasteTypes, setWasteTypes] = useState<WasteTypeMaster[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([])
  const [previewModalVisible, setPreviewModalVisible] = useState(false)

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      const [storesData, wasteTypesData, collectionsData] = await Promise.all([
        StoreRepository.findMany(),
        WasteTypeMasterRepository.findByCollectorId(collector.id),
        CollectionRepository.findByCollectorId(collector.id),
      ])
      
      setStores(storesData)
      setWasteTypes(wasteTypesData)
      setCollections(collectionsData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      message.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [collector.id])

  // 回収項目を追加
  const addCollectionItem = () => {
    const newItem: CollectionItem = {
      id: Date.now().toString(),
      waste_type_id: '',
      quantity: 0,
      unit: '',
      notes: '',
    }
    setCollectionItems([...collectionItems, newItem])
  }

  // 回収項目を削除
  const removeCollectionItem = (id: string) => {
    setCollectionItems(collectionItems.filter(item => item.id !== id))
  }

  // 回収項目を更新
  const updateCollectionItem = (id: string, field: keyof CollectionItem, value: any) => {
    setCollectionItems(collectionItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // 廃棄物種別が選択された時の処理
  const handleWasteTypeChange = (itemId: string, wasteTypeId: string) => {
    const wasteType = wasteTypes.find(wt => wt.id === wasteTypeId)
    if (wasteType) {
      updateCollectionItem(itemId, 'waste_type_id', wasteTypeId)
      updateCollectionItem(itemId, 'unit', wasteType.unit_name)
    }
  }

  // フォーム送信
  const handleSubmit = async (values: any) => {
    if (collectionItems.length === 0) {
      message.warning('回収項目を追加してください')
      return
    }

    if (!selectedStore) {
      message.warning('店舗を選択してください')
      return
    }

    try {
      setLoading(true)

      // 回収情報を作成
      const collectionData: CollectionCreate = {
        org_id: collector.org_id,
        collector_id: collector.id,
        store_id: selectedStore,
        collection_date: values.collection_date.format('YYYY-MM-DD'),
        collection_time: values.collection_time.format('HH:mm'),
        status: 'COMPLETED',
        notes: values.notes,
        items: collectionItems.map(item => ({
          waste_type_id: item.waste_type_id,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
        })),
      }

      await CollectionRepository.create(collectionData)
      
      message.success('回収情報を登録しました')
      form.resetFields()
      setCollectionItems([])
      setSelectedStore('')
      fetchData()
    } catch (err) {
      console.error('Failed to create collection:', err)
      message.error('回収情報の登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // プレビューモーダルを開く
  const openPreviewModal = () => {
    if (collectionItems.length === 0) {
      message.warning('回収項目を追加してください')
      return
    }
    setPreviewModalVisible(true)
  }

  // 回収履歴のテーブル列定義
  const historyColumns = [
    {
      title: '回収日時',
      key: 'collection_datetime',
      render: (_: any, record: Collection) => (
        <Space>
          <CalendarOutlined />
          {dayjs(record.collection_date).format('YYYY-MM-DD')} {record.collection_time}
        </Space>
      ),
    },
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
      title: '回収項目数',
      key: 'items_count',
      render: (_: any, record: Collection) => (
        <Tag color="blue">{record.items?.length || 0}項目</Tag>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>
          {status === 'COMPLETED' ? '完了' : '処理中'}
        </Tag>
      ),
    },
  ]

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          回収情報登録
        </Title>
        <Text type="secondary">
          実際の回収作業完了後の情報を登録します
        </Text>
      </div>

      <Row gutter={24}>
        {/* 回収情報登録フォーム */}
        <Col xs={24} lg={12}>
          <Card title="回収情報入力" loading={loading}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="collection_date"
                    label="回収日"
                    rules={[{ required: true, message: '回収日を選択してください' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder="回収日を選択"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="collection_time"
                    label="回収時間"
                    rules={[{ required: true, message: '回収時間を選択してください' }]}
                  >
                    <TimePicker
                      style={{ width: '100%' }}
                      format="HH:mm"
                      placeholder="回収時間を選択"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="store_id"
                label="店舗"
                rules={[{ required: true, message: '店舗を選択してください' }]}
              >
                <Select
                  placeholder="店舗を選択"
                  value={selectedStore}
                  onChange={setSelectedStore}
                  showSearch
                  optionFilterProp="children"
                >
                  {stores.map(store => (
                    <Option key={store.id} value={store.id}>
                      {store.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Divider>回収項目</Divider>

              {collectionItems.map((item, index) => (
                <Card
                  key={item.id}
                  size="small"
                  style={{ marginBottom: 16 }}
                  title={`項目 ${index + 1}`}
                  extra={
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeCollectionItem(item.id)}
                    />
                  }
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="廃棄物種別" required>
                        <Select
                          placeholder="廃棄物種別を選択"
                          value={item.waste_type_id}
                          onChange={(value) => handleWasteTypeChange(item.id, value)}
                        >
                          {wasteTypes.map(wasteType => (
                            <Option key={wasteType.id} value={wasteType.id}>
                              {wasteType.waste_type_name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="数量" required>
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder="数量"
                          value={item.quantity}
                          onChange={(value) => updateCollectionItem(item.id, 'quantity', value || 0)}
                          min={0}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item label="単位">
                        <Input
                          placeholder="単位"
                          value={item.unit}
                          onChange={(e) => updateCollectionItem(item.id, 'unit', e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="備考">
                    <TextArea
                      placeholder="備考（任意）"
                      value={item.notes}
                      onChange={(e) => updateCollectionItem(item.id, 'notes', e.target.value)}
                      rows={2}
                    />
                  </Form.Item>
                </Card>
              ))}

              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addCollectionItem}
                  style={{ width: '100%' }}
                >
                  回収項目を追加
                </Button>
              </div>

              <Form.Item
                name="notes"
                label="全体備考"
              >
                <TextArea
                  placeholder="回収に関する備考（任意）"
                  rows={3}
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={loading}
                  >
                    登録
                  </Button>
                  <Button
                    onClick={openPreviewModal}
                    disabled={collectionItems.length === 0}
                  >
                    プレビュー
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 回収履歴 */}
        <Col xs={24} lg={12}>
          <Card 
            title="回収履歴" 
            extra={
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchData}
                size="small"
              >
                更新
              </Button>
            }
          >
            <Table
              columns={historyColumns}
              dataSource={collections}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 5,
                showSizeChanger: false,
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
              }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* プレビューモーダル */}
      <Modal
        title="回収情報プレビュー"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPreviewModalVisible(false)}>
            キャンセル
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => {
              setPreviewModalVisible(false)
              form.submit()
            }}
          >
            登録
          </Button>,
        ]}
        width={600}
      >
        <div>
          <p><strong>回収日時:</strong> {form.getFieldValue('collection_date')?.format('YYYY-MM-DD')} {form.getFieldValue('collection_time')?.format('HH:mm')}</p>
          <p><strong>店舗:</strong> {stores.find(s => s.id === selectedStore)?.name}</p>
          <p><strong>回収項目:</strong></p>
          <ul>
            {collectionItems.map((item, index) => {
              const wasteType = wasteTypes.find(wt => wt.id === item.waste_type_id)
              return (
                <li key={item.id}>
                  {wasteType?.waste_type_name} - {item.quantity}{item.unit}
                  {item.notes && ` (${item.notes})`}
                </li>
              )
            })}
          </ul>
          {form.getFieldValue('notes') && (
            <p><strong>備考:</strong> {form.getFieldValue('notes')}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default CollectorCollectionRegistration

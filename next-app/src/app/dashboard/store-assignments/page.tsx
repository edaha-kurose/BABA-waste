'use client'

/**
 * 店舗-収集業者割り当て管理画面
 * デスクトップ版StoreCollectorAssignmentsから移植
 * 既存store_collector_assignmentsテーブル活用（影響範囲: MEDIUM）
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  InputNumber,
  Switch,
  message,
  Typography,
  Space,
  Row,
  Col,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

interface Assignment {
  id: string
  store_id: string
  collector_id: string
  priority: number
  is_active: boolean
  created_at: string
  stores?: { name: string; store_code: string }
}

interface Store {
  id: string
  name: string
  store_code: string
}

interface Collector {
  id: string
  email: string
  company_name?: string
}

export default function StoreAssignmentsPage() {
  const [loading, setLoading] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)

      const [assignmentsRes, storesRes] = await Promise.all([
        fetch('/api/store-assignments'),
        fetch('/api/stores'),
      ])

      if (!assignmentsRes.ok || !storesRes.ok) {
        throw new Error('データ取得失敗')
      }

      const assignmentsData = await assignmentsRes.json()
      const storesData = await storesRes.json()

      setAssignments(assignmentsData.data || [])
      setStores(storesData.data || [])

      // TODO: 収集業者一覧取得APIを追加
      // const collectorsRes = await fetch('/api/users?role=TRANSPORTER')
      // setCollectors(collectorsData.data || [])
    } catch (error) {
      console.error('[StoreAssignments] Error:', error)
      message.error('データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 新規作成
  const handleCreate = () => {
    setEditingAssignment(null)
    form.resetFields()
    form.setFieldsValue({ priority: 1, is_active: true })
    setIsModalVisible(true)
  }

  // 編集
  const handleEdit = (record: Assignment) => {
    setEditingAssignment(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  // 削除
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/store-assignments/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('削除失敗')

      message.success('割り当てを削除しました')
      fetchData()
    } catch (error) {
      console.error('[Delete] Error:', error)
      message.error('削除に失敗しました')
    }
  }

  // 保存
  const handleSave = async (values: any) => {
    try {
      let response
      if (editingAssignment) {
        response = await fetch(`/api/store-assignments/${editingAssignment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
      } else {
        response = await fetch('/api/store-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
      }

      if (!response.ok) throw new Error('保存失敗')

      message.success(editingAssignment ? '更新しました' : '作成しました')
      setIsModalVisible(false)
      form.resetFields()
      fetchData()
    } catch (error) {
      console.error('[Save] Error:', error)
      message.error('保存に失敗しました')
    }
  }

  // 店舗名取得
  const getStoreName = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId)
    return store ? `${store.name} (${store.store_code})` : storeId
  }

  // 収集業者名取得
  const getCollectorName = (collectorId: string) => {
    const collector = collectors.find((c) => c.id === collectorId)
    return collector ? collector.company_name || collector.email : collectorId
  }

  // テーブル列定義
  const columns = [
    {
      title: '店舗',
      dataIndex: 'store_id',
      key: 'store_id',
      render: (storeId: string, record: Assignment) => (
        <Space>
          <ShopOutlined />
          {record.stores?.name || getStoreName(storeId)}
        </Space>
      ),
    },
    {
      title: '収集業者',
      dataIndex: 'collector_id',
      key: 'collector_id',
      render: (collectorId: string) => (
        <Space>
          <UserOutlined />
          {getCollectorName(collectorId)}
        </Space>
      ),
    },
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: number) => <Tag color="blue">{priority}位</Tag>,
    },
    {
      title: '有効',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) =>
        isActive ? (
          <Tag color="green">有効</Tag>
        ) : (
          <Tag color="default">無効</Tag>
        ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: Assignment) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: '削除確認',
                content: 'この割り当てを削除しますか？',
                okText: '削除',
                cancelText: 'キャンセル',
                okType: 'danger',
                onOk: () => handleDelete(record.id),
              })
            }}
          />
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              店舗-収集業者割り当て
            </Title>
            <Text type="secondary">
              各店舗に対する収集業者の割り当てと優先順位を管理します
            </Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                更新
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新規作成
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={assignments}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* 編集モーダル */}
      <Modal
        title={editingAssignment ? '割り当て編集' : '割り当て作成'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="store_id"
            label="店舗"
            rules={[{ required: true, message: '店舗を選択してください' }]}
          >
            <Select
              placeholder="店舗を選択"
              showSearch
              optionFilterProp="children"
            >
              {stores.map((store) => (
                <Option key={store.id} value={store.id}>
                  {store.name} ({store.store_code})
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
              {collectors.map((collector) => (
                <Option key={collector.id} value={collector.id}>
                  {collector.company_name || collector.email}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="priority"
            label="優先度"
            rules={[{ required: true, message: '優先度を入力してください' }]}
          >
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="is_active" label="有効" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setIsModalVisible(false)
                  form.resetFields()
                }}
              >
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}











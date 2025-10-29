'use client'

/**
 * 管理店舗画面
 * デスクトップ版ManagedStoresから移植
 * 既存storesテーブル活用（影響範囲: MEDIUM）
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Typography,
  Tag,
  message,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ShopOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

interface Store {
  id: string
  org_id: string
  store_code: string
  name: string
  address?: string
  phone?: string
  contact_person?: string
  is_active: boolean
  created_at: string
  organizations?: { name: string }
}

export default function ManagedStoresPage() {
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [form] = Form.useForm()

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stores')
      if (!response.ok) throw new Error('データ取得失敗')
      const data = await response.json()
      setStores(data.data || [])
    } catch (error) {
      console.error('[ManagedStores] Error:', error)
      message.error('データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = () => {
    setEditingStore(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true })
    setIsModalVisible(true)
  }

  const handleEdit = (record: Store) => {
    setEditingStore(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '削除確認',
      content: 'この店舗を削除しますか？',
      okText: '削除',
      cancelText: 'キャンセル',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await fetch(`/api/stores/${id}`, {
            method: 'DELETE',
          })
          if (!response.ok) throw new Error('削除失敗')
          message.success('店舗を削除しました')
          fetchData()
        } catch (error) {
          console.error('[Delete] Error:', error)
          message.error('削除に失敗しました')
        }
      },
    })
  }

  const handleSave = async (values: any) => {
    try {
      let response
      if (editingStore) {
        response = await fetch(`/api/stores/${editingStore.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
      } else {
        response = await fetch('/api/stores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
      }

      if (!response.ok) throw new Error('保存失敗')

      message.success(editingStore ? '更新しました' : '作成しました')
      setIsModalVisible(false)
      form.resetFields()
      fetchData()
    } catch (error) {
      console.error('[Save] Error:', error)
      message.error('保存に失敗しました')
    }
  }

  const columns = [
    {
      title: '店舗コード',
      dataIndex: 'store_code',
      key: 'store_code',
      render: (code: string) => <Text code>{code}</Text>,
    },
    {
      title: '店舗名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <ShopOutlined />
          {name}
        </Space>
      ),
    },
    {
      title: '所属組織',
      dataIndex: ['organizations', 'name'],
      key: 'organization',
      render: (name: string) => name || '-',
    },
    {
      title: '住所',
      dataIndex: 'address',
      key: 'address',
      render: (address: string) => address || '-',
    },
    {
      title: '担当者',
      dataIndex: 'contact_person',
      key: 'contact_person',
      render: (person: string) => person || '-',
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
      render: (_: any, record: Store) => (
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
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            管理店舗
          </Title>
          <Text type="secondary">店舗の登録・管理</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            更新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新規作成
          </Button>
        </Space>
      </div>

      {/* テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={stores}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* 編集モーダル */}
      <Modal
        title={editingStore ? '店舗編集' : '店舗作成'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="store_code"
            label="店舗コード"
            rules={[{ required: true, message: '店舗コードを入力してください' }]}
          >
            <Input placeholder="例: S001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="店舗名"
            rules={[{ required: true, message: '店舗名を入力してください' }]}
          >
            <Input placeholder="例: 新宿店" />
          </Form.Item>

          <Form.Item name="address" label="住所">
            <Input.TextArea rows={2} placeholder="〒160-0000 東京都新宿区..." />
          </Form.Item>

          <Form.Item name="phone" label="電話番号">
            <Input placeholder="03-1234-5678" />
          </Form.Item>

          <Form.Item name="contact_person" label="担当者">
            <Input placeholder="例: 山田太郎" />
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











'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Input, Space, message, Modal, Form, Switch, Tag } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Search } = Input

interface Store {
  id: string
  org_id: string
  store_code: string
  name: string
  address?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
  organization?: {
    id: string
    name: string
    code: string
  }
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()

  // データ取得
  const fetchStores = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchText) params.append('search', searchText)

      const response = await fetch(`/api/stores?${params.toString()}`)
      const result = await response.json()

      if (response.ok) {
        setStores(result.data)
      } else {
        message.error(result.message || '店舗データの取得に失敗しました')
      }
    } catch (error) {
      message.error('店舗データの取得中にエラーが発生しました')
      console.error('Error fetching stores:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [])

  // 検索
  const handleSearch = () => {
    fetchStores()
  }

  // モーダル表示
  const showModal = (store?: Store) => {
    if (store) {
      setEditingStore(store)
      form.setFieldsValue({
        ...store,
        org_id: store.organization?.id,
      })
    } else {
      setEditingStore(null)
      form.resetFields()
    }
    setIsModalVisible(true)
  }

  // モーダル閉じる
  const handleCancel = () => {
    setIsModalVisible(false)
    setEditingStore(null)
    form.resetFields()
  }

  // 作成・更新
  const handleSubmit = async (values: any) => {
    try {
      const url = editingStore ? `/api/stores/${editingStore.id}` : '/api/stores'
      const method = editingStore ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })

      const result = await response.json()

      if (response.ok) {
        message.success(editingStore ? '店舗を更新しました' : '店舗を作成しました')
        handleCancel()
        fetchStores()
      } else {
        message.error(result.message || '操作に失敗しました')
      }
    } catch (error) {
      message.error('操作中にエラーが発生しました')
      console.error('Error submitting store:', error)
    }
  }

  // 削除
  const handleDelete = (store: Store) => {
    Modal.confirm({
      title: '店舗を削除しますか？',
      content: `店舗コード: ${store.store_code} - ${store.name}`,
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/stores/${store.id}`, {
            method: 'DELETE',
          })

          const result = await response.json()

          if (response.ok) {
            message.success('店舗を削除しました')
            fetchStores()
          } else {
            message.error(result.message || '削除に失敗しました')
          }
        } catch (error) {
          message.error('削除中にエラーが発生しました')
          console.error('Error deleting store:', error)
        }
      },
    })
  }

  // テーブルカラム定義
  const columns: ColumnsType<Store> = [
    {
      title: '店舗コード',
      dataIndex: 'store_code',
      key: 'store_code',
      width: 120,
    },
    {
      title: '店舗名',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '組織',
      dataIndex: ['organization', 'name'],
      key: 'organization',
      width: 150,
    },
    {
      title: '住所',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: '電話番号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: 'ステータス',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (is_active: boolean) => (
        <Tag color={is_active ? 'green' : 'red'}>
          {is_active ? '有効' : '無効'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
          >
            編集
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            削除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">店舗管理</h2>

        <Space className="mb-4" size="middle">
          <Search
            placeholder="店舗コード・店舗名で検索"
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
          />

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            新規作成
          </Button>

          <Button onClick={fetchStores}>
            更新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={stores}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `全 ${total} 件`,
        }}
      />

      {/* 作成・編集モーダル */}
      <Modal
        title={editingStore ? '店舗編集' : '店舗作成'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            is_active: true,
          }}
        >
          <Form.Item
            name="org_id"
            label="組織ID"
            rules={[{ required: true, message: '組織IDを入力してください' }]}
          >
            <Input placeholder="組織IDを入力" />
          </Form.Item>

          <Form.Item
            name="store_code"
            label="店舗コード"
            rules={[{ required: true, message: '店舗コードを入力してください' }]}
          >
            <Input placeholder="店舗コードを入力" />
          </Form.Item>

          <Form.Item
            name="name"
            label="店舗名"
            rules={[{ required: true, message: '店舗名を入力してください' }]}
          >
            <Input placeholder="店舗名を入力" />
          </Form.Item>

          <Form.Item
            name="address"
            label="住所"
          >
            <Input placeholder="住所を入力" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="電話番号"
          >
            <Input placeholder="電話番号を入力" />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="ステータス"
            valuePropName="checked"
          >
            <Switch checkedChildren="有効" unCheckedChildren="無効" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingStore ? '更新' : '作成'}
              </Button>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}


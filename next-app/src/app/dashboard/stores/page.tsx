'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Input, Space, Modal, Form, Switch, Tag, App, Spin } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useUser } from '@/lib/auth/session'
import { useRouter } from 'next/navigation'

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
  const { message: messageApi } = App.useApp()
  const { user, userOrg, userRole, loading: authLoading } = useUser()
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()

  // 認証チェック（userとuserOrgの両方を確認）
  useEffect(() => {
    // ローディング中は何もしない
    if (authLoading) {
      return
    }
    
    // user が存在しない、または userOrg が存在しない場合はログアウト
    if (!user || !userOrg) {
      console.log('[Stores] ログアウト: 認証情報がありません', { hasUser: !!user, hasUserOrg: !!userOrg })
      router.push('/login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, userOrg])

  // データ取得
  const fetchStores = async () => {
    if (!userOrg) {
      console.log('[Stores] fetchStores: userOrgがないのでスキップ')
      return
    }
    
    console.log('[Stores] fetchStores: 開始')
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchText) params.append('search', searchText)

      console.log('[Stores] API呼び出し:', `/api/stores?${params.toString()}`)
      const response = await fetch(`/api/stores?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // クッキーを含める
      })
      
      console.log('[Stores] APIレスポンス:', response.status)
      const result = await response.json()

      if (response.ok) {
        console.log('[Stores] データ取得成功:', result.count, '件')
        setStores(Array.isArray(result) ? result : result.data || [])
      } else {
        console.log('[Stores] APIエラー:', response.status, result)
        if (response.status === 401) {
          console.log('[Stores] 401エラー: ログインページへリダイレクト')
          messageApi.error('認証に失敗しました。再ログインしてください')
          router.push('/login')
        } else {
          messageApi.error(result.message || '店舗データの取得に失敗しました')
        }
      }
    } catch (error) {
      console.error('[Stores] fetchStoresエラー:', error)
      messageApi.error('店舗データの取得中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userOrg) {
      fetchStores()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOrg?.id])

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
        messageApi.success(editingStore ? '店舗を更新しました' : '店舗を作成しました')
        handleCancel()
        fetchStores()
      } else {
        messageApi.error(result.message || '操作に失敗しました')
      }
    } catch (error) {
      messageApi.error('操作中にエラーが発生しました')
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
            messageApi.success('店舗を削除しました')
            fetchStores()
          } else {
            messageApi.error(result.message || '削除に失敗しました')
          }
        } catch (error) {
          messageApi.error('削除中にエラーが発生しました')
          console.error('Error deleting store:', error)
        }
      },
    })
  }

  // テーブルカラム定義
  // ローディング中は表示しない
  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" spinning tip="認証情報を確認中...">
          <div style={{ padding: 50 }} />
        </Spin>
      </div>
    )
  }

  // ログインしていない場合は何も表示しない（useEffectでリダイレクト）
  if (!userOrg) {
    return null
  }

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


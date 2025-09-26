// ============================================================================
// 店舗管理ページ
// 作成日: 2025-09-16
// 目的: 店舗の一覧表示、作成、編集、削除
// ============================================================================

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ShopOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'

// データ取得
import { organizationRepository } from '@/modules/organizations/repository'
import { StoreRepository } from '@/modules/stores/repository'
import type { Organization, Store } from '@contracts/v0/schema'

const { Title } = Typography
const { Option } = Select

interface StoreFormData {
  store_code: string
  name: string
  address?: string
  area?: string
  emitter_no?: string
}

const Stores: React.FC = () => {
  const [stores, setStores] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingStore, setEditingStore] = useState<any>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 組織データを取得
      const orgData = await organizationRepository.findMany()
      setOrganizations(orgData)
      
      // 店舗データを取得
      const storeData = await StoreRepository.findMany()
      setStores(storeData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 店舗作成・更新
  const handleSubmit = async (values: StoreFormData) => {
    try {
      if (editingStore) {
        // 更新
        await StoreRepository.update(editingStore.id, values)
        message.success('店舗を更新しました')
      } else {
        // 作成
        const newStore = {
          ...values,
          org_id: organizations[0]?.id || 'default-org-id',
        }
        await StoreRepository.create(newStore)
        message.success('店舗を作成しました')
      }
      
      setModalVisible(false)
      setEditingStore(null)
      form.resetFields()
      fetchData()
    } catch (err) {
      console.error('Failed to save store:', err)
      message.error('店舗の保存に失敗しました')
    }
  }

  // 店舗削除
  const handleDelete = async (id: string) => {
    try {
      await StoreRepository.delete(id)
      message.success('店舗を削除しました')
      fetchData()
    } catch (err) {
      console.error('Failed to delete store:', err)
      message.error('店舗の削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (store: any) => {
    setEditingStore(store)
    form.setFieldsValue(store)
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingStore(null)
    form.resetFields()
    setModalVisible(true)
  }

  // モーダルキャンセル
  const handleCancel = () => {
    setModalVisible(false)
    setEditingStore(null)
    form.resetFields()
  }

  // テーブル列定義
  const columns = [
    {
      title: '店舗コード',
      dataIndex: 'store_code',
      key: 'store_code',
    },
    {
      title: '店舗名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '住所',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'エリア',
      dataIndex: 'area',
      key: 'area',
    },
    {
      title: '事業場番号',
      dataIndex: 'emitter_no',
      key: 'emitter_no',
    },
    {
      title: '作成日',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="この店舗を削除しますか？"
            description="削除した店舗は復元できません。"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="center" style={{ height: '400px' }}>
        <Spin size="large" />
        <span className="ml-2">データを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="エラー"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchData}>
            再試行
          </Button>
        }
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダーセクション */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Title level={2} className="!mb-1 !text-gray-900">
                店舗管理
              </Title>
              <p className="text-gray-600 text-sm">
                廃棄物排出事業場の店舗情報を管理します
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchData}
                className="flex items-center"
              >
                更新
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleCreate}
                className="flex items-center"
              >
                新規作成
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-6">
        {/* 統計カード */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="総店舗数"
                value={stores.length}
                prefix={<ShopOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="アクティブ店舗"
                value={stores.length}
                prefix={<EnvironmentOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 店舗一覧テーブル */}
        <Card>
          <Table
            columns={columns}
            dataSource={stores}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} / ${total}件`,
            }}
          />
        </Card>
      </div>

      {/* 店舗作成・編集モーダル */}
      <Modal
        title={editingStore ? '店舗編集' : '新規店舗作成'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="store_code"
                label="店舗コード"
                rules={[
                  { required: true, message: '店舗コードを入力してください' },
                  { max: 50, message: '店舗コードは50文字以内で入力してください' },
                ]}
              >
                <Input placeholder="店舗コードを入力してください" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="emitter_no"
                label="事業場番号"
                rules={[
                  { max: 50, message: '事業場番号は50文字以内で入力してください' },
                ]}
              >
                <Input placeholder="事業場番号を入力してください" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="店舗名"
            rules={[
              { required: true, message: '店舗名を入力してください' },
              { max: 255, message: '店舗名は255文字以内で入力してください' },
            ]}
          >
            <Input placeholder="店舗名を入力してください" />
          </Form.Item>

          <Form.Item
            name="address"
            label="住所"
            rules={[
              { max: 500, message: '住所は500文字以内で入力してください' },
            ]}
          >
            <Input placeholder="住所を入力してください" />
          </Form.Item>

          <Form.Item
            name="area"
            label="エリア"
            rules={[
              { max: 100, message: 'エリアは100文字以内で入力してください' },
            ]}
          >
            <Input placeholder="エリアを入力してください" />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                {editingStore ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Stores

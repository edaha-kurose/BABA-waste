'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'

const { Title } = Typography
const { Option } = Select

interface CollectorFormData {
  user_id: string
  company_name: string
  contact_person?: string
  phone?: string
  address?: string
  license_number?: string
  service_areas?: string[]
  is_active: boolean
}

interface Collector {
  id: string
  user_id: string
  company_name: string
  contact_person?: string
  phone?: string
  address?: string
  license_number?: string
  service_areas: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  users?: {
    id: string
    name: string
    email: string
  }
}

export default function CollectorsPage() {
  const { user, userOrg } = useUser()
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCollector, setEditingCollector] = useState<Collector | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchCollectors = async () => {
    if (!userOrg?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/collectors?org_id=${userOrg.id}`)
      if (!response.ok) throw new Error('取得失敗')

      const data = await response.json()
      setCollectors(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      console.error('Failed to fetch collectors:', err)
      message.error('収集業者の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // ユーザー一覧取得（新規作成時）
  const fetchUsers = async () => {
    if (!userOrg?.id) return

    try {
      const response = await fetch(`/api/users?org_id=${userOrg.id}`)
      if (!response.ok) throw new Error('取得失敗')

      const data = await response.json()
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  useEffect(() => {
    fetchCollectors()
    fetchUsers()
  }, [userOrg])

  // フォーム送信
  const handleSubmit = async (values: CollectorFormData) => {
    if (!user?.id) {
      message.error('ユーザー情報が取得できません')
      return
    }

    try {
      const url = editingCollector
        ? `/api/collectors/${editingCollector.id}`
        : '/api/collectors'

      const method = editingCollector ? 'PUT' : 'POST'

      const body = {
        ...values,
        created_by: user.id,
        updated_by: user.id,
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存失敗')
      }

      message.success(
        editingCollector ? '収集業者を更新しました' : '収集業者を作成しました'
      )
      setModalVisible(false)
      setEditingCollector(null)
      form.resetFields()
      fetchCollectors()
    } catch (err: any) {
      console.error('Failed to save collector:', err)
      message.error(err.message || '収集業者の保存に失敗しました')
    }
  }

  // 削除
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/collectors/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '削除失敗')
      }

      message.success('収集業者を削除しました')
      fetchCollectors()
    } catch (err: any) {
      console.error('Failed to delete collector:', err)
      message.error(err.message || '収集業者の削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (collector: Collector) => {
    setEditingCollector(collector)
    form.setFieldsValue({
      user_id: collector.user_id,
      company_name: collector.company_name,
      contact_person: collector.contact_person,
      phone: collector.phone,
      address: collector.address,
      license_number: collector.license_number,
      service_areas: collector.service_areas,
      is_active: collector.is_active,
    })
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingCollector(null)
    form.resetFields()
    form.setFieldsValue({
      is_active: true,
    })
    setModalVisible(true)
  }

  // テーブル列定義
  const columns = [
    {
      title: '会社名',
      dataIndex: 'company_name',
      key: 'company_name',
      width: 200,
    },
    {
      title: '担当者',
      dataIndex: 'contact_person',
      key: 'contact_person',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: 'メール',
      dataIndex: ['users', 'email'],
      key: 'email',
      width: 200,
    },
    {
      title: '電話',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: '許可番号',
      dataIndex: 'license_number',
      key: 'license_number',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: 'サービスエリア',
      dataIndex: 'service_areas',
      key: 'service_areas',
      width: 200,
      render: (areas: string[]) => (areas && areas.length > 0 ? areas.join(', ') : '-'),
    },
    {
      title: '状態',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'アクティブ' : '非アクティブ'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Collector) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="収集業者を削除しますか？"
            description="この操作は取り消せません。"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const stats = {
    total: collectors.length,
    active: collectors.filter((c) => c.is_active).length,
    inactive: collectors.filter((c) => !c.is_active).length,
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <UserOutlined /> 収集業者管理
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchCollectors}>
              更新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新規作成
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="全収集業者数" value={stats.total} suffix="社" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="アクティブ"
              value={stats.active}
              suffix="社"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="非アクティブ"
              value={stats.inactive}
              suffix="社"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={collectors}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title={editingCollector ? '収集業者編集' : '収集業者作成'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingCollector(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="キャンセル"
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingCollector && (
            <Form.Item
              name="user_id"
              label="ユーザー"
              rules={[{ required: true, message: 'ユーザーを選択してください' }]}
            >
              <Select placeholder="ユーザーを選択" showSearch optionFilterProp="children">
                {users.map((u) => (
                  <Option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="company_name"
            label="会社名"
            rules={[{ required: true, message: '会社名を入力してください' }]}
          >
            <Input placeholder="例: 〇〇収集業者株式会社" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contact_person" label="担当者名">
                <Input placeholder="例: 山田太郎" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="電話番号">
                <Input placeholder="例: 03-1234-5678" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="住所">
            <Input.TextArea rows={2} placeholder="例: 東京都渋谷区..." />
          </Form.Item>

          <Form.Item name="license_number" label="許可番号">
            <Input placeholder="例: 第1234567号" />
          </Form.Item>

          <Form.Item name="service_areas" label="サービス提供エリア">
            <Select mode="tags" placeholder="エリアを入力（複数可）">
              <Option value="東京都">東京都</Option>
              <Option value="神奈川県">神奈川県</Option>
              <Option value="千葉県">千葉県</Option>
              <Option value="埼玉県">埼玉県</Option>
            </Select>
          </Form.Item>

          <Form.Item name="is_active" label="ステータス" valuePropName="checked">
            <Switch checkedChildren="アクティブ" unCheckedChildren="非アクティブ" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}





// ============================================================================
// ユーザー管理ページ
// 作成日: 2025-09-16
// 目的: ユーザーの一覧表示、作成、編集、削除
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
  Tag,
  Switch,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
} from '@ant-design/icons'
import { UserRepository } from '@/modules/users/repository'
import { organizationRepository } from '@/modules/organizations/repository'
import type { User, UserCreate, UserUpdate, Organization } from '@contracts/v0/schema'

const { Title } = Typography
const { Option } = Select

interface UserFormData {
  email: string
  name: string
  role: string
  is_active: boolean
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [usersData, orgData] = await Promise.all([
        UserRepository.findMany(),
        organizationRepository.findMany(),
      ])
      
      setUsers(usersData)
      setOrganizations(orgData)
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

  // ユーザー作成・更新
  const handleSubmit = async (values: UserFormData) => {
    try {
      if (editingUser) {
        // 更新
        await UserRepository.update(editingUser.id, values)
        message.success('ユーザーを更新しました')
      } else {
        // 作成
        const newUser: UserCreate = {
          ...values,
          org_id: organizations[0]?.id || 'default-org-id',
          created_by: 'current-user-id', // 実際の実装では現在のユーザーIDを設定
        }
        await UserRepository.create(newUser)
        message.success('ユーザーを作成しました')
      }
      
      setModalVisible(false)
      setEditingUser(null)
      form.resetFields()
      fetchData()
    } catch (err) {
      console.error('Failed to save user:', err)
      message.error('ユーザーの保存に失敗しました')
    }
  }

  // ユーザー削除
  const handleDelete = async (id: string) => {
    try {
      await UserRepository.delete(id)
      message.success('ユーザーを削除しました')
      fetchData()
    } catch (err) {
      console.error('Failed to delete user:', err)
      message.error('ユーザーの削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue(user)
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  // モーダルキャンセル
  const handleCancel = () => {
    setModalVisible(false)
    setEditingUser(null)
    form.resetFields()
  }

  // テーブル定義
  const columns = [
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: User) => (
        <Space>
          <UserOutlined />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: 'メールアドレス',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '権限',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const isAdmin = role === 'ADMIN'
        return (
          <Tag 
            color={isAdmin ? 'red' : 'blue'} 
            icon={isAdmin ? <CrownOutlined /> : <UserOutlined />}
          >
            {isAdmin ? 'マスター' : '一般ユーザー'}
          </Tag>
        )
      },
    },
    {
      title: 'ステータス',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'アクティブ' : '無効'}
        </Tag>
      ),
    },
    {
      title: '最終ログイン',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="このユーザーを削除しますか？"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            >
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

  const activeUsers = users.filter(u => u.is_active)
  const adminUsers = users.filter(u => u.role === 'ADMIN' && u.is_active)
  const regularUsers = users.filter(u => u.role === 'COLLECTOR' && u.is_active)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダーセクション */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Title level={2} className="!mb-1 !text-gray-900">
                ユーザー管理
              </Title>
              <p className="text-gray-600 text-sm">
                システムユーザーの管理を行います
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
                title="総ユーザー数"
                value={users.length}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="アクティブユーザー"
                value={activeUsers.length}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="マスター権限"
                value={adminUsers.length}
                prefix={<CrownOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="一般ユーザー"
                value={regularUsers.length}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* ユーザー一覧テーブル */}
        <Card>
          <Table
            columns={columns}
            dataSource={users}
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

        {/* ユーザー作成・編集モーダル */}
        <Modal
          title={editingUser ? 'ユーザー編集' : '新規ユーザー作成'}
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
            <Form.Item
              name="name"
              label="名前"
              rules={[
                { required: true, message: '名前を入力してください' },
                { max: 255, message: '名前は255文字以内で入力してください' },
              ]}
            >
              <Input placeholder="名前を入力してください" />
            </Form.Item>

            <Form.Item
              name="email"
              label="メールアドレス"
              rules={[
                { required: true, message: 'メールアドレスを入力してください' },
                { type: 'email', message: '有効なメールアドレスを入力してください' },
              ]}
            >
              <Input 
                placeholder="メールアドレスを入力してください" 
                disabled={!!editingUser} // 編集時はメールアドレス変更不可
              />
            </Form.Item>

            <Form.Item
              name="role"
              label="権限"
              rules={[
                { required: true, message: '権限を選択してください' },
              ]}
            >
              <Select placeholder="権限を選択してください">
                <Option value="ADMIN">マスター権限</Option>
                <Option value="USER">一般ユーザー</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="is_active"
              label="ステータス"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="アクティブ" 
                unCheckedChildren="無効" 
              />
            </Form.Item>

            <Form.Item className="mb-0 text-right">
              <Space>
                <Button onClick={handleCancel}>
                  キャンセル
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingUser ? '更新' : '作成'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  )
}

export default Users

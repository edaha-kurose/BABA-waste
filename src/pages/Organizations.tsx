// ============================================================================
// 組織管理ページ
// 作成日: 2025-09-16
// 目的: 組織の一覧表示、作成、編集、削除
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
  UserOutlined,
  TeamOutlined,
} from '@ant-design/icons'

// データ取得
import { organizationRepository } from '@/modules/organizations/repository'
import type { Organization } from '@contracts/v0/schema'

const { Title } = Typography

interface OrganizationFormData {
  name: string
}

const Organizations: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await organizationRepository.findMany()
      setOrganizations(data)
    } catch (err) {
      console.error('Failed to fetch organizations:', err)
      setError('組織データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  // 組織作成・更新
  const handleSubmit = async (values: OrganizationFormData) => {
    try {
      if (editingOrg) {
        // 更新
        await organizationRepository.update(editingOrg.id, values)
        message.success('組織を更新しました')
      } else {
        // 作成
        await organizationRepository.create(values)
        message.success('組織を作成しました')
      }
      
      setModalVisible(false)
      setEditingOrg(null)
      form.resetFields()
      fetchOrganizations()
    } catch (err) {
      console.error('Failed to save organization:', err)
      message.error('組織の保存に失敗しました')
    }
  }

  // 組織削除
  const handleDelete = async (id: string) => {
    try {
      await organizationRepository.delete(id)
      message.success('組織を削除しました')
      fetchOrganizations()
    } catch (err) {
      console.error('Failed to delete organization:', err)
      message.error('組織の削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (org: Organization) => {
    setEditingOrg(org)
    form.setFieldsValue({ name: org.name })
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingOrg(null)
    form.resetFields()
    setModalVisible(true)
  }

  // モーダルキャンセル
  const handleCancel = () => {
    setModalVisible(false)
    setEditingOrg(null)
    form.resetFields()
  }

  // テーブル列定義
  const columns = [
    {
      title: '組織名',
      dataIndex: 'name',
      key: 'name',
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
      render: (_: any, record: Organization) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="この組織を削除しますか？"
            description="削除した組織は復元できません。"
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
          <Button size="small" onClick={fetchOrganizations}>
            再試行
          </Button>
        }
      />
    )
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          組織管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchOrganizations}>
            更新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新規作成
          </Button>
        </Space>
      </div>

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="総組織数"
              value={organizations.length}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="アクティブ組織"
              value={organizations.length}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 組織一覧テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={organizations}
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

      {/* 組織作成・編集モーダル */}
      <Modal
        title={editingOrg ? '組織編集' : '新規組織作成'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="組織名"
            rules={[
              { required: true, message: '組織名を入力してください' },
              { max: 255, message: '組織名は255文字以内で入力してください' },
            ]}
          >
            <Input placeholder="組織名を入力してください" />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                {editingOrg ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Organizations




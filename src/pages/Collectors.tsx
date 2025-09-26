import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Tag,
  Row,
  Col,
  Typography,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons'
import { UserRepository } from '@/modules/users/repository'
import type { User } from '@contracts/v0/schema'

const { Title } = Typography
const { Option } = Select

interface CollectorFormData {
  company_name: string
  contact_person: string
  email: string
  phone: string
  address: string
  license_number: string
  service_areas: string[]
  is_active: boolean
}

const Collectors: React.FC = () => {
  const [collectors, setCollectors] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCollector, setEditingCollector] = useState<User | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const allUsers = await UserRepository.findMany()
      // roleがCOLLECTORのユーザーのみを収集業者として扱う
      const collectorUsers = allUsers.filter(user => user.role === 'COLLECTOR')
      setCollectors(collectorUsers)
    } catch (err) {
      console.error('Failed to fetch collectors:', err)
      setError(`データの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // フォーム送信
  const handleSubmit = async (values: CollectorFormData) => {
    try {
      const collectorData = {
        org_id: 'demo-org-id',
        role: 'COLLECTOR' as const,
        service_areas: values.service_areas || [],
        ...values,
      }

      if (editingCollector) {
        await UserRepository.update(editingCollector.id, collectorData)
        message.success('収集業者を更新しました')
      } else {
        await UserRepository.create(collectorData)
        message.success('収集業者を作成しました')
      }
      
      setModalVisible(false)
      setEditingCollector(null)
      form.resetFields()
      fetchData()
    } catch (err) {
      console.error('Failed to save collector:', err)
      message.error('収集業者の保存に失敗しました')
    }
  }

  // 削除
  const handleDelete = async (id: string) => {
    try {
      await UserRepository.delete(id)
      message.success('収集業者を削除しました')
      fetchData()
    } catch (err) {
      console.error('Failed to delete collector:', err)
      message.error('収集業者の削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (collector: User) => {
    setEditingCollector(collector)
    form.setFieldsValue(collector)
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingCollector(null)
    form.resetFields()
    setModalVisible(true)
  }

  // モーダルキャンセル
  const handleCancel = () => {
    setModalVisible(false)
    setEditingCollector(null)
    form.resetFields()
  }

  // テーブル列定義
  const columns = [
    {
      title: '会社名',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: '担当者',
      dataIndex: 'contact_person',
      key: 'contact_person',
    },
    {
      title: 'メール',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <Space>
          <MailOutlined />
          {email}
        </Space>
      ),
    },
    {
      title: '電話',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <Space>
          <PhoneOutlined />
          {phone}
        </Space>
      ),
    },
    {
      title: '許可番号',
      dataIndex: 'license_number',
      key: 'license_number',
    },
    {
      title: 'サービスエリア',
      dataIndex: 'service_areas',
      key: 'service_areas',
      render: (areas: string[] | undefined) => (
        <Space wrap>
          {(areas || []).map((area, index) => (
            <Tag key={index} color="blue">{area}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'アクティブ' : '非アクティブ'}
        </Tag>
      ),
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
            title="この収集業者を削除しますか？"
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

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={4} type="danger">エラーが発生しました</Title>
          <p>{error}</p>
          <Button onClick={fetchData}>再試行</Button>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            <UserOutlined /> 収集業者管理
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新規作成
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={collectors}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
          }}
        />
      </Card>

      {/* 作成・編集モーダル */}
      <Modal
        title={editingCollector ? '収集業者編集' : '収集業者作成'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="company_name"
                label="会社名"
                rules={[
                  { required: true, message: '会社名を入力してください' },
                ]}
              >
                <Input placeholder="会社名を入力してください" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact_person"
                label="担当者名"
                rules={[
                  { required: true, message: '担当者名を入力してください' },
                ]}
              >
                <Input placeholder="担当者名を入力してください" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="メールアドレス"
                rules={[
                  { required: true, message: 'メールアドレスを入力してください' },
                  { type: 'email', message: '有効なメールアドレスを入力してください' },
                ]}
              >
                <Input placeholder="メールアドレスを入力してください" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="電話番号"
                rules={[
                  { required: true, message: '電話番号を入力してください' },
                ]}
              >
                <Input placeholder="電話番号を入力してください" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="住所"
            rules={[
              { required: true, message: '住所を入力してください' },
            ]}
          >
            <Input.TextArea placeholder="住所を入力してください" rows={2} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="license_number"
                label="許可番号"
                rules={[
                  { required: true, message: '許可番号を入力してください' },
                ]}
              >
                <Input placeholder="許可番号を入力してください" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="ステータス"
                rules={[
                  { required: true, message: 'ステータスを選択してください' },
                ]}
              >
                <Select placeholder="ステータスを選択してください">
                  <Option value={true}>アクティブ</Option>
                  <Option value={false}>非アクティブ</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="service_areas"
            label="サービスエリア"
          >
            <Select
              mode="tags"
              placeholder="サービスエリアを入力してください"
              style={{ width: '100%' }}
            />
          </Form.Item>

          {/* JWNET連携に必要な項目 */}
          <Divider orientation="left">JWNET連携設定</Divider>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="jwnet_subscriber_id"
                label="JWNET加入者番号"
                rules={[
                  { required: true, message: 'JWNET加入者番号を入力してください' },
                  { min: 1, max: 50, message: '1-50文字で入力してください' },
                ]}
                extra="JWNET連携に必要な加入者番号です"
              >
                <Input placeholder="例: 1234567" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="jwnet_public_confirmation_id"
                label="JWNET公開確認番号"
                rules={[
                  { required: true, message: 'JWNET公開確認番号を入力してください' },
                  { min: 1, max: 50, message: '1-50文字で入力してください' },
                ]}
                extra="JWNET連携に必要な公開確認番号です"
              >
                <Input placeholder="例: ABC123456" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                {editingCollector ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Collectors

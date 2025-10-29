'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  message,
  Typography,
  Tag,
  Descriptions,
  Alert,
} from 'antd'
import {
  LinkOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'

const { Title, Text } = Typography
const { Option } = Select

interface PartyCombination {
  id: string
  org_id: string
  emitter_subscriber_id: string
  transporter_subscriber_id: string
  disposer_subscriber_id: string
  is_active: boolean
  created_at: string
  emitter?: {
    name: string
    jwnet_subscriber_id: string
  }
  transporter?: {
    name: string
    jwnet_subscriber_id: string
  }
  disposer?: {
    name: string
    jwnet_subscriber_id: string
  }
}

export default function JwnetPartyCombinationsPage() {
  const { userOrg } = useUser()
  const [combinations, setCombinations] = useState<PartyCombination[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [editingCombination, setEditingCombination] = useState<PartyCombination | null>(null)
  const [selectedCombination, setSelectedCombination] = useState<PartyCombination | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchCombinations = async () => {
    if (!userOrg?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // モックデータ（実際のAPIは後で実装）
      const mockData: PartyCombination[] = [
        {
          id: '1',
          org_id: userOrg.id,
          emitter_subscriber_id: 'EMIT-001',
          transporter_subscriber_id: 'TRANS-001',
          disposer_subscriber_id: 'DISP-001',
          is_active: true,
          created_at: '2025-10-01T00:00:00Z',
          emitter: {
            name: '排出事業者A',
            jwnet_subscriber_id: 'EMIT-001',
          },
          transporter: {
            name: '収集業者A',
            jwnet_subscriber_id: 'TRANS-001',
          },
          disposer: {
            name: '処分業者A',
            jwnet_subscriber_id: 'DISP-001',
          },
        },
        {
          id: '2',
          org_id: userOrg.id,
          emitter_subscriber_id: 'EMIT-002',
          transporter_subscriber_id: 'TRANS-002',
          disposer_subscriber_id: 'DISP-002',
          is_active: true,
          created_at: '2025-09-15T00:00:00Z',
          emitter: {
            name: '排出事業者B',
            jwnet_subscriber_id: 'EMIT-002',
          },
          transporter: {
            name: '収集業者B',
            jwnet_subscriber_id: 'TRANS-002',
          },
          disposer: {
            name: '処分業者B',
            jwnet_subscriber_id: 'DISP-002',
          },
        },
      ]
      setCombinations(mockData)
    } catch (err) {
      console.error('Failed to fetch combinations:', err)
      message.error('事業者組み合わせの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userOrg?.id) {
      fetchCombinations()
    }
  }, [userOrg?.id])

  // 作成・編集
  const handleSubmit = async (values: any) => {
    try {
      // TODO: 実際のAPI呼び出し
      if (editingCombination) {
        message.success('事業者組み合わせを更新しました')
      } else {
        message.success('事業者組み合わせを作成しました')
      }
      setModalVisible(false)
      setEditingCombination(null)
      form.resetFields()
      fetchCombinations()
    } catch (err) {
      console.error('Failed to save combination:', err)
      message.error('事業者組み合わせの保存に失敗しました')
    }
  }

  // 削除
  const handleDelete = async (id: string) => {
    try {
      // TODO: 実際の削除API呼び出し
      message.success('事業者組み合わせを削除しました')
      fetchCombinations()
    } catch (err) {
      console.error('Failed to delete combination:', err)
      message.error('事業者組み合わせの削除に失敗しました')
    }
  }

  // 編集
  const handleEdit = (combination: PartyCombination) => {
    setEditingCombination(combination)
    form.setFieldsValue({
      emitter_subscriber_id: combination.emitter_subscriber_id,
      transporter_subscriber_id: combination.transporter_subscriber_id,
      disposer_subscriber_id: combination.disposer_subscriber_id,
    })
    setModalVisible(true)
  }

  // 詳細表示
  const showDetail = (combination: PartyCombination) => {
    setSelectedCombination(combination)
    setDetailModalVisible(true)
  }

  // 新規作成
  const handleCreate = () => {
    setEditingCombination(null)
    form.resetFields()
    setModalVisible(true)
  }

  // テーブル列定義
  const columns = [
    {
      title: '排出事業者',
      key: 'emitter',
      width: 250,
      render: (_: any, record: PartyCombination) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.emitter?.name}</Text>
          <Text type="secondary">{record.emitter?.jwnet_subscriber_id}</Text>
        </Space>
      ),
    },
    {
      title: '収集運搬業者',
      key: 'transporter',
      width: 250,
      render: (_: any, record: PartyCombination) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.transporter?.name}</Text>
          <Text type="secondary">{record.transporter?.jwnet_subscriber_id}</Text>
        </Space>
      ),
    },
    {
      title: '処分業者',
      key: 'disposer',
      width: 250,
      render: (_: any, record: PartyCombination) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.disposer?.name}</Text>
          <Text type="secondary">{record.disposer?.jwnet_subscriber_id}</Text>
        </Space>
      ),
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
      title: '作成日',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: PartyCombination) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => showDetail(record)} size="small">
            詳細
          </Button>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small">
            編集
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            size="small"
          >
            削除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Title level={2}>
            <LinkOutlined /> 事業者組み合わせ管理
          </Title>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchCombinations} loading={loading}>
              更新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新規作成
            </Button>
          </Space>
        }
      >
        <Alert
          message="事業者組み合わせについて"
          description="JWNET登録に必要な排出事業者、収集運搬業者、処分業者の組み合わせを管理します。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={columns}
          dataSource={combinations}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
          }}
        />
      </Card>

      {/* 作成・編集モーダル */}
      <Modal
        title={editingCombination ? '事業者組み合わせ編集' : '新規事業者組み合わせ作成'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingCombination(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        okText={editingCombination ? '更新' : '作成'}
        cancelText="キャンセル"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="排出事業者"
            name="emitter_subscriber_id"
            rules={[{ required: true, message: '排出事業者を選択してください' }]}
          >
            <Select placeholder="排出事業者を選択">
              <Option value="EMIT-001">排出事業者A (EMIT-001)</Option>
              <Option value="EMIT-002">排出事業者B (EMIT-002)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="収集運搬業者"
            name="transporter_subscriber_id"
            rules={[{ required: true, message: '収集運搬業者を選択してください' }]}
          >
            <Select placeholder="収集運搬業者を選択">
              <Option value="TRANS-001">収集業者A (TRANS-001)</Option>
              <Option value="TRANS-002">収集業者B (TRANS-002)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="処分業者"
            name="disposer_subscriber_id"
            rules={[{ required: true, message: '処分業者を選択してください' }]}
          >
            <Select placeholder="処分業者を選択">
              <Option value="DISP-001">処分業者A (DISP-001)</Option>
              <Option value="DISP-002">処分業者B (DISP-002)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 詳細モーダル */}
      <Modal
        title="事業者組み合わせ詳細"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedCombination(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false)
              setSelectedCombination(null)
            }}
          >
            閉じる
          </Button>,
        ]}
        width={700}
      >
        {selectedCombination && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="排出事業者">
              <Space direction="vertical" size={0}>
                <Text strong>{selectedCombination.emitter?.name}</Text>
                <Text type="secondary">{selectedCombination.emitter?.jwnet_subscriber_id}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="収集運搬業者">
              <Space direction="vertical" size={0}>
                <Text strong>{selectedCombination.transporter?.name}</Text>
                <Text type="secondary">{selectedCombination.transporter?.jwnet_subscriber_id}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="処分業者">
              <Space direction="vertical" size={0}>
                <Text strong>{selectedCombination.disposer?.name}</Text>
                <Text type="secondary">{selectedCombination.disposer?.jwnet_subscriber_id}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="ステータス">
              <Tag color={selectedCombination.is_active ? 'green' : 'red'}>
                {selectedCombination.is_active ? '有効' : '無効'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="作成日時">
              {new Date(selectedCombination.created_at).toLocaleString('ja-JP')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

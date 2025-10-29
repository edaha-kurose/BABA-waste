'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Descriptions,
  Alert,
  Typography,
  Tooltip,
} from 'antd'
import {
  WarningOutlined,
  SendOutlined,
  EyeOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'

const { Title, Text } = Typography
const { TextArea } = Input

interface TempRegistration {
  id: string
  org_id: string
  plan_id: string
  jwnet_temp_id?: string
  payload_hash: string
  status: 'PENDING' | 'RESERVED' | 'FAILED' | 'ERROR'
  last_sent_at?: string
  error_code?: string
  created_at: string
  plan?: {
    id: string
    planned_date: string
    planned_qty: number
    unit: string
    stores?: {
      name: string
      store_code: string
    }
  }
}

export default function TempRegistrationsPage() {
  const { userOrg } = useUser()
  const [registrations, setRegistrations] = useState<TempRegistration[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState<TempRegistration | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [sendModalVisible, setSendModalVisible] = useState(false)
  const [form] = Form.useForm()

  // データ取得
  const fetchRegistrations = async () => {
    if (!userOrg?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // モックデータ（実際のAPIは後で実装）
      const mockData: TempRegistration[] = [
        {
          id: '1',
          org_id: userOrg.id,
          plan_id: 'plan-1',
          jwnet_temp_id: 'TEMP-2025-001',
          payload_hash: 'hash-001',
          status: 'PENDING',
          created_at: '2025-10-16T10:00:00Z',
          plan: {
            id: 'plan-1',
            planned_date: '2025-10-20',
            planned_qty: 2.5,
            unit: 'T',
            stores: {
              name: '本店',
              store_code: 'ST001',
            },
          },
        },
        {
          id: '2',
          org_id: userOrg.id,
          plan_id: 'plan-2',
          jwnet_temp_id: 'TEMP-2025-002',
          payload_hash: 'hash-002',
          status: 'RESERVED',
          last_sent_at: '2025-10-15T14:30:00Z',
          created_at: '2025-10-15T10:00:00Z',
          plan: {
            id: 'plan-2',
            planned_date: '2025-10-22',
            planned_qty: 1.2,
            unit: 'T',
            stores: {
              name: '支店A',
              store_code: 'ST002',
            },
          },
        },
        {
          id: '3',
          org_id: userOrg.id,
          plan_id: 'plan-3',
          jwnet_temp_id: 'TEMP-2025-003',
          payload_hash: 'hash-003',
          status: 'ERROR',
          last_sent_at: '2025-10-14T09:00:00Z',
          error_code: 'JWNET_CONNECTION_ERROR',
          created_at: '2025-10-14T08:00:00Z',
          plan: {
            id: 'plan-3',
            planned_date: '2025-10-18',
            planned_qty: 3.0,
            unit: 'T',
            stores: {
              name: '支店B',
              store_code: 'ST003',
            },
          },
        },
      ]
      setRegistrations(mockData)
    } catch (err) {
      console.error('Failed to fetch registrations:', err)
      message.error('仮登録データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userOrg?.id) {
      fetchRegistrations()
    }
  }, [userOrg?.id])

  // ステータスタグ
  const getStatusTag = (status: string) => {
    const config: Record<
      string,
      { color: string; icon: React.ReactNode; text: string }
    > = {
      PENDING: { color: 'orange', icon: <WarningOutlined />, text: '保留中' },
      RESERVED: { color: 'green', icon: <CheckCircleOutlined />, text: '予約済' },
      FAILED: { color: 'red', icon: <CloseCircleOutlined />, text: '失敗' },
      ERROR: { color: 'red', icon: <CloseCircleOutlined />, text: 'エラー' },
    }
    const { color, icon, text } = config[status] || {
      color: 'gray',
      icon: null,
      text: status,
    }
    return (
      <Tag color={color} icon={icon}>
        {text}
      </Tag>
    )
  }

  // 詳細表示
  const showDetail = (registration: TempRegistration) => {
    setSelectedRegistration(registration)
    setDetailModalVisible(true)
  }

  // JWNET送信
  const handleSend = (registration: TempRegistration) => {
    setSelectedRegistration(registration)
    setSendModalVisible(true)
  }

  // 送信実行
  const handleSendConfirm = async () => {
    if (!selectedRegistration) return

    try {
      // TODO: 実際のJWNET送信API呼び出し
      message.success('JWNETへの送信を開始しました')
      setSendModalVisible(false)
      form.resetFields()
      fetchRegistrations()
    } catch (err) {
      console.error('Failed to send to JWNET:', err)
      message.error('JWNETへの送信に失敗しました')
    }
  }

  // 削除
  const handleDelete = async (id: string) => {
    try {
      // TODO: 実際の削除API呼び出し
      message.success('仮登録を削除しました')
      fetchRegistrations()
    } catch (err) {
      console.error('Failed to delete registration:', err)
      message.error('仮登録の削除に失敗しました')
    }
  }

  // テーブル列定義
  const columns = [
    {
      title: '店舗',
      key: 'store',
      width: 200,
      render: (_: any, record: TempRegistration) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.plan?.stores?.name}</Text>
          <Text type="secondary">{record.plan?.stores?.store_code}</Text>
        </Space>
      ),
    },
    {
      title: '予定日',
      dataIndex: ['plan', 'planned_date'],
      key: 'planned_date',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '数量',
      key: 'quantity',
      width: 120,
      render: (_: any, record: TempRegistration) =>
        `${record.plan?.planned_qty} ${record.plan?.unit}`,
    },
    {
      title: 'JWNET仮ID',
      dataIndex: 'jwnet_temp_id',
      key: 'jwnet_temp_id',
      width: 150,
      render: (id: string) => id || '-',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '最終送信',
      dataIndex: 'last_sent_at',
      key: 'last_sent_at',
      width: 180,
      render: (date: string) => (date ? new Date(date).toLocaleString('ja-JP') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: TempRegistration) => (
        <Space>
          <Tooltip title="詳細">
            <Button icon={<EyeOutlined />} onClick={() => showDetail(record)} size="small" />
          </Tooltip>
          {(record.status === 'PENDING' || record.status === 'ERROR') && (
            <Tooltip title="JWNET送信">
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleSend(record)}
                size="small"
              />
            </Tooltip>
          )}
          {record.status !== 'RESERVED' && (
            <Tooltip title="削除">
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.id)}
                size="small"
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Title level={2}>
            <WarningOutlined /> 仮登録管理
          </Title>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchRegistrations} loading={loading}>
            更新
          </Button>
        }
      >
        <Alert
          message="仮登録について"
          description="JWNETへの本登録前の予約データを管理します。ステータスがPENDINGまたはERRORの場合、再送信が可能です。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={columns}
          dataSource={registrations}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
          }}
        />
      </Card>

      {/* 詳細モーダル */}
      <Modal
        title="仮登録詳細"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedRegistration(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false)
              setSelectedRegistration(null)
            }}
          >
            閉じる
          </Button>,
        ]}
        width={700}
      >
        {selectedRegistration && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="店舗" span={2}>
              {selectedRegistration.plan?.stores?.name} ({selectedRegistration.plan?.stores?.store_code})
            </Descriptions.Item>
            <Descriptions.Item label="予定日">
              {new Date(selectedRegistration.plan?.planned_date || '').toLocaleDateString('ja-JP')}
            </Descriptions.Item>
            <Descriptions.Item label="数量">
              {selectedRegistration.plan?.planned_qty} {selectedRegistration.plan?.unit}
            </Descriptions.Item>
            <Descriptions.Item label="JWNET仮ID" span={2}>
              {selectedRegistration.jwnet_temp_id || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="ステータス">
              {getStatusTag(selectedRegistration.status)}
            </Descriptions.Item>
            <Descriptions.Item label="最終送信">
              {selectedRegistration.last_sent_at
                ? new Date(selectedRegistration.last_sent_at).toLocaleString('ja-JP')
                : '-'}
            </Descriptions.Item>
            {selectedRegistration.error_code && (
              <Descriptions.Item label="エラーコード" span={2}>
                <Text type="danger">{selectedRegistration.error_code}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="作成日時" span={2}>
              {new Date(selectedRegistration.created_at).toLocaleString('ja-JP')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* JWNET送信モーダル */}
      <Modal
        title="JWNET送信"
        open={sendModalVisible}
        onCancel={() => {
          setSendModalVisible(false)
          setSelectedRegistration(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        okText="送信"
        cancelText="キャンセル"
      >
        {selectedRegistration && (
          <Form form={form} layout="vertical" onFinish={handleSendConfirm}>
            <Alert
              message="確認"
              description={`店舗「${selectedRegistration.plan?.stores?.name}」の予約データをJWNETに送信します。よろしいですか？`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form.Item label="備考" name="notes">
              <TextArea rows={3} placeholder="送信に関する備考（任意）" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

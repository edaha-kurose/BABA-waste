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
  InputNumber,
  Select,
  DatePicker,
  message,
  Typography,
  Tag,
} from 'antd'
import {
  CalendarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

interface Plan {
  id: string
  org_id: string
  store_id: string
  planned_date: string
  item_map_id: string
  planned_qty: number
  unit: 'T' | 'KG' | 'M3'
  earliest_pickup_date?: string
  created_at: string
  stores?: {
    name: string
    store_code: string
  }
  item_maps?: {
    item_label: string
  }
}

export default function PlansPage() {
  const { userOrg } = useUser()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchPlans = async () => {
    if (!userOrg?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/plans?org_id=${userOrg.id}`)
      if (!response.ok) throw new Error('取得失敗')
      
      const data = await response.json()
      setPlans(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      console.error('Failed to fetch plans:', err)
      message.error('収集予定の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userOrg?.id) {
      fetchPlans()
    }
  }, [userOrg?.id])

  // 作成・編集
  const handleSubmit = async (values: any) => {
    try {
      const method = editingPlan ? 'PUT' : 'POST'
      const url = editingPlan ? `/api/plans/${editingPlan.id}` : '/api/plans'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          org_id: userOrg?.id,
          planned_date: values.planned_date.format('YYYY-MM-DD'),
          earliest_pickup_date: values.earliest_pickup_date
            ? values.earliest_pickup_date.format('YYYY-MM-DD')
            : undefined,
        }),
      })

      if (!response.ok) throw new Error('保存失敗')

      message.success(editingPlan ? '収集予定を更新しました' : '収集予定を作成しました')
      setModalVisible(false)
      setEditingPlan(null)
      form.resetFields()
      fetchPlans()
    } catch (err) {
      console.error('Failed to save plan:', err)
      message.error('収集予定の保存に失敗しました')
    }
  }

  // 削除
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/plans/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('削除失敗')

      message.success('収集予定を削除しました')
      fetchPlans()
    } catch (err) {
      console.error('Failed to delete plan:', err)
      message.error('収集予定の削除に失敗しました')
    }
  }

  // 編集
  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    form.setFieldsValue({
      ...plan,
      planned_date: dayjs(plan.planned_date),
      earliest_pickup_date: plan.earliest_pickup_date
        ? dayjs(plan.earliest_pickup_date)
        : undefined,
    })
    setModalVisible(true)
  }

  // 新規作成
  const handleCreate = () => {
    setEditingPlan(null)
    form.resetFields()
    setModalVisible(true)
  }

  // テーブル列定義
  const columns = [
    {
      title: '店舗',
      key: 'store',
      width: 200,
      render: (_: any, record: Plan) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.stores?.name}</Text>
          <Text type="secondary">{record.stores?.store_code}</Text>
        </Space>
      ),
    },
    {
      title: '品目',
      dataIndex: ['item_maps', 'item_label'],
      key: 'item',
      width: 150,
    },
    {
      title: '予定日',
      dataIndex: 'planned_date',
      key: 'planned_date',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '数量',
      key: 'quantity',
      width: 120,
      render: (_: any, record: Plan) => `${record.planned_qty} ${record.unit}`,
    },
    {
      title: '最早回収日',
      dataIndex: 'earliest_pickup_date',
      key: 'earliest_pickup_date',
      width: 120,
      render: (date: string) => (date ? new Date(date).toLocaleDateString('ja-JP') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: Plan) => (
        <Space>
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
            <CalendarOutlined /> 収集予定
          </Title>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchPlans} loading={loading}>
              更新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新規作成
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={plans}
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
        title={editingPlan ? '収集予定編集' : '新規収集予定作成'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingPlan(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        okText={editingPlan ? '更新' : '作成'}
        cancelText="キャンセル"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="店舗"
            name="store_id"
            rules={[{ required: true, message: '店舗を選択してください' }]}
          >
            <Select placeholder="店舗を選択">
              <Option value="store-1">本店 (ST001)</Option>
              <Option value="store-2">支店A (ST002)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="品目"
            name="item_map_id"
            rules={[{ required: true, message: '品目を選択してください' }]}
          >
            <Select placeholder="品目を選択">
              <Option value="item-1">混合廃棄物</Option>
              <Option value="item-2">蛍光灯</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="予定日"
            name="planned_date"
            rules={[{ required: true, message: '予定日を選択してください' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="数量"
            name="planned_qty"
            rules={[{ required: true, message: '数量を入力してください' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="単位"
            name="unit"
            rules={[{ required: true, message: '単位を選択してください' }]}
            initialValue="T"
          >
            <Select>
              <Option value="T">トン (T)</Option>
              <Option value="KG">キログラム (KG)</Option>
              <Option value="M3">立方メートル (M3)</Option>
            </Select>
          </Form.Item>

          <Form.Item label="最早回収日" name="earliest_pickup_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

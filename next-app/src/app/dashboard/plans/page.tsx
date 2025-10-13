'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Input, DatePicker, Space, message, Modal, Form, Select, InputNumber, Tag } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'

const { Search } = Input
const { Option } = Select
const { RangePicker } = DatePicker

interface Plan {
  id: string
  org_id: string
  store_id: string
  item_name: string
  planned_quantity: number
  unit: string
  planned_pickup_date: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
  organization?: {
    id: string
    name: string
    code: string
  }
  store?: {
    id: string
    store_code: string
    name: string
  }
}

const statusOptions = [
  { value: 'PENDING', label: '予定', color: 'default' },
  { value: 'CONFIRMED', label: '確定', color: 'blue' },
  { value: 'COMPLETED', label: '完了', color: 'green' },
  { value: 'CANCELLED', label: 'キャンセル', color: 'red' },
]

const unitOptions = ['L', 'T', 'KG', 'M3', 'PCS']

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [searchText, setSearchText] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [form] = Form.useForm()

  // データ取得
  const fetchPlans = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchText) params.append('search', searchText)
      if (filterStatus) params.append('status', filterStatus)
      if (dateRange[0]) params.append('from_date', dateRange[0].format('YYYY-MM-DD'))
      if (dateRange[1]) params.append('to_date', dateRange[1].format('YYYY-MM-DD'))

      const response = await fetch(`/api/plans?${params.toString()}`)
      const result = await response.json()

      if (response.ok) {
        setPlans(result.data)
      } else {
        message.error(result.message || '収集予定データの取得に失敗しました')
      }
    } catch (error) {
      message.error('収集予定データの取得中にエラーが発生しました')
      console.error('Error fetching plans:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  // 検索
  const handleSearch = () => {
    fetchPlans()
  }

  // モーダル表示
  const showModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan)
      form.setFieldsValue({
        ...plan,
        planned_pickup_date: plan.planned_pickup_date ? dayjs(plan.planned_pickup_date) : null,
      })
    } else {
      setEditingPlan(null)
      form.resetFields()
    }
    setIsModalVisible(true)
  }

  // モーダル閉じる
  const handleCancel = () => {
    setIsModalVisible(false)
    setEditingPlan(null)
    form.resetFields()
  }

  // 作成・更新
  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        planned_pickup_date: values.planned_pickup_date?.format('YYYY-MM-DD'),
      }

      const url = editingPlan ? `/api/plans/${editingPlan.id}` : '/api/plans'
      const method = editingPlan ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        message.success(editingPlan ? '収集予定を更新しました' : '収集予定を作成しました')
        handleCancel()
        fetchPlans()
      } else {
        message.error(result.message || '操作に失敗しました')
      }
    } catch (error) {
      message.error('操作中にエラーが発生しました')
      console.error('Error submitting plan:', error)
    }
  }

  // 削除
  const handleDelete = (plan: Plan) => {
    Modal.confirm({
      title: '収集予定を削除しますか？',
      content: `${plan.store?.name} - ${plan.item_name}`,
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/plans/${plan.id}`, {
            method: 'DELETE',
          })

          const result = await response.json()

          if (response.ok) {
            message.success('収集予定を削除しました')
            fetchPlans()
          } else {
            message.error(result.message || '削除に失敗しました')
          }
        } catch (error) {
          message.error('削除中にエラーが発生しました')
          console.error('Error deleting plan:', error)
        }
      },
    })
  }

  // テーブルカラム定義
  const columns: ColumnsType<Plan> = [
    {
      title: '収集予定日',
      dataIndex: 'planned_pickup_date',
      key: 'planned_pickup_date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a, b) => dayjs(a.planned_pickup_date).unix() - dayjs(b.planned_pickup_date).unix(),
    },
    {
      title: '店舗',
      dataIndex: ['store', 'name'],
      key: 'store',
      width: 150,
      ellipsis: true,
    },
    {
      title: '品目',
      dataIndex: 'item_name',
      key: 'item_name',
      width: 150,
    },
    {
      title: '予定数量',
      key: 'quantity',
      width: 120,
      render: (_, record) => `${record.planned_quantity} ${record.unit}`,
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const option = statusOptions.find(opt => opt.value === status)
        return (
          <Tag color={option?.color || 'default'}>
            {option?.label || status}
          </Tag>
        )
      },
    },
    {
      title: '備考',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
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
        <h2 className="text-2xl font-bold mb-4">収集予定管理</h2>

        <Space className="mb-4" size="middle" wrap>
          <Search
            placeholder="店舗・品目で検索"
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
          />

          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates || [null, null])}
            format="YYYY-MM-DD"
            placeholder={['開始日', '終了日']}
          />

          <Select
            placeholder="ステータス"
            allowClear
            style={{ width: 120 }}
            value={filterStatus || undefined}
            onChange={(value) => setFilterStatus(value || '')}
          >
            {statusOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showModal()}
          >
            新規作成
          </Button>

          <Button onClick={fetchPlans}>
            更新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={plans}
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
        title={editingPlan ? '収集予定編集' : '収集予定作成'}
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
            status: 'PENDING',
            unit: 'KG',
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
            name="store_id"
            label="店舗ID"
            rules={[{ required: true, message: '店舗IDを入力してください' }]}
          >
            <Input placeholder="店舗IDを入力" />
          </Form.Item>

          <Form.Item
            name="item_name"
            label="品目名"
            rules={[{ required: true, message: '品目名を入力してください' }]}
          >
            <Input placeholder="品目名を入力" />
          </Form.Item>

          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="planned_quantity"
              label="予定数量"
              rules={[{ required: true, message: '予定数量を入力してください' }]}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <InputNumber
                placeholder="数量"
                min={0}
                step={0.1}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="unit"
              label="単位"
              rules={[{ required: true, message: '単位を選択してください' }]}
              style={{ width: 100, marginBottom: 0 }}
            >
              <Select placeholder="単位">
                {unitOptions.map(unit => (
                  <Option key={unit} value={unit}>{unit}</Option>
                ))}
              </Select>
            </Form.Item>
          </Space.Compact>

          <Form.Item
            name="planned_pickup_date"
            label="収集予定日"
            rules={[{ required: true, message: '収集予定日を選択してください' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder="収集予定日を選択"
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="ステータス"
            rules={[{ required: true, message: 'ステータスを選択してください' }]}
          >
            <Select placeholder="ステータスを選択">
              {statusOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="備考"
          >
            <Input.TextArea placeholder="備考を入力" rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingPlan ? '更新' : '作成'}
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


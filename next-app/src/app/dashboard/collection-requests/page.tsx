'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Input, DatePicker, Space, message, Modal, Form, Select, Tag } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'

const { Search } = Input
const { Option } = Select
const { RangePicker } = DatePicker

interface CollectionRequest {
  id: string
  org_id: string
  store_id: string
  requested_date: string
  preferred_pickup_date?: string
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
  { value: 'PENDING', label: '申請中', color: 'default' },
  { value: 'CONFIRMED', label: '確認済', color: 'blue' },
  { value: 'COLLECTED', label: '収集済', color: 'green' },
  { value: 'COMPLETED', label: '完了', color: 'success' },
  { value: 'CANCELLED', label: 'キャンセル', color: 'red' },
]

export default function CollectionRequestsPage() {
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRequest, setEditingRequest] = useState<CollectionRequest | null>(null)
  const [searchText, setSearchText] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [form] = Form.useForm()

  // データ取得
  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchText) params.append('search', searchText)
      if (filterStatus) params.append('status', filterStatus)
      if (dateRange[0]) params.append('from_date', dateRange[0].format('YYYY-MM-DD'))
      if (dateRange[1]) params.append('to_date', dateRange[1].format('YYYY-MM-DD'))

      const response = await fetch(`/api/collection-requests?${params.toString()}`)
      const result = await response.json()

      if (response.ok) {
        setRequests(result.data)
      } else {
        message.error(result.message || '収集依頼データの取得に失敗しました')
      }
    } catch (error) {
      message.error('収集依頼データの取得中にエラーが発生しました')
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  // 検索
  const handleSearch = () => {
    fetchRequests()
  }

  // モーダル表示
  const showModal = (request?: CollectionRequest) => {
    if (request) {
      setEditingRequest(request)
      form.setFieldsValue({
        ...request,
        requested_date: request.requested_date ? dayjs(request.requested_date) : null,
        preferred_pickup_date: request.preferred_pickup_date ? dayjs(request.preferred_pickup_date) : null,
      })
    } else {
      setEditingRequest(null)
      form.resetFields()
    }
    setIsModalVisible(true)
  }

  // モーダル閉じる
  const handleCancel = () => {
    setIsModalVisible(false)
    setEditingRequest(null)
    form.resetFields()
  }

  // 作成・更新
  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        requested_date: values.requested_date?.format('YYYY-MM-DD'),
        preferred_pickup_date: values.preferred_pickup_date?.format('YYYY-MM-DD'),
      }

      const url = editingRequest ? `/api/collection-requests/${editingRequest.id}` : '/api/collection-requests'
      const method = editingRequest ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        message.success(editingRequest ? '収集依頼を更新しました' : '収集依頼を作成しました')
        handleCancel()
        fetchRequests()
      } else {
        message.error(result.message || '操作に失敗しました')
      }
    } catch (error) {
      message.error('操作中にエラーが発生しました')
      console.error('Error submitting request:', error)
    }
  }

  // 承認
  const handleApprove = (request: CollectionRequest) => {
    Modal.confirm({
      title: '収集依頼を承認しますか？',
      content: `${request.store?.name} - ${dayjs(request.requested_date).format('YYYY-MM-DD')}`,
      okText: '承認',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/collection-requests/${request.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'CONFIRMED' }),
          })

          const result = await response.json()

          if (response.ok) {
            message.success('収集依頼を承認しました')
            fetchRequests()
          } else {
            message.error(result.message || '承認に失敗しました')
          }
        } catch (error) {
          message.error('承認中にエラーが発生しました')
          console.error('Error approving request:', error)
        }
      },
    })
  }

  // 削除
  const handleDelete = (request: CollectionRequest) => {
    Modal.confirm({
      title: '収集依頼を削除しますか？',
      content: `${request.store?.name} - ${dayjs(request.requested_date).format('YYYY-MM-DD')}`,
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/collection-requests/${request.id}`, {
            method: 'DELETE',
          })

          const result = await response.json()

          if (response.ok) {
            message.success('収集依頼を削除しました')
            fetchRequests()
          } else {
            message.error(result.message || '削除に失敗しました')
          }
        } catch (error) {
          message.error('削除中にエラーが発生しました')
          console.error('Error deleting request:', error)
        }
      },
    })
  }

  // テーブルカラム定義
  const columns: ColumnsType<CollectionRequest> = [
    {
      title: '申請日',
      dataIndex: 'requested_date',
      key: 'requested_date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a, b) => dayjs(a.requested_date).unix() - dayjs(b.requested_date).unix(),
    },
    {
      title: '店舗',
      dataIndex: ['store', 'name'],
      key: 'store',
      width: 150,
      ellipsis: true,
    },
    {
      title: '希望収集日',
      dataIndex: 'preferred_pickup_date',
      key: 'preferred_pickup_date',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
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
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'PENDING' && (
            <Button
              type="link"
              icon={<CheckOutlined />}
              onClick={() => handleApprove(record)}
            >
              承認
            </Button>
          )}
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
        <h2 className="text-2xl font-bold mb-4">収集依頼管理</h2>

        <Space className="mb-4" size="middle" wrap>
          <Search
            placeholder="店舗で検索"
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

          <Button onClick={fetchRequests}>
            更新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={requests}
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
        title={editingRequest ? '収集依頼編集' : '収集依頼作成'}
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
            name="requested_date"
            label="申請日"
            rules={[{ required: true, message: '申請日を選択してください' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder="申請日を選択"
            />
          </Form.Item>

          <Form.Item
            name="preferred_pickup_date"
            label="希望収集日"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder="希望収集日を選択"
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
                {editingRequest ? '更新' : '作成'}
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


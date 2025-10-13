'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Input, DatePicker, Space, message, Modal, Form, Select, InputNumber, Tag } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'

const { Search } = Input
const { Option } = Select
const { RangePicker } = DatePicker

interface Collection {
  id: string
  org_id: string
  plan_id?: string
  store_id: string
  collector_id: string
  item_name: string
  collected_quantity: number
  unit: string
  collected_at: string
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
  { value: 'PENDING', label: '保留', color: 'default' },
  { value: 'SCHEDULED', label: '予定', color: 'blue' },
  { value: 'IN_PROGRESS', label: '実施中', color: 'processing' },
  { value: 'COLLECTED', label: '収集済', color: 'success' },
  { value: 'VERIFIED', label: '確認済', color: 'green' },
  { value: 'COMPLETED', label: '完了', color: 'green' },
  { value: 'CANCELLED', label: 'キャンセル', color: 'red' },
]

const unitOptions = ['L', 'T', 'KG', 'M3', 'PCS']

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [viewingCollection, setViewingCollection] = useState<Collection | null>(null)
  const [searchText, setSearchText] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [form] = Form.useForm()

  // データ取得
  const fetchCollections = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchText) params.append('search', searchText)
      if (filterStatus) params.append('status', filterStatus)
      if (dateRange[0]) params.append('from_date', dateRange[0].format('YYYY-MM-DD'))
      if (dateRange[1]) params.append('to_date', dateRange[1].format('YYYY-MM-DD'))

      const response = await fetch(`/api/collections?${params.toString()}`)
      const result = await response.json()

      if (response.ok) {
        setCollections(result.data)
      } else {
        message.error(result.message || '収集実績データの取得に失敗しました')
      }
    } catch (error) {
      message.error('収集実績データの取得中にエラーが発生しました')
      console.error('Error fetching collections:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  // 検索
  const handleSearch = () => {
    fetchCollections()
  }

  // 詳細表示
  const showDetailModal = (collection: Collection) => {
    setViewingCollection(collection)
    setIsDetailModalVisible(true)
  }

  // モーダル表示
  const showModal = (collection?: Collection) => {
    if (collection) {
      setEditingCollection(collection)
      form.setFieldsValue({
        ...collection,
        collected_at: collection.collected_at ? dayjs(collection.collected_at) : null,
      })
    } else {
      setEditingCollection(null)
      form.resetFields()
    }
    setIsModalVisible(true)
  }

  // モーダル閉じる
  const handleCancel = () => {
    setIsModalVisible(false)
    setEditingCollection(null)
    form.resetFields()
  }

  // 作成・更新
  const handleSubmit = async (values: any) => {
    try {
      const data = {
        ...values,
        collected_at: values.collected_at?.toISOString(),
      }

      const url = editingCollection ? `/api/collections/${editingCollection.id}` : '/api/collections'
      const method = editingCollection ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        message.success(editingCollection ? '収集実績を更新しました' : '収集実績を作成しました')
        handleCancel()
        fetchCollections()
      } else {
        message.error(result.message || '操作に失敗しました')
      }
    } catch (error) {
      message.error('操作中にエラーが発生しました')
      console.error('Error submitting collection:', error)
    }
  }

  // 削除
  const handleDelete = (collection: Collection) => {
    Modal.confirm({
      title: '収集実績を削除しますか？',
      content: `${collection.store?.name} - ${collection.item_name}`,
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/collections/${collection.id}`, {
            method: 'DELETE',
          })

          const result = await response.json()

          if (response.ok) {
            message.success('収集実績を削除しました')
            fetchCollections()
          } else {
            message.error(result.message || '削除に失敗しました')
          }
        } catch (error) {
          message.error('削除中にエラーが発生しました')
          console.error('Error deleting collection:', error)
        }
      },
    })
  }

  // テーブルカラム定義
  const columns: ColumnsType<Collection> = [
    {
      title: '収集日時',
      dataIndex: 'collected_at',
      key: 'collected_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => dayjs(a.collected_at).unix() - dayjs(b.collected_at).unix(),
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
      title: '収集数量',
      key: 'quantity',
      width: 120,
      render: (_, record) => `${record.collected_quantity} ${record.unit}`,
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
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showDetailModal(record)}
          >
            詳細
          </Button>
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
        <h2 className="text-2xl font-bold mb-4">収集実績管理</h2>

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

          <Button onClick={fetchCollections}>
            更新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={collections}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `全 ${total} 件`,
        }}
      />

      {/* 詳細表示モーダル */}
      <Modal
        title="収集実績詳細"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            閉じる
          </Button>,
        ]}
        width={600}
      >
        {viewingCollection && (
          <div>
            <p><strong>収集日時:</strong> {dayjs(viewingCollection.collected_at).format('YYYY-MM-DD HH:mm')}</p>
            <p><strong>店舗:</strong> {viewingCollection.store?.name}</p>
            <p><strong>品目:</strong> {viewingCollection.item_name}</p>
            <p><strong>収集数量:</strong> {viewingCollection.collected_quantity} {viewingCollection.unit}</p>
            <p><strong>ステータス:</strong> {statusOptions.find(opt => opt.value === viewingCollection.status)?.label}</p>
            <p><strong>備考:</strong> {viewingCollection.notes || 'なし'}</p>
          </div>
        )}
      </Modal>

      {/* 作成・編集モーダル */}
      <Modal
        title={editingCollection ? '収集実績編集' : '収集実績作成'}
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
            status: 'COLLECTED',
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
            name="collector_id"
            label="収集業者ID"
            rules={[{ required: true, message: '収集業者IDを入力してください' }]}
          >
            <Input placeholder="収集業者IDを入力" />
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
              name="collected_quantity"
              label="収集数量"
              rules={[{ required: true, message: '収集数量を入力してください' }]}
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
            name="collected_at"
            label="収集日時"
            rules={[{ required: true, message: '収集日時を選択してください' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="YYYY-MM-DD HH:mm"
              placeholder="収集日時を選択"
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
                {editingCollection ? '更新' : '作成'}
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


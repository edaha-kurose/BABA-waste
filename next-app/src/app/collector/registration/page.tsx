'use client'

/**
 * 収集業者用 - 回収実績登録画面
 * 既存collectionsテーブル活用（影響範囲: MEDIUM）
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
  Typography,
  Space,
  Upload,
} from 'antd'
import {
  PlusOutlined,
  CameraOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import CollectorLayout from '@/components/CollectorLayout'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

interface Collection {
  id: string
  request_id: string
  actual_qty: number
  actual_unit: string
  collected_at: string
  vehicle_no?: string
  driver_name?: string
  photo_urls?: string[]
}

export default function CollectorRegistrationPage() {
  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collections')
      if (!response.ok) throw new Error('データ取得失敗')
      const data = await response.json()
      setCollections(data.data || [])
    } catch (error) {
      console.error('[CollectorRegistration] Error:', error)
      message.error('データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreate = () => {
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleSave = async (values: any) => {
    try {
      const data = {
        ...values,
        collected_at: values.collected_at?.toISOString(),
      }

      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('保存失敗')

      message.success('回収実績を登録しました')
      setIsModalVisible(false)
      form.resetFields()
      fetchData()
    } catch (error) {
      console.error('[Save] Error:', error)
      message.error('保存に失敗しました')
    }
  }

  const columns = [
    {
      title: '回収日',
      dataIndex: 'collected_at',
      key: 'collected_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '数量',
      dataIndex: 'actual_qty',
      key: 'actual_qty',
      render: (qty: number, record: Collection) => `${qty} ${record.actual_unit}`,
    },
    {
      title: '車両番号',
      dataIndex: 'vehicle_no',
      key: 'vehicle_no',
      render: (no: string) => no || '-',
    },
    {
      title: 'ドライバー',
      dataIndex: 'driver_name',
      key: 'driver_name',
      render: (name: string) => name || '-',
    },
  ]

  return (
    <CollectorLayout>
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>回収実績登録</Title>
              <Text type="secondary">回収した実績を登録します</Text>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新規登録
            </Button>
          </div>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={collections}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="回収実績登録"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="collected_at"
            label="回収日時"
            rules={[{ required: true, message: '回収日時を選択してください' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="actual_qty"
            label="回収数量"
            rules={[{ required: true, message: '数量を入力してください' }]}
          >
            <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="actual_unit"
            label="単位"
            rules={[{ required: true, message: '単位を選択してください' }]}
          >
            <Select placeholder="単位を選択">
              <Option value="T">トン (T)</Option>
              <Option value="KG">キログラム (KG)</Option>
              <Option value="L">リットル (L)</Option>
              <Option value="M3">立方メートル (M3)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="vehicle_no" label="車両番号">
            <Input placeholder="例: 横浜 500 あ 1234" />
          </Form.Item>

          <Form.Item name="driver_name" label="ドライバー名">
            <Input placeholder="例: 山田太郎" />
          </Form.Item>

          <Form.Item name="weighing_ticket_no" label="計量票番号">
            <Input placeholder="計量票番号" />
          </Form.Item>

          <Form.Item label="写真">
            <Upload listType="picture-card" maxCount={5}>
              <div>
                <CameraOutlined />
                <div style={{ marginTop: 8 }}>アップロード</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setIsModalVisible(false); form.resetFields() }}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                登録
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </CollectorLayout>
  )
}











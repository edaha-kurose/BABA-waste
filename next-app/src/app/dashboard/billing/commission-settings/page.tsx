'use client'

/**
 * 手数料設定画面
 * URL: /dashboard/billing/commission-settings
 * 
 * 機能:
 * - 手数料ルールの一覧表示
 * - 新規作成・編集・削除
 * - 収集業者別・請求タイプ別の設定
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  InputNumber,
  DatePicker,
  Input,
  Switch,
  App,
  Spin,
  Alert,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { TextArea } = Input
const { RangePicker } = DatePicker

// 型定義
interface CommissionRule {
  id: string
  org_id: string
  collector_id: string | null
  billing_type: string
  commission_type: string
  commission_value: number
  is_active: boolean
  effective_from: string | null
  effective_to: string | null
  notes: string | null
  created_at: string
  collectors?: {
    company_name: string
  } | null
}

export default function CommissionSettingsPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<CommissionRule[]>([])
  const [collectors, setCollectors] = useState<any[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    fetchCollectors()
  }, [])

  // データ取得
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/commission-rules')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setRules(result.data || [])
    } catch (err) {
      console.error('Failed to fetch commission rules:', err)
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 収集業者一覧取得
  const fetchCollectors = async () => {
    try {
      const response = await fetch('/api/collectors?limit=1000')
      if (response.ok) {
        const result = await response.json()
        setCollectors(result.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch collectors:', err)
    }
  }

  // 新規作成
  const handleCreate = () => {
    setEditingRule(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 編集
  const handleEdit = (record: CommissionRule) => {
    setEditingRule(record)
    form.setFieldsValue({
      collector_id: record.collector_id,
      billing_type: record.billing_type,
      commission_type: record.commission_type,
      commission_value: record.commission_value,
      is_active: record.is_active,
      effective_range: record.effective_from && record.effective_to
        ? [dayjs(record.effective_from), dayjs(record.effective_to)]
        : null,
      notes: record.notes,
    })
    setModalVisible(true)
  }

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const payload = {
        collector_id: values.collector_id || null,
        billing_type: values.billing_type,
        commission_type: values.commission_type,
        commission_value: values.commission_value,
        is_active: values.is_active ?? true,
        effective_from: values.effective_range?.[0]?.format('YYYY-MM-DD') || null,
        effective_to: values.effective_range?.[1]?.format('YYYY-MM-DD') || null,
        notes: values.notes || null,
      }

      const url = editingRule
        ? `/api/commission-rules/${editingRule.id}`
        : '/api/commission-rules'
      const method = editingRule ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      message.success(editingRule ? '更新しました' : '作成しました')
      setModalVisible(false)
      await fetchData()
    } catch (err: any) {
      console.error('Failed to save:', err)
      message.error(err.message || '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // 削除
  const handleDelete = (record: CommissionRule) => {
    Modal.confirm({
      title: '削除確認',
      content: 'この手数料ルールを削除しますか？',
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/commission-rules/${record.id}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error('Failed to delete')
          }

          message.success('削除しました')
          await fetchData()
        } catch (err) {
          console.error('Failed to delete:', err)
          message.error('削除に失敗しました')
        }
      },
    })
  }

  // テーブルカラム定義
  const columns: ColumnsType<CommissionRule> = [
    {
      title: '収集業者',
      dataIndex: ['collectors', 'company_name'],
      key: 'collector',
      render: (name: string | undefined, record: CommissionRule) =>
        record.collector_id ? name || '-' : <Tag color="purple">全業者</Tag>,
    },
    {
      title: '請求タイプ',
      dataIndex: 'billing_type',
      key: 'billing_type',
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          ALL: 'purple',
          FIXED: 'blue',
          METERED: 'green',
          OTHER: 'orange',
        }
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>
      },
    },
    {
      title: '手数料タイプ',
      dataIndex: 'commission_type',
      key: 'commission_type',
      render: (type: string) => <Tag color="cyan">{type}</Tag>,
    },
    {
      title: '手数料値',
      dataIndex: 'commission_value',
      key: 'commission_value',
      align: 'right',
      render: (value: number, record: CommissionRule) =>
        record.commission_type === 'PERCENTAGE'
          ? `${value.toFixed(2)}%`
          : `¥${value.toLocaleString()}`,
    },
    {
      title: '有効期間',
      key: 'effective_period',
      render: (_: any, record: CommissionRule) => {
        if (!record.effective_from && !record.effective_to) {
          return <Tag>無期限</Tag>
        }
        return (
          <span>
            {record.effective_from ? dayjs(record.effective_from).format('YYYY-MM-DD') : '開始日なし'}
            {' 〜 '}
            {record.effective_to ? dayjs(record.effective_to).format('YYYY-MM-DD') : '終了日なし'}
          </span>
        )
      },
    },
    {
      title: 'ステータス',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) =>
        active ? <Tag color="success">有効</Tag> : <Tag>無効</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: CommissionRule) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
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
    <App>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {error && <Alert type="error" message={error} showIcon />}

        <Card
          title="手数料設定"
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                更新
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新規作成
              </Button>
            </Space>
          }
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>読み込み中...</div>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={rules}
              rowKey="id"
              pagination={{ pageSize: 20, showSizeChanger: true }}
            />
          )}
        </Card>

        {/* 作成・編集モーダル */}
        <Modal
          title={editingRule ? '手数料ルール編集' : '手数料ルール作成'}
          open={modalVisible}
          onOk={handleSave}
          onCancel={() => setModalVisible(false)}
          confirmLoading={saving}
          width={600}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="収集業者"
              name="collector_id"
              tooltip="指定しない場合は全業者に適用されます"
            >
              <Select
                placeholder="全業者に適用"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={collectors.map((c) => ({
                  label: c.company_name,
                  value: c.id,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="請求タイプ"
              name="billing_type"
              rules={[{ required: true, message: '請求タイプを選択してください' }]}
            >
              <Select>
                <Select.Option value="ALL">全タイプ</Select.Option>
                <Select.Option value="FIXED">固定費</Select.Option>
                <Select.Option value="METERED">従量費</Select.Option>
                <Select.Option value="OTHER">その他</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="手数料タイプ"
              name="commission_type"
              rules={[{ required: true, message: '手数料タイプを選択してください' }]}
            >
              <Select>
                <Select.Option value="PERCENTAGE">パーセンテージ（%）</Select.Option>
                <Select.Option value="FIXED_AMOUNT">固定金額</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="手数料値"
              name="commission_value"
              rules={[{ required: true, message: '手数料値を入力してください' }]}
              tooltip="パーセンテージの場合は0-100、固定金額の場合は金額を入力"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.1}
                precision={2}
              />
            </Form.Item>

            <Form.Item label="有効期間" name="effective_range">
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="有効" name="is_active" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>

            <Form.Item label="メモ" name="notes">
              <TextArea rows={3} maxLength={500} />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </App>
  )
}



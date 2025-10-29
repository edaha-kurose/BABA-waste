'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Select,
  DatePicker,
  Card,
  Statistic,
  Space,
  message,
  Modal,
  Tag,
  InputNumber,
  Form,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  LockOutlined,
  SendOutlined,
  CheckOutlined,
  EditOutlined,
  FileExcelOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useSelectedTenant } from '@/hooks/useSelectedTenant'

const { Option } = Select
const { Text } = Typography

// InputNumber parser helper
const parseNumberFromCurrency = (value: string | undefined): number => {
  if (!value) return 0
  const cleaned = value.replace(/\¥\s?|(,*)/g, '')
  const parsed = Number(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

interface TenantInvoiceItem {
  id: string
  tenant_invoice_id: string
  item_type: string
  item_name: string
  item_description?: string
  base_amount: number
  commission_amount: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  is_auto_calculated: boolean
  display_order: number
  notes?: string
  collectors?: {
    id: string
    company_name: string
  }
}

interface TenantInvoice {
  id: string
  org_id: string
  billing_month: string
  invoice_number: string
  collectors_subtotal: number
  collectors_tax: number
  collectors_total: number
  commission_subtotal: number
  commission_tax: number
  commission_total: number
  grand_subtotal: number
  grand_tax: number
  grand_total: number
  status: string
  locked_at?: string
  issued_at?: string
  paid_at?: string
  tenant_invoice_items: TenantInvoiceItem[]
}

export default function TenantInvoicesPage() {
  const { selectedTenantId } = useSelectedTenant()
  const [messageApi, contextHolder] = message.useMessage()

  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs())
  const [invoice, setInvoice] = useState<TenantInvoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingKey, setEditingKey] = useState('')
  const [form] = Form.useForm()

  // 請求書を取得
  const fetchInvoice = useCallback(async () => {
    if (!selectedTenantId) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/tenant-invoices?org_id=${selectedTenantId}&billing_month=${selectedMonth.format('YYYY-MM-DD')}`
      )
      if (!response.ok) throw new Error('Failed to fetch invoice')
      const result = await response.json()
      setInvoice(result.data?.[0] || null)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }, [selectedTenantId, selectedMonth])

  useEffect(() => {
    if (selectedTenantId) {
      fetchInvoice()
    }
  }, [selectedTenantId, selectedMonth, fetchInvoice])

  // 請求書生成
  const handleGenerate = async () => {
    if (!selectedTenantId) {
      messageApi.error('テナントを選択してください')
      return
    }

    Modal.confirm({
      title: 'テナント請求書を生成しますか？',
      content: '承認済みの収集業者請求を集計し、手数料を自動計算します。',
      okText: '生成',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch('/api/tenant-invoices/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              org_id: selectedTenantId,
              billing_month: selectedMonth.format('YYYY-MM-DD'),
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to generate invoice')
          }

          const result = await response.json()
          messageApi.success(result.message || '請求書を生成しました')
          fetchInvoice()
        } catch (error: any) {
          console.error('Error generating invoice:', error)
          messageApi.error(error.message || '生成に失敗しました')
        }
      },
    })
  }

  // 編集モード開始
  const edit = (record: TenantInvoiceItem) => {
    form.setFieldsValue({
      subtotal: record.subtotal,
      tax_rate: record.tax_rate,
      notes: record.notes || '',
    })
    setEditingKey(record.id)
  }

  // 編集キャンセル
  const cancel = () => {
    setEditingKey('')
  }

  // 編集保存
  const save = async (id: string) => {
    try {
      const row = await form.validateFields()

      const response = await fetch(`/api/tenant-invoices/${invoice!.id}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      })

      if (!response.ok) throw new Error('Failed to update item')

      messageApi.success('明細を更新しました')
      setEditingKey('')
      fetchInvoice()
    } catch (error) {
      console.error('Error saving item:', error)
      messageApi.error('更新に失敗しました')
    }
  }

  // ロック
  const handleLock = () => {
    if (!invoice) return

    Modal.confirm({
      title: '請求書を確定しますか？',
      content: '確定後は明細の編集ができなくなります。',
      okText: '確定',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/tenant-invoices/${invoice.id}/lock`, {
            method: 'POST',
          })

          if (!response.ok) throw new Error('Failed to lock')

          const result = await response.json()
          messageApi.success(result.message || '請求書を確定しました')
          fetchInvoice()
        } catch (error) {
          console.error('Error locking invoice:', error)
          messageApi.error('確定に失敗しました')
        }
      },
    })
  }

  // 発行
  const handleIssue = () => {
    if (!invoice) return

    Modal.confirm({
      title: '請求書を発行しますか？',
      content: 'テナントに請求書を発行します。',
      okText: '発行',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/tenant-invoices/${invoice.id}/issue`, {
            method: 'POST',
          })

          if (!response.ok) throw new Error('Failed to issue')

          const result = await response.json()
          messageApi.success(result.message || '請求書を発行しました')
          fetchInvoice()
        } catch (error) {
          console.error('Error issuing invoice:', error)
          messageApi.error('発行に失敗しました')
        }
      },
    })
  }

  // 入金確認
  const handlePaid = () => {
    if (!invoice) return

    Modal.confirm({
      title: '入金を確認しましたか？',
      content: 'ステータスを「入金済み」に変更します。',
      okText: '確認',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/tenant-invoices/${invoice.id}/paid`, {
            method: 'PATCH',
          })

          if (!response.ok) throw new Error('Failed to mark as paid')

          const result = await response.json()
          messageApi.success(result.message || '入金を確認しました')
          fetchInvoice()
        } catch (error) {
          console.error('Error marking as paid:', error)
          messageApi.error('入金確認に失敗しました')
        }
      },
    })
  }

  // Excel出力
  const handleExport = async () => {
    if (!invoice) return

    try {
      messageApi.loading('Excel出力中...', 0)

      const response = await fetch(`/api/tenant-invoices/${invoice.id}/export-excel`)
      if (!response.ok) throw new Error('Failed to export')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tenant_invoice_${invoice.invoice_number}_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      messageApi.destroy()
      messageApi.success('Excel出力しました')
    } catch (error) {
      console.error('Error exporting:', error)
      messageApi.destroy()
      messageApi.error('出力に失敗しました')
    }
  }

  const columns = [
    {
      title: '項目種別',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          COLLECTOR_BILLING: { text: '収集業者請求', color: 'blue' },
          COMMISSION: { text: '手数料', color: 'orange' },
          MANAGEMENT_FEE: { text: '管理費', color: 'purple' },
          OTHER: { text: 'その他', color: 'default' },
        }
        const config = typeMap[type] || { text: type, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '項目名',
      dataIndex: 'item_name',
      key: 'item_name',
      width: 200,
    },
    {
      title: '収集業者',
      dataIndex: ['collectors', 'company_name'],
      key: 'collector_name',
      width: 150,
      render: (name?: string) => name || '-',
    },
    {
      title: '小計',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 150,
      align: 'right' as const,
      editable: true,
      render: (subtotal: number, record: TenantInvoiceItem) => {
        const isEditing = editingKey === record.id
        if (isEditing) {
          return (
            <Form.Item
              name="subtotal"
              style={{ margin: 0 }}
              rules={[{ required: true, message: '必須項目です' }]}
            >
              <InputNumber
                min={0}
                step={100}
                formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={parseNumberFromCurrency}
                style={{ width: '100%' }}
              />
            </Form.Item>
          )
        }
        return (
          <span style={{ color: record.is_auto_calculated ? '' : '#ff4d4f' }}>
            ¥{subtotal.toLocaleString()}
            {!record.is_auto_calculated && ' (手動)'}
          </span>
        )
      },
    },
    {
      title: '税率 (%)',
      dataIndex: 'tax_rate',
      key: 'tax_rate',
      width: 100,
      align: 'right' as const,
      editable: true,
      render: (rate: number, record: TenantInvoiceItem) => {
        const isEditing = editingKey === record.id
        if (isEditing) {
          return (
            <Form.Item
              name="tax_rate"
              style={{ margin: 0 }}
              rules={[{ required: true, message: '必須項目です' }]}
            >
              <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          )
        }
        return `${rate}%`
      },
    },
    {
      title: '消費税',
      dataIndex: 'tax_amount',
      key: 'tax_amount',
      width: 120,
      align: 'right' as const,
      render: (tax: number) => `¥${tax.toLocaleString()}`,
    },
    {
      title: '合計',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 150,
      align: 'right' as const,
      render: (total: number) => <strong>¥{total.toLocaleString()}</strong>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: TenantInvoiceItem) => {
        const isEditing = editingKey === record.id
        const canEdit = invoice?.status === 'DRAFT'

        if (!canEdit) {
          return <Text type="secondary">-</Text>
        }

        return isEditing ? (
          <Space>
            <Button type="link" onClick={() => save(record.id)} size="small">
              保存
            </Button>
            <Button type="link" onClick={cancel} size="small">
              キャンセル
            </Button>
          </Space>
        ) : (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => edit(record)}
            size="small"
            disabled={editingKey !== ''}
          >
            編集
          </Button>
        )
      },
    },
  ]

  return (
    <>
      {contextHolder}
      <div style={{ padding: '24px' }}>
        <h1>テナント請求書管理</h1>

        {/* フィルタ */}
        <Card style={{ marginBottom: '24px' }}>
          <Space wrap>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(date) => date && setSelectedMonth(date)}
              format="YYYY年MM月"
              style={{ width: 200 }}
            />
          </Space>
        </Card>

        {/* サマリー */}
        {invoice && (
          <Card style={{ marginBottom: '24px' }}>
            <Space size="large" wrap>
              <Statistic
                title="収集業者請求額"
                value={invoice.collectors_total}
                prefix="¥"
                valueStyle={{ color: '#1890ff' }}
              />
              <Statistic
                title="手数料・管理費"
                value={invoice.commission_total}
                prefix="¥"
                valueStyle={{ color: '#fa8c16' }}
              />
              <Statistic
                title="小計"
                value={invoice.grand_subtotal}
                prefix="¥"
              />
              <Statistic
                title="消費税"
                value={invoice.grand_tax}
                prefix="¥"
              />
              <Statistic
                title="テナント請求額"
                value={invoice.grand_total}
                prefix="¥"
                valueStyle={{ color: '#3f8600', fontWeight: 'bold', fontSize: '28px' }}
              />
              <div>
                <div style={{ marginBottom: '8px', color: 'rgba(0, 0, 0, 0.45)' }}>ステータス</div>
                <Tag
                  color={
                    invoice.status === 'DRAFT'
                      ? 'default'
                      : invoice.status === 'LOCKED'
                      ? 'blue'
                      : invoice.status === 'ISSUED'
                      ? 'green'
                      : 'success'
                  }
                  style={{ fontSize: '16px', padding: '4px 12px' }}
                >
                  {invoice.status === 'DRAFT'
                    ? '下書き'
                    : invoice.status === 'LOCKED'
                    ? '確定'
                    : invoice.status === 'ISSUED'
                    ? '発行済み'
                    : '入金済み'}
                </Tag>
              </div>
            </Space>
          </Card>
        )}

        {/* アクション */}
        <Space wrap style={{ marginBottom: '16px' }}>
          {!invoice && (
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleGenerate}>
              📊 Step 1: テナント請求書を生成
            </Button>
          )}

          {invoice && invoice.status === 'DRAFT' && (
            <Button type="primary" size="large" icon={<LockOutlined />} onClick={handleLock}>
              🔒 Step 2: 確定・ロック
            </Button>
          )}

          {invoice && invoice.status === 'LOCKED' && (
            <Button type="primary" size="large" icon={<SendOutlined />} onClick={handleIssue}>
              📤 Step 3: 請求書発行
            </Button>
          )}

          {invoice && invoice.status === 'ISSUED' && (
            <Button type="primary" size="large" icon={<CheckOutlined />} onClick={handlePaid}>
              💰 Step 4: 入金確認
            </Button>
          )}

          {invoice && (
            <Button size="large" icon={<FileExcelOutlined />} onClick={handleExport}>
              Excel出力
            </Button>
          )}
        </Space>

        {/* 明細一覧（編集可能） */}
        {invoice && (
          <Form form={form} component={false}>
            <Table
              columns={columns}
              dataSource={invoice.tenant_invoice_items}
              rowKey="id"
              loading={loading}
              pagination={false}
              scroll={{ x: 1400 }}
              rowClassName={(record) => (record.is_auto_calculated ? '' : 'manual-edit-row')}
            />
          </Form>
        )}

        {!invoice && !loading && (
          <Card>
            <p style={{ textAlign: 'center', color: '#999' }}>
              請求書がありません。「テナント請求書を生成」ボタンから作成してください。
            </p>
          </Card>
        )}
      </div>

      <style jsx global>{`
        .manual-edit-row {
          background-color: #fff7e6;
        }
        .manual-edit-row:hover > td {
          background-color: #ffe7ba !important;
        }
      `}</style>
    </>
  )
}


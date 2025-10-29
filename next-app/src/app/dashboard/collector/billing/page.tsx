'use client'

import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Select, DatePicker, Card, Statistic, Space, message, Modal, Tag } from 'antd'
import { SendOutlined, CalculatorOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useUser } from '@/lib/auth/session'

const { Option } = Select

interface BillingItem {
  id: string
  store_id: string
  item_name: string
  billing_type: string
  quantity: number
  unit: string
  unit_price: number
  amount: number
  tax_amount: number
  total_amount: number
  status: string
  stores?: { name: string }
}

interface BillingSummary {
  id: string
  billing_month: string
  status: string
  total_fixed_amount: number
  total_metered_amount: number
  total_other_amount: number
  subtotal_amount: number
  tax_amount: number
  total_amount: number
  total_items_count: number
  submitted_at?: string
}

export default function CollectorBillingPage() {
  const { user, userOrg, loading: authLoading } = useUser()
  const [messageApi, contextHolder] = message.useMessage()

  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs())
  const [billingItems, setBillingItems] = useState<BillingItem[]>([])
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const orgId = userOrg?.id
  const collectorId = user?.id // 収集業者のユーザーID ≒ collector_id

  // 請求明細を取得
  const fetchBillingItems = useCallback(async () => {
    if (!orgId || !collectorId) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/billing-items?org_id=${orgId}&collector_id=${collectorId}&billing_month=${selectedMonth.format('YYYY-MM-DD')}`
      )
      if (!response.ok) throw new Error('Failed to fetch billing items')
      const result = await response.json()
      setBillingItems(result.data || [])
    } catch (error) {
      console.error('Error fetching billing items:', error)
      messageApi.error('請求明細の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [orgId, collectorId, selectedMonth, messageApi])

  // 請求サマリーを取得
  const fetchBillingSummary = useCallback(async () => {
    if (!orgId || !collectorId) return

    try {
      const response = await fetch(
        `/api/billing-summaries?org_id=${orgId}&collector_id=${collectorId}&billing_month=${selectedMonth.format('YYYY-MM-DD')}`
      )
      if (!response.ok) throw new Error('Failed to fetch billing summary')
      const result = await response.json()
      setBillingSummary(result.data?.[0] || null)
    } catch (error) {
      console.error('Error fetching billing summary:', error)
    }
  }, [orgId, collectorId, selectedMonth])

  useEffect(() => {
    if (orgId && collectorId) {
      fetchBillingItems()
      fetchBillingSummary()
    }
  }, [orgId, collectorId, selectedMonth, fetchBillingItems, fetchBillingSummary])

  // サマリー生成
  const handleGenerateSummary = async () => {
    if (!orgId || !collectorId) {
      messageApi.error('組織情報が取得できません')
      return
    }

    try {
      const response = await fetch('/api/billing-summaries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          collector_id: collectorId,
          billing_month: selectedMonth.format('YYYY-MM-DD'),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate summary')
      }

      const result = await response.json()
      messageApi.success(result.message || '請求サマリーを生成しました')
      fetchBillingSummary()
    } catch (error: any) {
      console.error('Error generating summary:', error)
      messageApi.error(error.message || 'サマリー生成に失敗しました')
    }
  }

  // 提出
  const handleSubmit = () => {
    if (!billingSummary) {
      messageApi.error('請求サマリーが存在しません')
      return
    }

    if (billingSummary.status !== 'DRAFT') {
      messageApi.warning('DRAFT状態の請求書のみ提出可能です')
      return
    }

    Modal.confirm({
      title: '請求書を提出しますか？',
      content: '提出後は編集できなくなります。システム管理会社の承認をお待ちください。',
      okText: '提出',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch('/api/billing-summaries/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              billing_summary_ids: [billingSummary.id],
            }),
          })

          if (!response.ok) throw new Error('Failed to submit')

          const result = await response.json()
          messageApi.success(result.message || '請求書を提出しました')
          fetchBillingSummary()
        } catch (error) {
          console.error('Error submitting billing:', error)
          messageApi.error('提出に失敗しました')
        }
      },
    })
  }

  const columns = [
    {
      title: '店舗',
      dataIndex: ['stores', 'name'],
      key: 'store_name',
      width: 150,
    },
    {
      title: '請求種別',
      dataIndex: 'billing_type',
      key: 'billing_type',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          FIXED: { text: '固定', color: 'blue' },
          METERED: { text: '従量', color: 'green' },
          OTHER: { text: 'その他', color: 'orange' },
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
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right' as const,
      render: (qty: number, record: BillingItem) => `${qty} ${record.unit}`,
    },
    {
      title: '単価',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      align: 'right' as const,
      render: (price: number) => `¥${price.toLocaleString()}`,
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '税額',
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
      width: 120,
      align: 'right' as const,
      render: (total: number) => <strong>¥{total.toLocaleString()}</strong>,
    },
  ]

  if (authLoading) {
    return <div style={{ padding: '24px' }}>読み込み中...</div>
  }

  return (
    <>
      {contextHolder}
      <div style={{ padding: '24px' }}>
        <h1>収集業者 請求管理</h1>

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
        {billingSummary && (
          <Card style={{ marginBottom: '24px' }}>
            <Space size="large" wrap>
              <Statistic title="固定費" value={billingSummary.total_fixed_amount} prefix="¥" />
              <Statistic title="従量費" value={billingSummary.total_metered_amount} prefix="¥" />
              <Statistic title="その他" value={billingSummary.total_other_amount} prefix="¥" />
              <Statistic title="小計" value={billingSummary.subtotal_amount} prefix="¥" />
              <Statistic title="消費税" value={billingSummary.tax_amount} prefix="¥" />
              <Statistic
                title="合計請求額"
                value={billingSummary.total_amount}
                prefix="¥"
                valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
              />
              <Statistic title="ステータス" value={billingSummary.status} />
            </Space>
          </Card>
        )}

        {/* アクション */}
        <Space wrap style={{ marginBottom: '16px' }}>
          <Button
            type="default"
            size="large"
            icon={<CalculatorOutlined />}
            onClick={handleGenerateSummary}
            disabled={billingItems.length === 0}
          >
            📊 Step 1: 請求サマリーを生成
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            disabled={!billingSummary || billingSummary.status !== 'DRAFT'}
          >
            📤 Step 2: システム管理会社に提出
          </Button>
        </Space>

        {/* 明細一覧 */}
        <Table
          columns={columns}
          dataSource={billingItems}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1200 }}
        />
      </div>
    </>
  )
}



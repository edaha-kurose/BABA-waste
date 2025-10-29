'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Typography, Spin, Alert, Space, Tag, Descriptions } from 'antd'
import { useParams, useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

interface CollectorInfo {
  id: string
  company_name: string
  email: string | null
  phone: string | null
}

interface BillingSummary {
  id: string
  billing_month: Date
  collector_id: string
  total_amount: number
  total_fixed_amount: number
  total_metered_amount: number
  total_other_amount: number
  subtotal_amount: number
  tax_amount: number
  total_items_count: number
  fixed_items_count: number
  metered_items_count: number
  other_items_count: number
  status: string
  created_at: string
  collectors: CollectorInfo
}

export default function BillingMonthDetailPage() {
  const params = useParams()
  const router = useRouter()
  const month = params?.month as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BillingSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (month) {
      fetchMonthData()
    }
  }, [month])

  const fetchMonthData = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/billing-summaries/by-month?billing_month=${month}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const json = await res.json()
      if (json.success) {
        setData(json.data || [])
      } else {
        setError(json.error || '取得失敗')
      }
    } catch (err) {
      console.error('[UI] Fetch error:', err)
      setError('データ取得エラー')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = data.reduce((sum, row) => sum + Number(row.total_amount), 0)
  const totalCollectors = data.length

  const columns: ColumnsType<BillingSummary> = [
    {
      title: '収集業者',
      dataIndex: ['collectors', 'company_name'],
      key: 'company_name',
    },
    {
      title: '固定費',
      dataIndex: 'total_fixed_amount',
      key: 'total_fixed_amount',
      align: 'right',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: '従量費',
      dataIndex: 'total_metered_amount',
      key: 'total_metered_amount',
      align: 'right',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: 'その他',
      dataIndex: 'total_other_amount',
      key: 'total_other_amount',
      align: 'right',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: '小計',
      dataIndex: 'subtotal_amount',
      key: 'subtotal_amount',
      align: 'right',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: '消費税',
      dataIndex: 'tax_amount',
      key: 'tax_amount',
      align: 'right',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: '合計金額',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      render: (val: number) => <strong>¥{val.toLocaleString()}</strong>,
    },
    {
      title: '明細数',
      dataIndex: 'total_items_count',
      key: 'total_items_count',
      align: 'center',
      render: (val: number, record: BillingSummary) => (
        <span>
          {val} <small>(固定:{record.fixed_items_count} / 従量:{record.metered_items_count} / その他:{record.other_items_count})</small>
        </span>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          DRAFT: { text: '収集業者編集中', color: 'default' },
          SUBMITTED: { text: '提出済み', color: 'processing' },
          APPROVED: { text: '管理会社承認済', color: 'success' },
          REJECTED: { text: '差し戻し', color: 'error' },
          FINALIZED: { text: '排出企業へ請求確定', color: 'cyan' },
          CANCELLED: { text: 'キャンセル', color: 'error' },
        }
        const config = statusMap[status] || { text: status, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>請求詳細 - {month}</Title>
          <a onClick={() => router.back()} style={{ cursor: 'pointer' }}>
            ← 一覧に戻る
          </a>
        </div>

        {error && <Alert type="error" message={error} showIcon />}

        {!loading && !error && (
          <Card>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="請求月">{month}</Descriptions.Item>
              <Descriptions.Item label="収集業者数">{totalCollectors}</Descriptions.Item>
              <Descriptions.Item label="合計請求額" span={2}>
                <Tag color="blue" style={{ fontSize: '16px', padding: '4px 12px' }}>
                  ¥{totalAmount.toLocaleString()}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Card title="収集業者別内訳">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>読み込み中...</div>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              pagination={false}
              onRow={(record) => ({
                onClick: () => {
                  router.push(`/dashboard/billing/month/${month}/collector/${record.collector_id}`)
                },
                style: { cursor: 'pointer' },
              })}
            />
          )}
        </Card>
      </Space>
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Typography, Spin, Alert, Space } from 'antd'
import { useRouter } from 'next/navigation'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

interface MonthlyData {
  billing_month: string
  total_amount: number
  collector_count: number
}

export default function BillingOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MonthlyData[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMonthlyData()
  }, [])

  const fetchMonthlyData = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/billing-summaries/months')
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

  const columns: ColumnsType<MonthlyData> = [
    {
      title: '請求月',
      dataIndex: 'billing_month',
      key: 'billing_month',
      render: (month: string) => <strong>{month}</strong>,
    },
    {
      title: '合計金額',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '収集業者数',
      dataIndex: 'collector_count',
      key: 'collector_count',
      align: 'center',
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Title level={2}>請求管理 - 月別一覧</Title>

        {error && <Alert type="error" message={error} showIcon />}

        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>読み込み中...</div>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={data}
              rowKey="billing_month"
              pagination={{ pageSize: 12 }}
              onRow={(record) => ({
                onClick: () => {
                  router.push(`/dashboard/billing/month/${record.billing_month}`)
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



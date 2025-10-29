'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, Table, Spin, Alert, Space, Button, Select, DatePicker } from 'antd'
import { useRouter } from 'next/navigation'
import { ReloadOutlined, FilterOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'

interface MonthlyData {
  billing_month: string
  total_amount: number
  collector_count: number
}

export default function MonthlyOverviewTab() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MonthlyData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

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

  // 年と月のオプションを生成
  const yearOptions = useMemo(() => {
    const years = new Set<string>()
    data.forEach((item) => {
      const year = item.billing_month.split('-')[0]
      years.add(year)
    })
    return Array.from(years).sort().reverse()
  }, [data])

  const monthOptions = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

  // フィルタリングされたデータ
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const [year, month] = item.billing_month.split('-')
      
      if (selectedYear !== 'all' && year !== selectedYear) {
        return false
      }
      
      if (selectedMonth !== 'all' && month !== selectedMonth) {
        return false
      }
      
      return true
    })
  }, [data, selectedYear, selectedMonth])

  const columns: ColumnsType<MonthlyData> = [
    {
      title: '請求月',
      dataIndex: 'billing_month',
      key: 'billing_month',
      sorter: (a, b) => a.billing_month.localeCompare(b.billing_month),
      defaultSortOrder: 'descend',
      render: (month: string) => <strong>{month}</strong>,
    },
    {
      title: '合計金額',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      sorter: (a, b) => a.total_amount - b.total_amount,
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '収集業者数',
      dataIndex: 'collector_count',
      key: 'collector_count',
      align: 'center',
      sorter: (a, b) => a.collector_count - b.collector_count,
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {error && <Alert type="error" message={error} showIcon />}

      {/* フィルター */}
      <Card>
        <Space size="middle" wrap>
          <div>
            <FilterOutlined style={{ marginRight: 8 }} />
            <label style={{ marginRight: 8 }}>年:</label>
            <Select
              style={{ width: 120 }}
              value={selectedYear}
              onChange={setSelectedYear}
            >
              <Select.Option value="all">全て</Select.Option>
              {yearOptions.map((year) => (
                <Select.Option key={year} value={year}>
                  {year}年
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <label style={{ marginRight: 8 }}>月:</label>
            <Select
              style={{ width: 120 }}
              value={selectedMonth}
              onChange={setSelectedMonth}
            >
              <Select.Option value="all">全て</Select.Option>
              {monthOptions.map((month) => (
                <Select.Option key={month} value={month}>
                  {parseInt(month)}月
                </Select.Option>
              ))}
            </Select>
          </div>
          <Button
            onClick={() => {
              setSelectedYear('all')
              setSelectedMonth('all')
            }}
          >
            フィルタークリア
          </Button>
        </Space>
      </Card>

      <Card
        title={`請求月別一覧 (${filteredData.length}/${data.length}ヶ月)`}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchMonthlyData}
            loading={loading}
          >
            更新
          </Button>
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
            dataSource={filteredData}
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

      <Alert
        type="info"
        message="使い方"
        description={
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>年・月でフィルタリングできます</li>
            <li>各列のヘッダーをクリックすると昇順・降順でソートできます</li>
            <li>月をクリックすると詳細画面に移動します</li>
          </ul>
        }
        showIcon
      />
    </Space>
  )
}


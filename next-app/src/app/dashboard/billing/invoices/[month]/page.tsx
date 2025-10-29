'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Typography, Spin, Alert, Space, Button, Tag, message } from 'antd'
import { useParams, useRouter } from 'next/navigation'
import { FileTextOutlined, DownloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text } = Typography

interface CollectorInfo {
  id: string
  company_name: string
  email: string | null
  phone: string | null
}

interface BillingSummary {
  id: string
  billing_month: string
  collector_id: string
  total_amount: number
  fixed_monthly_fee: number
  actual_qty_amount: number
  other_charges: number
  item_count: number
  created_at: string
  collectors: CollectorInfo
}

export default function BillingInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const month = params?.month as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BillingSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)

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

  const handleGenerateInvoices = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('請求書を作成する収集業者を選択してください')
      return
    }

    setGenerating(true)
    try {
      // TODO: 請求書生成APIを実装後に呼び出し
      message.info('請求書生成機能は今後実装予定です')
      console.log('Selected collectors:', selectedRowKeys)
    } catch (err) {
      console.error('[UI] Generate error:', err)
      message.error('請求書生成エラー')
    } finally {
      setGenerating(false)
    }
  }

  const columns: ColumnsType<BillingSummary> = [
    {
      title: '収集業者',
      dataIndex: ['collectors', 'company_name'],
      key: 'company_name',
    },
    {
      title: '連絡先',
      key: 'contact',
      render: (_, record) => (
        <div>
          {record.collectors.email && <div>{record.collectors.email}</div>}
          {record.collectors.phone && <div>{record.collectors.phone}</div>}
        </div>
      ),
    },
    {
      title: '固定月額',
      dataIndex: 'fixed_monthly_fee',
      key: 'fixed_monthly_fee',
      align: 'right',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: '実績数量額',
      dataIndex: 'actual_qty_amount',
      key: 'actual_qty_amount',
      align: 'right',
      render: (val: number) => `¥${val.toLocaleString()}`,
    },
    {
      title: 'その他',
      dataIndex: 'other_charges',
      key: 'other_charges',
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
      dataIndex: 'item_count',
      key: 'item_count',
      align: 'center',
    },
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys as string[])
    },
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>請求書作成 - {month}</Title>
          <a onClick={() => router.back()} style={{ cursor: 'pointer' }}>
            ← 詳細に戻る
          </a>
        </div>

        {error && <Alert type="error" message={error} showIcon />}

        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>
                請求書を作成する収集業者を選択してください（選択: {selectedRowKeys.length}件）
              </Text>
              <Space>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={handleGenerateInvoices}
                  disabled={selectedRowKeys.length === 0 || generating}
                  loading={generating}
                >
                  請求書を生成
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={selectedRowKeys.length === 0}
                >
                  PDFダウンロード
                </Button>
              </Space>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Spin size="large" />
                <div style={{ marginTop: '16px' }}>読み込み中...</div>
              </div>
            ) : (
              <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={data}
                rowKey="id"
                pagination={false}
              />
            )}
          </Space>
        </Card>

        <Alert
          type="info"
          message="請求書生成について"
          description={
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>選択した収集業者の請求書をPDF形式で生成します</li>
              <li>請求書には固定月額、実績数量額、その他費用の内訳が記載されます</li>
              <li>生成後、メール送信または手動ダウンロードが可能です</li>
            </ul>
          }
          showIcon
        />
      </Space>
    </div>
  )
}



'use client'

/**
 * 収集報告画面
 * デスクトップ版CollectionReportから移植
 * 既存collectionsテーブルの閲覧・レポート出力（影響範囲: LOW）
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  DatePicker,
  Select,
  Row,
  Col,
  Space,
  Typography,
  Tag,
  message,
  Statistic,
} from 'antd'
import {
  ReloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PrinterOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

interface CollectionReport {
  id: string
  collection_request_id: string
  actual_qty: number
  actual_unit: string
  collected_at: string
  vehicle_no?: string
  driver_name?: string
  status: string
  stores?: { name: string }
}

export default function CollectionReportPage() {
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<CollectionReport[]>([])
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dateRange[0]) params.append('from_date', dateRange[0].toISOString())
      if (dateRange[1]) params.append('to_date', dateRange[1].toISOString())
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/collections?${params.toString()}`)
      if (!response.ok) throw new Error('データ取得失敗')
      const data = await response.json()
      setReports(data.data || [])
    } catch (error) {
      console.error('[CollectionReport] Error:', error)
      message.error('データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateRange, statusFilter])

  // Excel出力
  const handleExportExcel = async () => {
    try {
      setLoading(true)
      message.info('Excel出力機能は未実装です')
      // TODO: Excel出力API実装
    } catch (error) {
      console.error('[ExportExcel] Error:', error)
      message.error('Excel出力に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // PDF出力
  const handleExportPdf = async () => {
    try {
      setLoading(true)
      message.info('PDF出力機能は未実装です')
      // TODO: PDF出力API実装
    } catch (error) {
      console.error('[ExportPDF] Error:', error)
      message.error('PDF出力に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 印刷
  const handlePrint = () => {
    window.print()
  }

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      COMPLETED: { color: 'green', text: '完了' },
      PENDING: { color: 'orange', text: '処理中' },
      CONFIRMED: { color: 'blue', text: '確認済' },
    }
    const c = config[status] || { color: 'default', text: status }
    return <Tag color={c.color}>{c.text}</Tag>
  }

  // 集計
  const totalQty = reports.reduce((sum, r) => sum + (parseFloat(r.actual_qty as any) || 0), 0)
  const completedCount = reports.filter((r) => r.status === 'COMPLETED').length

  const columns = [
    {
      title: '回収日時',
      dataIndex: 'collected_at',
      key: 'collected_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: CollectionReport, b: CollectionReport) =>
        dayjs(a.collected_at).unix() - dayjs(b.collected_at).unix(),
    },
    {
      title: '店舗',
      dataIndex: ['stores', 'name'],
      key: 'store',
      render: (name: string) => name || '-',
    },
    {
      title: '回収量',
      dataIndex: 'actual_qty',
      key: 'actual_qty',
      render: (qty: number, record: CollectionReport) => `${qty} ${record.actual_unit}`,
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
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
  ]

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>収集報告</Title>
        <Text type="secondary">収集実績の確認とレポート出力</Text>
      </div>

      {/* サマリー */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="総収集件数" value={reports.length} suffix="件" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="完了件数" value={completedCount} suffix="件" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="総収集量"
              value={totalQty.toFixed(2)}
              suffix="トン"
            />
          </Card>
        </Col>
      </Row>

      {/* フィルター */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={10}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>対象期間</Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) =>
                  setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])
                }
                style={{ width: '100%' }}
              />
            </Space>
          </Col>
          <Col span={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>ステータス</Text>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
              >
                <Option value="all">全て</Option>
                <Option value="COMPLETED">完了</Option>
                <Option value="PENDING">処理中</Option>
                <Option value="CONFIRMED">確認済</Option>
              </Select>
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>&nbsp;</Text>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={fetchData}>
                  更新
                </Button>
                <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
                  Excel
                </Button>
                <Button icon={<FilePdfOutlined />} onClick={handleExportPdf}>
                  PDF
                </Button>
                <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                  印刷
                </Button>
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>
    </div>
  )
}








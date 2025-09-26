// ============================================================================
// レポートページ
// 作成日: 2025-09-16
// 目的: レポート表示とCSV出力
// ============================================================================

import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  DatePicker,
  Select,
  Table,
  message,
} from 'antd'
import {
  DownloadOutlined,
  FileTextOutlined,
  ReloadOutlined,
  BarChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons'

const { Title } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

interface ReportData {
  store_code: string
  store_name: string
  area_or_city: string
  pickup_date: string
  planned_qty: number
  actual_qty: number
  unit: string
  status: string
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<[any, any] | null>(null)
  const [selectedStore, setSelectedStore] = useState<string | undefined>()

  // データ取得
  const fetchReportData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // モックレポートデータ
      const mockData: ReportData[] = [
        {
          store_code: '001',
          store_name: '本店',
          area_or_city: '渋谷区',
          pickup_date: '2025-09-20',
          planned_qty: 2.5,
          actual_qty: 2.3,
          unit: 'T',
          status: '完了',
        },
        {
          store_code: '002',
          store_name: '支店A',
          area_or_city: '新宿区',
          pickup_date: '2025-09-21',
          planned_qty: 50,
          actual_qty: 45,
          unit: 'KG',
          status: '完了',
        },
        {
          store_code: '003',
          store_name: '支店B',
          area_or_city: '港区',
          pickup_date: '2025-09-22',
          planned_qty: 1.2,
          actual_qty: 0,
          unit: 'T',
          status: '未実績',
        },
      ]
      
      // 日付フィルター適用
      let filteredData = mockData
      if (dateRange && dateRange[0] && dateRange[1]) {
        const startDate = dateRange[0].format('YYYY-MM-DD')
        const endDate = dateRange[1].format('YYYY-MM-DD')
        filteredData = mockData.filter(item => 
          item.pickup_date >= startDate && item.pickup_date <= endDate
        )
      }
      
      // 店舗フィルター適用
      if (selectedStore) {
        filteredData = filteredData.filter(item => item.store_code === selectedStore)
      }
      
      setReportData(filteredData)
    } catch (err) {
      console.error('Failed to fetch report data:', err)
      setError('レポートデータの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReportData()
  }, [dateRange, selectedStore])

  // CSV出力
  const handleCsvExport = async () => {
    try {
      // モック実装
      message.success('CSVファイルを出力しました')
    } catch (err) {
      console.error('Failed to export CSV:', err)
      message.error('CSVファイルの出力に失敗しました')
    }
  }

  // テーブル列定義
  const columns = [
    {
      title: '店舗コード',
      dataIndex: 'store_code',
      key: 'store_code',
    },
    {
      title: '店舗名',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: 'エリア',
      dataIndex: 'area_or_city',
      key: 'area_or_city',
    },
    {
      title: '回収日',
      dataIndex: 'pickup_date',
      key: 'pickup_date',
    },
    {
      title: '予定数量',
      dataIndex: 'planned_qty',
      key: 'planned_qty',
      render: (qty: number, record: ReportData) => `${qty} ${record.unit}`,
    },
    {
      title: '実績数量',
      dataIndex: 'actual_qty',
      key: 'actual_qty',
      render: (qty: number, record: ReportData) => `${qty} ${record.unit}`,
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
    },
  ]

  // 統計計算
  const totalPlanned = reportData.reduce((sum, item) => sum + item.planned_qty, 0)
  const totalActual = reportData.reduce((sum, item) => sum + item.actual_qty, 0)
  const completionRate = totalPlanned > 0 ? (totalActual / totalPlanned * 100).toFixed(1) : 0

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          レポート
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchReportData}>
            更新
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleCsvExport}>
            CSV出力
          </Button>
        </Space>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <label className="form-label">期間</label>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <label className="form-label">店舗</label>
            <Select
              placeholder="店舗を選択"
              value={selectedStore}
              onChange={setSelectedStore}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="001">本店</Option>
              <Option value="002">支店A</Option>
              <Option value="003">支店B</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Button icon={<BarChartOutlined />}>
                グラフ表示
              </Button>
              <Button icon={<PieChartOutlined />}>
                円グラフ
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="総予定数量"
              value={totalPlanned}
              suffix="T"
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="総実績数量"
              value={totalActual}
              suffix="T"
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="完了率"
              value={completionRate}
              suffix="%"
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="レコード数"
              value={reportData.length}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* レポートテーブル */}
      <Card title="店舗別実績レポート">
        {loading ? (
          <div className="center" style={{ height: '200px' }}>
            <Spin size="large" />
            <span className="ml-2">データを読み込み中...</span>
          </div>
        ) : error ? (
          <Alert
            message="エラー"
            description={error}
            type="error"
            showIcon
          />
        ) : (
          <Table
            columns={columns}
            dataSource={reportData}
            rowKey="store_code"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} / ${total}件`,
            }}
          />
        )}
      </Card>
    </div>
  )
}

export default Reports




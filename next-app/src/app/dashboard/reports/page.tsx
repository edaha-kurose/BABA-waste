'use client'

import React, { useState } from 'react'
import {
  Card,
  Form,
  DatePicker,
  Select,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Alert,
} from 'antd'
import {
  FileTextOutlined,
  DownloadOutlined,
  BarChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'
import dayjs, { Dayjs } from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

interface ReportData {
  date: string
  store: string
  item: string
  quantity: number
  unit: string
  status: string
  manifest_no?: string
}

export default function ReportsPage() {
  const { userOrg } = useUser()
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [form] = Form.useForm()

  // レポート生成
  const handleGenerate = async (values: any) => {
    try {
      setLoading(true)
      
      // モックデータ
      const mockData: ReportData[] = [
        {
          date: '2025-10-16',
          store: '本店',
          item: '混合廃棄物',
          quantity: 2.5,
          unit: 'T',
          status: '完了',
          manifest_no: 'MF-2025-10-001',
        },
        {
          date: '2025-10-17',
          store: '支店A',
          item: '蛍光灯',
          quantity: 1.2,
          unit: 'T',
          status: '完了',
          manifest_no: 'MF-2025-10-002',
        },
        {
          date: '2025-10-18',
          store: '支店B',
          item: '産業廃棄物',
          quantity: 3.0,
          unit: 'T',
          status: '進行中',
        },
        {
          date: '2025-10-19',
          store: '本店',
          item: '廃プラスチック',
          quantity: 1.8,
          unit: 'T',
          status: '完了',
          manifest_no: 'MF-2025-10-004',
        },
      ]
      
      setReportData(mockData)
    } catch (err) {
      console.error('Failed to generate report:', err)
    } finally {
      setLoading(false)
    }
  }

  // エクスポート
  const handleExport = (format: 'excel' | 'pdf') => {
    alert(`${format.toUpperCase()}形式でエクスポートします`)
  }

  // 統計計算
  const stats = {
    totalCount: reportData.length,
    totalQuantity: reportData.reduce((sum, item) => sum + item.quantity, 0),
    completedCount: reportData.filter((item) => item.status === '完了').length,
    inProgressCount: reportData.filter((item) => item.status === '進行中').length,
  }

  // テーブル列定義
  const columns = [
    {
      title: '日付',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '店舗',
      dataIndex: 'store',
      key: 'store',
      width: 150,
    },
    {
      title: '品目',
      dataIndex: 'item',
      key: 'item',
      width: 200,
    },
    {
      title: '数量',
      key: 'quantity',
      width: 120,
      render: (_: any, record: ReportData) => `${record.quantity} ${record.unit}`,
    },
    {
      title: 'マニフェスト番号',
      dataIndex: 'manifest_no',
      key: 'manifest_no',
      width: 180,
      render: (no: string) => no || <Text type="secondary">未発行</Text>,
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === '完了' ? 'green' : 'orange'}>{status}</Tag>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Title level={2}>
            <BarChartOutlined /> レポート
          </Title>
        }
      >
        <Alert
          message="レポート生成"
          description="期間や条件を指定して、廃棄物処理のレポートを生成します。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 検索フォーム */}
        <Card title="検索条件" style={{ marginBottom: 24 }}>
          <Form form={form} layout="vertical" onFinish={handleGenerate}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="期間"
                  name="dateRange"
                  rules={[{ required: true, message: '期間を選択してください' }]}
                >
                  <RangePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="店舗" name="store">
                  <Select placeholder="すべて">
                    <Option value="">すべて</Option>
                    <Option value="store-1">本店</Option>
                    <Option value="store-2">支店A</Option>
                    <Option value="store-3">支店B</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="ステータス" name="status">
                  <Select placeholder="すべて">
                    <Option value="">すべて</Option>
                    <Option value="completed">完了</Option>
                    <Option value="in-progress">進行中</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Space>
              <Button type="primary" htmlType="submit" icon={<ReloadOutlined />} loading={loading}>
                レポート生成
              </Button>
              <Button onClick={() => form.resetFields()}>クリア</Button>
            </Space>
          </Form>
        </Card>

        {/* 統計情報 */}
        {reportData.length > 0 && (
          <>
            <Card title="集計結果" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="総件数" value={stats.totalCount} suffix="件" />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="総数量"
                    value={stats.totalQuantity.toFixed(2)}
                    suffix="T"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="完了"
                    value={stats.completedCount}
                    suffix="件"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="進行中"
                    value={stats.inProgressCount}
                    suffix="件"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>
            </Card>

            {/* データテーブル */}
            <Card
              title="レポートデータ"
              extra={
                <Space>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('excel')}
                  >
                    Excel出力
                  </Button>
                  <Button
                    icon={<FileTextOutlined />}
                    onClick={() => handleExport('pdf')}
                  >
                    PDF出力
                  </Button>
                </Space>
              }
            >
              <Table
                columns={columns}
                dataSource={reportData}
                rowKey={(record, index) => `${record.date}-${index}`}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `全${total}件`,
                }}
              />
            </Card>
          </>
        )}
      </Card>
    </div>
  )
}

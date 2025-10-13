'use client'

import { Row, Col, Card, Statistic, Table, Tag } from 'antd'
import {
  ShopOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons'

export default function DashboardPage() {
  // サンプルデータ
  const recentCollections = [
    {
      key: '1',
      date: '2025-10-13',
      store: '店舗A',
      item: '一般廃棄物',
      quantity: '150 KG',
      status: 'COMPLETED',
    },
    {
      key: '2',
      date: '2025-10-12',
      store: '店舗B',
      item: '産業廃棄物',
      quantity: '200 KG',
      status: 'COMPLETED',
    },
    {
      key: '3',
      date: '2025-10-11',
      store: '店舗C',
      item: '資源ごみ',
      quantity: '80 KG',
      status: 'PENDING',
    },
  ]

  const columns = [
    {
      title: '日付',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '店舗',
      dataIndex: 'store',
      key: 'store',
    },
    {
      title: '品目',
      dataIndex: 'item',
      key: 'item',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'COMPLETED' ? 'green' : 'orange'}>
          {status === 'COMPLETED' ? '完了' : '処理中'}
        </Tag>
      ),
    },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>ダッシュボード</h1>

      {/* 統計カード */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="登録店舗数"
              value={28}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今月の収集予定"
              value={45}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今月の収集実績"
              value={38}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未処理の依頼"
              value={7}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 最近の収集実績 */}
      <Card title="最近の収集実績" style={{ marginBottom: 24 }}>
        <Table
          columns={columns}
          dataSource={recentCollections}
          pagination={false}
        />
      </Card>

      {/* お知らせ */}
      <Card title="お知らせ">
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
            <strong>2025-10-13</strong>: システムメンテナンスのお知らせ
          </li>
          <li style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
            <strong>2025-10-10</strong>: 新機能リリース - 収集予定の一括登録が可能になりました
          </li>
          <li>
            <strong>2025-10-05</strong>: 10月の収集スケジュールを更新しました
          </li>
        </ul>
      </Card>
    </div>
  )
}

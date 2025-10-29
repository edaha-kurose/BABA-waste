'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  Tag,
  Space,
  Card,
  Statistic,
  Row,
  Col,
  DatePicker,
  Select,
  Button,
  message,
  Tooltip,
  Typography,
} from 'antd'
import {
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  LinkOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import { useUser } from '@/lib/auth/session'

const { RangePicker } = DatePicker
const { Text } = Typography

interface EmailLog {
  id: string
  to_email: string
  subject: string
  status: 'SUCCESS' | 'FAILED'
  resend_id: string | null
  resend_status: string | null
  opened_at: string | null
  clicked_at: string | null
  sent_at: string
  error_message: string | null
}

interface Stats {
  total: number
  success: number
  failed: number
  opened: number
  clicked: number
}

export default function EmailLogsPage() {
  const { user } = useUser()
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ])
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [dateRange, statusFilter])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange) {
        params.set('start_date', dateRange[0].format('YYYY-MM-DD'))
        params.set('end_date', dateRange[1].format('YYYY-MM-DD'))
      }
      if (statusFilter) {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/email/logs?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }
      const data = await response.json()
      setLogs(data.data)
    } catch (error) {
      console.error('Error fetching logs:', error)
      message.error('メール送信履歴の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams()
      if (dateRange) {
        params.set('start_date', dateRange[0].format('YYYY-MM-DD'))
        params.set('end_date', dateRange[1].format('YYYY-MM-DD'))
      }

      const response = await fetch(`/api/email/stats?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      const data = await response.json()
      setStats(data.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const columns: ColumnsType<EmailLog> = [
    {
      title: '送信日時',
      dataIndex: 'sent_at',
      key: 'sent_at',
      render: (text: string) => dayjs(text).format('YYYY/MM/DD HH:mm'),
      sorter: (a, b) => dayjs(a.sent_at).unix() - dayjs(b.sent_at).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: '宛先',
      dataIndex: 'to_email',
      key: 'to_email',
    },
    {
      title: '件名',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: '送信ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = {
          SUCCESS: { color: 'success', icon: <CheckCircleOutlined />, text: '成功' },
          FAILED: { color: 'error', icon: <CloseCircleOutlined />, text: '失敗' },
        }[status] || { color: 'default', icon: null, text: status }
        
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      },
      filters: [
        { text: '成功', value: 'SUCCESS' },
        { text: '失敗', value: 'FAILED' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '配信ステータス',
      dataIndex: 'resend_status',
      key: 'resend_status',
      render: (status: string | null) => {
        if (!status) return <Tag>未確認</Tag>
        
        const config = {
          queued: { color: 'processing', text: 'キュー中' },
          sent: { color: 'blue', text: '送信済み' },
          delivered: { color: 'success', text: '配信完了' },
          bounced: { color: 'error', text: 'バウンス' },
          complained: { color: 'warning', text: 'スパム報告' },
        }[status] || { color: 'default', text: status }
        
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: 'アクション',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.opened_at && (
            <Tooltip title={`開封: ${dayjs(record.opened_at).format('YYYY/MM/DD HH:mm')}`}>
              <EyeOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
          {record.clicked_at && (
            <Tooltip title={`クリック: ${dayjs(record.clicked_at).format('YYYY/MM/DD HH:mm')}`}>
              <LinkOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>
        <MailOutlined /> メール送信履歴
      </h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        メール送信の履歴と配信ステータスを確認できます
      </p>

      {/* 統計カード */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="総送信数"
                value={stats.total}
                prefix={<MailOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="送信成功"
                value={stats.success}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="開封率"
                value={stats.total > 0 ? ((stats.opened / stats.total) * 100).toFixed(1) : '0.0'}
                suffix="%"
                prefix={<EyeOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="クリック率"
                value={stats.total > 0 ? ((stats.clicked / stats.total) * 100).toFixed(1) : '0.0'}
                suffix="%"
                prefix={<LinkOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* フィルター */}
      <Card style={{ marginBottom: 24 }}>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs])}
            format="YYYY/MM/DD"
          />
          <Select
            style={{ width: 150 }}
            placeholder="ステータス"
            allowClear
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: '成功', value: 'SUCCESS' },
              { label: '失敗', value: 'FAILED' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchLogs}>
            再読み込み
          </Button>
        </Space>
      </Card>

      {/* テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件`,
          }}
        />
      </Card>
    </div>
  )
}




'use client'

/**
 * 取り込み履歴画面
 * 既存APIを活用した閲覧専用画面（影響範囲: LOW）
 */

import { useState, useEffect } from 'react'
import { Card, Table, Tag, Typography, Space, Button, DatePicker } from 'antd'
import { ReloadOutlined, FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

interface ImportHistory {
  id: string
  import_type: string
  file_name: string
  total_records: number
  success_count: number
  error_count: number
  status: string
  imported_by: string
  imported_at: string
  notes?: string
}

export default function ImportHistoryPage() {
  const [loading, setLoading] = useState(false)
  const [histories, setHistories] = useState<ImportHistory[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)
      // TODO: 実際のAPI実装時に置き換え
      // const response = await fetch('/api/import-history')
      // const data = await response.json()
      // setHistories(data.data || [])
      
      // 仮データ
      setHistories([])
    } catch (error) {
      console.error('[ImportHistory] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      SUCCESS: { color: 'green', text: '成功' },
      PARTIAL: { color: 'orange', text: '一部エラー' },
      FAILED: { color: 'red', text: '失敗' },
      PROCESSING: { color: 'blue', text: '処理中' },
    }
    const c = config[status] || { color: 'default', text: status }
    return <Tag color={c.color}>{c.text}</Tag>
  }

  const columns = [
    {
      title: '取り込み日時',
      dataIndex: 'imported_at',
      key: 'imported_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '種別',
      dataIndex: 'import_type',
      key: 'import_type',
    },
    {
      title: 'ファイル名',
      dataIndex: 'file_name',
      key: 'file_name',
    },
    {
      title: '総件数',
      dataIndex: 'total_records',
      key: 'total_records',
    },
    {
      title: '成功',
      dataIndex: 'success_count',
      key: 'success_count',
      render: (count: number) => <Text type="success">{count}</Text>,
    },
    {
      title: 'エラー',
      dataIndex: 'error_count',
      key: 'error_count',
      render: (count: number) => (count > 0 ? <Text type="danger">{count}</Text> : count),
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
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>取り込み履歴</Title>
        <Text type="secondary">Excel/CSVファイルの取り込み履歴を確認できます</Text>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <RangePicker />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            更新
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={histories}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          locale={{ emptyText: '取り込み履歴がありません' }}
        />
      </Card>
    </div>
  )
}











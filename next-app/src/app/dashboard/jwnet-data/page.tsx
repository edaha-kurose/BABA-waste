'use client'

/**
 * JWNETデータ画面
 * デスクトップ版JwnetRegistrationDataから移植
 * 既存registrationsテーブルの詳細閲覧（影響範囲: LOW）
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  message,
  Modal,
  Descriptions,
} from 'antd'
import {
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Search } = Input

interface JwnetData {
  id: string
  manifest_no?: string
  collection_id: string
  status: string
  jwnet_status?: string
  response_data?: any
  error_message?: string
  created_at: string
  sent_at?: string
}

export default function JwnetDataPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<JwnetData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<JwnetData | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      // TODO: API実装
      // const response = await fetch(`/api/registrations?search=${searchQuery}`)
      // const resData = await response.json()
      // setData(resData.data || [])
      setData([])
    } catch (error) {
      console.error('[JwnetData] Error:', error)
      message.error('データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 検索
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    fetchData()
  }

  // 詳細表示
  const handleViewDetail = (record: JwnetData) => {
    setSelectedRecord(record)
    setIsDetailModalVisible(true)
  }

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'orange', text: '未送信' },
      SENT: { color: 'blue', text: '送信済' },
      SUCCESS: { color: 'green', text: '成功' },
      FAILED: { color: 'red', text: '失敗' },
    }
    const c = config[status] || { color: 'default', text: status }
    return <Tag color={c.color}>{c.text}</Tag>
  }

  const columns = [
    {
      title: 'マニフェスト番号',
      dataIndex: 'manifest_no',
      key: 'manifest_no',
      render: (no: string) => no || '-',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'JWNETステータス',
      dataIndex: 'jwnet_status',
      key: 'jwnet_status',
      render: (status: string) => status || '-',
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '送信日時',
      dataIndex: 'sent_at',
      key: 'sent_at',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: 'エラー',
      dataIndex: 'error_message',
      key: 'error_message',
      render: (msg: string) => (msg ? <Text type="danger">{msg.substring(0, 50)}...</Text> : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: JwnetData) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          詳細
        </Button>
      ),
    },
  ]

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>JWNETデータ</Title>
        <Text type="secondary">
          <FileTextOutlined /> JWNET送信データの詳細確認
        </Text>
      </div>

      {/* 検索 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Search
            placeholder="マニフェスト番号で検索"
            onSearch={handleSearch}
            style={{ width: 300 }}
            enterButton
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            更新
          </Button>
        </Space>
      </Card>

      {/* テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{ emptyText: 'JWNETデータがありません' }}
        />
      </Card>

      {/* 詳細モーダル */}
      <Modal
        title="JWNETデータ詳細"
        open={isDetailModalVisible}
        onCancel={() => {
          setIsDetailModalVisible(false)
          setSelectedRecord(null)
        }}
        footer={null}
        width={800}
      >
        {selectedRecord && (
          <div>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="マニフェスト番号">
                {selectedRecord.manifest_no || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="ステータス">
                {getStatusTag(selectedRecord.status)}
              </Descriptions.Item>
              <Descriptions.Item label="JWNETステータス">
                {selectedRecord.jwnet_status || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="作成日時">
                {dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="送信日時">
                {selectedRecord.sent_at
                  ? dayjs(selectedRecord.sent_at).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="エラーメッセージ">
                {selectedRecord.error_message ? (
                  <Text type="danger">{selectedRecord.error_message}</Text>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
            </Descriptions>

            {selectedRecord.response_data && (
              <div style={{ marginTop: 16 }}>
                <Text strong>レスポンスデータ:</Text>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    overflow: 'auto',
                    maxHeight: 300,
                  }}
                >
                  {JSON.stringify(selectedRecord.response_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}











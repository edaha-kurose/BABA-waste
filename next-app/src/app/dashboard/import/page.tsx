'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Descriptions,
  Alert,
  Timeline,
  Statistic,
  Row,
  Col,
} from 'antd'
import {
  HistoryOutlined,
  EyeOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'

const { Title, Text } = Typography

interface ImportHistory {
  id: string
  import_type: string
  file_name: string
  import_status: string
  total_records: number
  success_records: number
  error_records: number
  duplicate_records: number
  new_stores_created: number
  new_collectors_created: number
  started_at: string
  completed_at?: string
  error_message?: string
  warnings?: any[]
  errors?: any[]
  created_by?: string
}

export default function ImportHistoryPage() {
  const { userOrg } = useUser()
  const [histories, setHistories] = useState<ImportHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<ImportHistory | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)

  // データ取得
  const fetchHistories = async () => {
    if (!userOrg?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // モックデータ（実際のAPIは後で実装）
      const mockData: ImportHistory[] = [
        {
          id: '1',
          import_type: 'excel',
          file_name: '廃棄依頼_2025-10.xlsx',
          import_status: 'success',
          total_records: 120,
          success_records: 120,
          error_records: 0,
          duplicate_records: 0,
          new_stores_created: 3,
          new_collectors_created: 0,
          started_at: '2025-10-16T10:30:00Z',
          completed_at: '2025-10-16T10:30:15Z',
        },
        {
          id: '2',
          import_type: 'excel',
          file_name: '廃棄依頼_2025-09.xlsx',
          import_status: 'partial_success',
          total_records: 150,
          success_records: 145,
          error_records: 5,
          duplicate_records: 2,
          new_stores_created: 1,
          new_collectors_created: 0,
          started_at: '2025-09-20T14:15:00Z',
          completed_at: '2025-09-20T14:15:20Z',
          warnings: [
            { type: 'duplicate', message: '重複データが2件ありました', row: 10 },
            { type: 'duplicate', message: '重複データが2件ありました', row: 25 },
          ],
          errors: [
            { type: 'validation_error', message: '店舗コードが不正です', row: 50 },
            { type: 'validation_error', message: '数量が範囲外です', row: 75 },
          ],
        },
        {
          id: '3',
          import_type: 'excel',
          file_name: '廃棄依頼_2025-08.xlsx',
          import_status: 'failed',
          total_records: 100,
          success_records: 0,
          error_records: 100,
          duplicate_records: 0,
          new_stores_created: 0,
          new_collectors_created: 0,
          started_at: '2025-08-15T09:00:00Z',
          completed_at: '2025-08-15T09:00:05Z',
          error_message: 'ファイル形式が不正です',
        },
      ]
      setHistories(mockData)
    } catch (err) {
      console.error('Failed to fetch histories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userOrg?.id) {
      fetchHistories()
    }
  }, [userOrg?.id])

  // ステータス表示
  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      success: { color: 'green', icon: <CheckCircleOutlined />, text: '成功' },
      partial_success: {
        color: 'orange',
        icon: <ExclamationCircleOutlined />,
        text: '部分成功',
      },
      failed: { color: 'red', icon: <CloseCircleOutlined />, text: '失敗' },
    }
    const config = statusConfig[status] || { color: 'gray', icon: null, text: status }
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  // 詳細表示
  const showDetail = (history: ImportHistory) => {
    setSelectedHistory(history)
    setDetailModalVisible(true)
  }

  // テーブル列定義
  const columns = [
    {
      title: '取り込み日時',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('ja-JP'),
      sorter: (a: ImportHistory, b: ImportHistory) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    },
    {
      title: 'タイプ',
      dataIndex: 'import_type',
      key: 'import_type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'excel' ? 'blue' : 'green'}>
          {type === 'excel' ? 'Excel' : 'CSV'}
        </Tag>
      ),
    },
    {
      title: 'ファイル名',
      dataIndex: 'file_name',
      key: 'file_name',
      width: 250,
      ellipsis: true,
    },
    {
      title: 'ステータス',
      dataIndex: 'import_status',
      key: 'import_status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'レコード数',
      key: 'records',
      width: 150,
      render: (_: any, record: ImportHistory) => (
        <Space direction="vertical" size={0}>
          <Text>総数: {record.total_records}</Text>
          <Text type="success">成功: {record.success_records}</Text>
          {record.error_records > 0 && <Text type="danger">エラー: {record.error_records}</Text>}
        </Space>
      ),
    },
    {
      title: '変更内容',
      key: 'changes',
      width: 150,
      render: (_: any, record: ImportHistory) => (
        <Space direction="vertical" size={0}>
          {record.new_stores_created > 0 && (
            <Text>新規店舗: {record.new_stores_created}</Text>
          )}
          {record.duplicate_records > 0 && (
            <Text type="warning">重複: {record.duplicate_records}</Text>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: ImportHistory) => (
        <Button icon={<EyeOutlined />} onClick={() => showDetail(record)} size="small">
          詳細
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Title level={2}>
            <HistoryOutlined /> 取り込み履歴
          </Title>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchHistories} loading={loading}>
            更新
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={histories}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
          }}
        />
      </Card>

      {/* 詳細モーダル */}
      <Modal
        title="取り込み履歴詳細"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedHistory(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false)
              setSelectedHistory(null)
            }}
          >
            閉じる
          </Button>,
        ]}
        width={800}
      >
        {selectedHistory && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 基本情報 */}
            <Descriptions title="基本情報" bordered column={2}>
              <Descriptions.Item label="ファイル名" span={2}>
                {selectedHistory.file_name}
              </Descriptions.Item>
              <Descriptions.Item label="取り込みタイプ">
                <Tag color={selectedHistory.import_type === 'excel' ? 'blue' : 'green'}>
                  {selectedHistory.import_type === 'excel' ? 'Excel' : 'CSV'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="ステータス">
                {getStatusTag(selectedHistory.import_status)}
              </Descriptions.Item>
              <Descriptions.Item label="開始日時">
                {new Date(selectedHistory.started_at).toLocaleString('ja-JP')}
              </Descriptions.Item>
              <Descriptions.Item label="完了日時">
                {selectedHistory.completed_at
                  ? new Date(selectedHistory.completed_at).toLocaleString('ja-JP')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* 統計情報 */}
            <Card title="統計情報">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="総レコード数"
                    value={selectedHistory.total_records}
                    prefix={<HistoryOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="成功"
                    value={selectedHistory.success_records}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="エラー"
                    value={selectedHistory.error_records}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<CloseCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="重複"
                    value={selectedHistory.duplicate_records}
                    valueStyle={{ color: '#faad14' }}
                    prefix={<WarningOutlined />}
                  />
                </Col>
              </Row>
            </Card>

            {/* 変更内容 */}
            {(selectedHistory.new_stores_created > 0 ||
              selectedHistory.new_collectors_created > 0) && (
              <Alert
                message="新規作成"
                description={
                  <Space direction="vertical">
                    {selectedHistory.new_stores_created > 0 && (
                      <Text>新規店舗: {selectedHistory.new_stores_created}件</Text>
                    )}
                    {selectedHistory.new_collectors_created > 0 && (
                      <Text>新規収集業者: {selectedHistory.new_collectors_created}件</Text>
                    )}
                  </Space>
                }
                type="info"
                showIcon
              />
            )}

            {/* 警告 */}
            {selectedHistory.warnings && selectedHistory.warnings.length > 0 && (
              <Card title="警告" size="small">
                <Timeline
                  items={selectedHistory.warnings.map((warning, idx) => ({
                    key: idx,
                    color: 'orange',
                    children: (
                      <Space direction="vertical" size={0}>
                        <Text strong>{warning.type}</Text>
                        <Text>{warning.message}</Text>
                        {warning.row && <Text type="secondary">行: {warning.row}</Text>}
                      </Space>
                    ),
                  }))}
                />
              </Card>
            )}

            {/* エラー */}
            {selectedHistory.errors && selectedHistory.errors.length > 0 && (
              <Card title="エラー" size="small">
                <Timeline
                  items={selectedHistory.errors.map((error, idx) => ({
                    key: idx,
                    color: 'red',
                    children: (
                      <Space direction="vertical" size={0}>
                        <Text strong type="danger">
                          {error.type}
                        </Text>
                        <Text>{error.message}</Text>
                        {error.row && <Text type="secondary">行: {error.row}</Text>}
                      </Space>
                    ),
                  }))}
                />
              </Card>
            )}

            {/* エラーメッセージ */}
            {selectedHistory.error_message && (
              <Alert message="エラー" description={selectedHistory.error_message} type="error" showIcon />
            )}
          </Space>
        )}
      </Modal>
    </div>
  )
}

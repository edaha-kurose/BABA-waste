import React, { useState, useEffect } from 'react'
import { 
  Card, Table, Button, Space, Typography, Tag, Badge, 
  Modal, Descriptions, Alert, Row, Col, Statistic, 
  Timeline, Tooltip, Divider
} from 'antd'
import { 
  HistoryOutlined, EyeOutlined, ReloadOutlined, 
  CheckCircleOutlined, ExclamationCircleOutlined, 
  CloseCircleOutlined, WarningOutlined, InfoCircleOutlined
} from '@ant-design/icons'
import { ImportHistoryManager } from '@/utils/import-history-manager'
import type { ImportHistory } from '@contracts/v0/schema'

const { Title, Text } = Typography

const ImportHistoryPage: React.FC = () => {
  const [histories, setHistories] = useState<ImportHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<ImportHistory | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const historyManager = new ImportHistoryManager()

  // データ取得
  const fetchHistories = async () => {
    try {
      setLoading(true)
      const data = await historyManager.getImportHistories()
      setHistories(data)
    } catch (error) {
      console.error('履歴取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistories()
  }, [])

  // ステータス表示
  const getStatusTag = (status: string) => {
    const statusConfig = {
      success: { color: 'green', icon: <CheckCircleOutlined />, text: '成功' },
      partial_success: { color: 'orange', icon: <ExclamationCircleOutlined />, text: '部分成功' },
      failed: { color: 'red', icon: <CloseCircleOutlined />, text: '失敗' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'gray', icon: null, text: status }
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  // 警告タイプ表示
  const getWarningTag = (type: string) => {
    const typeConfig = {
      duplicate: { color: 'orange', text: '重複' },
      missing_data: { color: 'red', text: 'データ不足' },
      validation_error: { color: 'red', text: 'バリデーション' },
      store_change: { color: 'blue', text: '店舗変更' },
      collector_change: { color: 'purple', text: '収集業者変更' }
    }
    const config = typeConfig[type as keyof typeof typeConfig] || { color: 'gray', text: type }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // エラータイプ表示
  const getErrorTag = (type: string) => {
    const typeConfig = {
      validation_error: { color: 'red', text: 'バリデーション' },
      database_error: { color: 'red', text: 'データベース' },
      file_error: { color: 'red', text: 'ファイル' }
    }
    const config = typeConfig[type as keyof typeof typeConfig] || { color: 'gray', text: type }
    return <Tag color={config.color}>{config.text}</Tag>
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
      width: 200,
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
      width: 120,
      render: (_, record: ImportHistory) => (
        <Space direction="vertical" size={0}>
          <Text>総数: {record.total_records}</Text>
          <Text type="success">成功: {record.success_records}</Text>
          <Text type="danger">エラー: {record.error_records}</Text>
        </Space>
      ),
    },
    {
      title: '変更内容',
      key: 'changes',
      width: 150,
      render: (_, record: ImportHistory) => (
        <Space direction="vertical" size={0}>
          {record.new_stores_created > 0 && (
            <Text type="info">新規店舗: {record.new_stores_created}</Text>
          )}
          {record.new_collectors_created > 0 && (
            <Text type="info">新規収集業者: {record.new_collectors_created}</Text>
          )}
          {record.duplicate_records > 0 && (
            <Text type="warning">重複: {record.duplicate_records}</Text>
          )}
        </Space>
      ),
    },
    {
      title: '警告・エラー',
      key: 'warnings_errors',
      width: 120,
      render: (_, record: ImportHistory) => (
        <Space direction="vertical" size={0}>
          {record.warnings.length > 0 && (
            <Badge count={record.warnings.length} color="orange">
              <Text type="warning">警告</Text>
            </Badge>
          )}
          {record.errors.length > 0 && (
            <Badge count={record.errors.length} color="red">
              <Text type="danger">エラー</Text>
            </Badge>
          )}
        </Space>
      ),
    },
    {
      title: '処理時間',
      dataIndex: 'processing_time_ms',
      key: 'processing_time_ms',
      width: 100,
      render: (time: number) => time ? `${(time / 1000).toFixed(1)}秒` : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record: ImportHistory) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showDetail(record)}
        >
          詳細
        </Button>
      ),
    },
  ]

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          取り込み履歴
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchHistories}>
            更新
          </Button>
        </Space>
      </div>

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="総取り込み数"
              value={histories.length}
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="成功"
              value={histories.filter(h => h.import_status === 'success').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="部分成功"
              value={histories.filter(h => h.import_status === 'partial_success').length}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="失敗"
              value={histories.filter(h => h.import_status === 'failed').length}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 履歴テーブル */}
      <Card title="取り込み履歴一覧">
        <Table
          columns={columns}
          dataSource={histories}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
          }}
        />
      </Card>

      {/* 詳細モーダル */}
      <Modal
        title="取り込み詳細"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedHistory && (
          <div>
            {/* 基本情報 */}
            <Descriptions title="基本情報" bordered column={2} size="small">
              <Descriptions.Item label="取り込み日時">
                {new Date(selectedHistory.started_at).toLocaleString('ja-JP')}
              </Descriptions.Item>
              <Descriptions.Item label="完了日時">
                {selectedHistory.completed_at ? 
                  new Date(selectedHistory.completed_at).toLocaleString('ja-JP') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="タイプ">
                <Tag color={selectedHistory.import_type === 'excel' ? 'blue' : 'green'}>
                  {selectedHistory.import_type === 'excel' ? 'Excel' : 'CSV'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="ステータス">
                {getStatusTag(selectedHistory.import_status)}
              </Descriptions.Item>
              <Descriptions.Item label="ファイル名">
                {selectedHistory.file_name}
              </Descriptions.Item>
              <Descriptions.Item label="ファイルサイズ">
                {(selectedHistory.file_size / 1024).toFixed(1)} KB
              </Descriptions.Item>
              <Descriptions.Item label="処理時間">
                {selectedHistory.processing_time_ms ? 
                  `${(selectedHistory.processing_time_ms / 1000).toFixed(1)}秒` : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            {/* 統計情報 */}
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="総レコード数" value={selectedHistory.total_records} />
              </Col>
              <Col span={6}>
                <Statistic title="成功" value={selectedHistory.success_records} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={6}>
                <Statistic title="エラー" value={selectedHistory.error_records} valueStyle={{ color: '#ff4d4f' }} />
              </Col>
              <Col span={6}>
                <Statistic title="重複" value={selectedHistory.duplicate_records} valueStyle={{ color: '#faad14' }} />
              </Col>
            </Row>

            <Divider />

            {/* 変更内容 */}
            {(selectedHistory.store_changes.length > 0 || selectedHistory.collector_changes.length > 0) && (
              <div>
                <Title level={4}>変更内容</Title>
                
                {selectedHistory.store_changes.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>店舗変更 ({selectedHistory.store_changes.length}件)</Text>
                    <Timeline size="small" style={{ marginTop: 8 }}>
                      {selectedHistory.store_changes.map((change, index) => (
                        <Timeline.Item
                          key={index}
                          color={change.change_type === 'created' ? 'green' : 
                                 change.change_type === 'updated' ? 'blue' : 'red'}
                        >
                          <Text>
                            {change.change_type === 'created' && '新規作成: '}
                            {change.change_type === 'updated' && '更新: '}
                            {change.change_type === 'deleted' && '削除: '}
                            {change.store_code} - {change.store_name}
                          </Text>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </div>
                )}

                {selectedHistory.collector_changes.length > 0 && (
                  <div>
                    <Text strong>収集業者変更 ({selectedHistory.collector_changes.length}件)</Text>
                    <Timeline size="small" style={{ marginTop: 8 }}>
                      {selectedHistory.collector_changes.map((change, index) => (
                        <Timeline.Item
                          key={index}
                          color={change.change_type === 'created' ? 'green' : 
                                 change.change_type === 'updated' ? 'blue' : 'red'}
                        >
                          <Text>
                            {change.change_type === 'created' && '新規作成: '}
                            {change.change_type === 'updated' && '更新: '}
                            {change.change_type === 'deleted' && '削除: '}
                            {change.collector_name}
                          </Text>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </div>
                )}
              </div>
            )}

            {/* 警告・エラー */}
            {(selectedHistory.warnings.length > 0 || selectedHistory.errors.length > 0) && (
              <div>
                <Title level={4}>警告・エラー</Title>
                
                {selectedHistory.warnings.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>警告 ({selectedHistory.warnings.length}件)</Text>
                    {selectedHistory.warnings.map((warning, index) => (
                      <Alert
                        key={index}
                        message={warning.message}
                        type="warning"
                        showIcon
                        icon={<WarningOutlined />}
                        style={{ marginTop: 8 }}
                        description={
                          <Space>
                            {getWarningTag(warning.type)}
                            {warning.field && <Text type="secondary">フィールド: {warning.field}</Text>}
                            {warning.record_index && <Text type="secondary">行: {warning.record_index}</Text>}
                          </Space>
                        }
                      />
                    ))}
                  </div>
                )}

                {selectedHistory.errors.length > 0 && (
                  <div>
                    <Text strong>エラー ({selectedHistory.errors.length}件)</Text>
                    {selectedHistory.errors.map((error, index) => (
                      <Alert
                        key={index}
                        message={error.message}
                        type="error"
                        showIcon
                        icon={<CloseCircleOutlined />}
                        style={{ marginTop: 8 }}
                        description={
                          <Space>
                            {getErrorTag(error.type)}
                            {error.field && <Text type="secondary">フィールド: {error.field}</Text>}
                            {error.record_index && <Text type="secondary">行: {error.record_index}</Text>}
                          </Space>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ImportHistoryPage

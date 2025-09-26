import React, { useState } from 'react'
import { 
  Card, Table, Tag, Space, Typography, Row, Col, 
  Statistic, Alert, Divider, Collapse, Badge,
  Tooltip, Button, Modal, message
} from 'antd'
import { 
  PlusOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
  EyeOutlined, WarningOutlined
} from '@ant-design/icons'
import { StorePreviewData } from '@/utils/store-csv-importer'
import type { Store } from '@contracts/v0/schema'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Panel } = Collapse

// ============================================================================
// 店舗CSV取り込みプレビューコンポーネント
// ============================================================================

interface StoreImportPreviewProps {
  previewData: StorePreviewData
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

const StoreImportPreview: React.FC<StoreImportPreviewProps> = ({
  previewData,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const [selectedItems, setSelectedItems] = useState<{
    new: Set<string>
    update: Set<string>
    delete: Set<string>
  }>({
    new: new Set(),
    update: new Set(),
    delete: new Set()
  })

  // 新規店舗の列定義
  const newStoreColumns = [
    {
      title: '選択',
      key: 'select',
      width: 60,
      render: (_, record: any) => (
        <input
          type="checkbox"
          checked={selectedItems.new.has(record.csvRow.store_code)}
          onChange={(e) => {
            const newSelected = new Set(selectedItems.new)
            if (e.target.checked) {
              newSelected.add(record.csvRow.store_code)
            } else {
              newSelected.delete(record.csvRow.store_code)
            }
            setSelectedItems({ ...selectedItems, new: newSelected })
          }}
        />
      )
    },
    {
      title: '店舗番号',
      dataIndex: ['csvRow', 'store_code'],
      key: 'store_code',
      width: 100,
      render: (code: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {code}
        </Text>
      )
    },
    {
      title: 'エリア長コード',
      dataIndex: ['csvRow', 'area_manager_code'],
      key: 'area_manager_code',
      width: 120,
      render: (code: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {code}
        </Text>
      )
    },
    {
      title: '店舗名',
      dataIndex: ['csvRow', 'name'],
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: '舗名',
      dataIndex: ['csvRow', 'area_name'],
      key: 'area_name'
    },
    {
      title: '開店予定日',
      dataIndex: ['preview', 'opening_date'],
      key: 'opening_date',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY/MM/DD') : '-'
    }
  ]

  // 更新店舗の列定義
  const updateStoreColumns = [
    {
      title: '選択',
      key: 'select',
      width: 60,
      render: (_, record: any) => (
        <input
          type="checkbox"
          checked={selectedItems.update.has(record.csvRow.store_code)}
          onChange={(e) => {
            const newSelected = new Set(selectedItems.update)
            if (e.target.checked) {
              newSelected.add(record.csvRow.store_code)
            } else {
              newSelected.delete(record.csvRow.store_code)
            }
            setSelectedItems({ ...selectedItems, update: newSelected })
          }}
        />
      )
    },
    {
      title: '店舗番号',
      dataIndex: ['csvRow', 'store_code'],
      key: 'store_code',
      width: 100,
      render: (code: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {code}
        </Text>
      )
    },
    {
      title: '店舗名',
      dataIndex: ['csvRow', 'name'],
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: '変更内容',
      key: 'changes',
      render: (_, record: any) => (
        <Space direction="vertical" size="small">
          {Object.entries(record.changes).map(([field, change]: [string, any]) => (
            <div key={field}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {getFieldLabel(field)}:
              </Text>
              <br />
              <Text delete style={{ color: '#ff4d4f' }}>
                {change.old || '-'}
              </Text>
              {' → '}
              <Text style={{ color: '#52c41a' }}>
                {change.new || '-'}
              </Text>
            </div>
          ))}
        </Space>
      )
    }
  ]

  // 削除店舗の列定義
  const deleteStoreColumns = [
    {
      title: '選択',
      key: 'select',
      width: 60,
      render: (_, record: any) => (
        <input
          type="checkbox"
          checked={selectedItems.delete.has(record.store.id)}
          onChange={(e) => {
            const newSelected = new Set(selectedItems.delete)
            if (e.target.checked) {
              newSelected.add(record.store.id)
            } else {
              newSelected.delete(record.store.id)
            }
            setSelectedItems({ ...selectedItems, delete: newSelected })
          }}
        />
      )
    },
    {
      title: '店舗番号',
      dataIndex: ['store', 'store_code'],
      key: 'store_code',
      width: 100,
      render: (code: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {code}
        </Text>
      )
    },
    {
      title: '店舗名',
      dataIndex: ['store', 'name'],
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: '舗名',
      dataIndex: ['store', 'area_name'],
      key: 'area_name'
    },
    {
      title: '削除理由',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => (
        <Text type="secondary">{reason}</Text>
      )
    }
  ]

  // フィールドラベルの取得
  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      area_manager_code: 'エリア長コード',
      name: '店舗名',
      area_name: '舗名',
      opening_date: '開店予定日',
      closing_date: '閉店予定日'
    }
    return labels[field] || field
  }

  // 統計情報
  const stats = {
    total: previewData.newStores.length + previewData.updatedStores.length + previewData.deletedStores.length,
    new: previewData.newStores.length,
    update: previewData.updatedStores.length,
    delete: previewData.deletedStores.length,
    errors: previewData.errors.length,
    selected: selectedItems.new.size + selectedItems.update.size + selectedItems.delete.size
  }

  // 全選択/全解除
  const handleSelectAll = (type: 'new' | 'update' | 'delete') => {
    const items = type === 'new' ? previewData.newStores :
                 type === 'update' ? previewData.updatedStores :
                 previewData.deletedStores
    
    const allSelected = items.every(item => {
      const key = type === 'delete' ? item.store.id : item.csvRow.store_code
      return selectedItems[type].has(key)
    })

    if (allSelected) {
      // 全解除
      setSelectedItems({ ...selectedItems, [type]: new Set() })
    } else {
      // 全選択
      const newSelected = new Set(selectedItems[type])
      items.forEach(item => {
        const key = type === 'delete' ? item.store.id : item.csvRow.store_code
        newSelected.add(key)
      })
      setSelectedItems({ ...selectedItems, [type]: newSelected })
    }
  }

  // 確認実行
  const handleConfirm = () => {
    if (stats.selected === 0) {
      message.warning('実行する項目を選択してください')
      return
    }

    Modal.confirm({
      title: 'CSV取り込みを実行しますか？',
      content: `選択された項目: ${stats.selected}件\n\nこの操作は取り消すことができません。`,
      okText: '実行',
      cancelText: 'キャンセル',
      onOk: onConfirm
    })
  }

  return (
    <div>
      {/* 統計情報 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="総件数"
              value={stats.total}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="新規追加"
              value={stats.new}
              valueStyle={{ color: '#52c41a' }}
              prefix={<PlusOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="更新"
              value={stats.update}
              valueStyle={{ color: '#1890ff' }}
              prefix={<EditOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="削除"
              value={stats.delete}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<DeleteOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* エラー表示 */}
      {previewData.errors.length > 0 && (
        <Alert
          message="バリデーションエラー"
          description={
            <div>
              {previewData.errors.map((error, index) => (
                <div key={index} style={{ marginBottom: '4px' }}>
                  <Text code>行 {error.row}</Text>: {error.message}
                </div>
              ))}
            </div>
          }
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 変更内容の詳細 */}
      <Collapse defaultActiveKey={['new', 'update', 'delete']} style={{ marginBottom: '24px' }}>
        {/* 新規追加店舗 */}
        <Panel
          header={
            <Space>
              <Badge count={stats.new} style={{ backgroundColor: '#52c41a' }} />
              <Text strong>新規追加店舗</Text>
              <Text type="secondary">({stats.new}件)</Text>
            </Space>
          }
          key="new"
          extra={
            <Button
              size="small"
              onClick={() => handleSelectAll('new')}
            >
              {previewData.newStores.every(item => selectedItems.new.has(item.csvRow.store_code)) ? '全解除' : '全選択'}
            </Button>
          }
        >
          <Table
            columns={newStoreColumns}
            dataSource={previewData.newStores}
            rowKey={(record) => `new-${record.csvRow.store_code}`}
            pagination={false}
            size="small"
          />
        </Panel>

        {/* 更新店舗 */}
        <Panel
          header={
            <Space>
              <Badge count={stats.update} style={{ backgroundColor: '#1890ff' }} />
              <Text strong>更新店舗</Text>
              <Text type="secondary">({stats.update}件)</Text>
            </Space>
          }
          key="update"
          extra={
            <Button
              size="small"
              onClick={() => handleSelectAll('update')}
            >
              {previewData.updatedStores.every(item => selectedItems.update.has(item.csvRow.store_code)) ? '全解除' : '全選択'}
            </Button>
          }
        >
          <Table
            columns={updateStoreColumns}
            dataSource={previewData.updatedStores}
            rowKey={(record) => `update-${record.csvRow.store_code}`}
            pagination={false}
            size="small"
          />
        </Panel>

        {/* 削除店舗 */}
        <Panel
          header={
            <Space>
              <Badge count={stats.delete} style={{ backgroundColor: '#ff4d4f' }} />
              <Text strong>削除店舗</Text>
              <Text type="secondary">({stats.delete}件)</Text>
            </Space>
          }
          key="delete"
          extra={
            <Button
              size="small"
              onClick={() => handleSelectAll('delete')}
            >
              {previewData.deletedStores.every(item => selectedItems.delete.has(item.store.id)) ? '全解除' : '全選択'}
            </Button>
          }
        >
          <Alert
            message="注意"
            description="削除された店舗データは復元できません。関連する予定や実績データも影響を受ける可能性があります。"
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Table
            columns={deleteStoreColumns}
            dataSource={previewData.deletedStores}
            rowKey={(record) => `delete-${record.store.id}`}
            pagination={false}
            size="small"
          />
        </Panel>
      </Collapse>

      {/* 選択状況とアクションボタン */}
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Text strong>選択済み: {stats.selected}件</Text>
              {stats.selected > 0 && (
                <Text type="secondary">
                  (新規: {selectedItems.new.size}件, 更新: {selectedItems.update.size}件, 削除: {selectedItems.delete.size}件)
                </Text>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button onClick={onCancel}>
                キャンセル
              </Button>
              <Button
                type="primary"
                onClick={handleConfirm}
                loading={loading}
                disabled={stats.selected === 0}
              >
                選択項目を実行
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default StoreImportPreview




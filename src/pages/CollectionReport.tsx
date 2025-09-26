import React, { useState, useEffect } from 'react'
import { 
  Card, Table, Button, Space, Tag, 
  Typography, Row, Col, Statistic, 
  DatePicker, Select, Input, message,
  Tooltip, Modal, Progress
} from 'antd'
import { 
  BarChartOutlined, DownloadOutlined, 
  ReloadOutlined, FilterOutlined,
  EyeOutlined, FileExcelOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { CollectionRepository } from '@/modules/collections/repository'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { CollectorRepository } from '@/modules/collectors/repository'
import { PlanRepository } from '@/modules/plans/repository'
import { WasteTypeMasterRepository } from '@/modules/waste-type-masters/repository'
import type { Collection, CollectionRequest, Store, Collector, Plan, WasteTypeMaster } from '@contracts/v0/schema'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

// ============================================================================
// 回収実績データ画面
// ============================================================================

const CollectionReport: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [wasteTypes, setWasteTypes] = useState<WasteTypeMaster[]>([])
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([])
  const [filters, setFilters] = useState({
    dateRange: null as any,
    storeId: '',
    collectorId: '',
    wasteTypeId: '',
    status: ''
  })

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      const [collectionsData, requestsData, storesData, collectorsData, plansData, wasteTypesData] = await Promise.all([
        CollectionRepository.findMany(),
        CollectionRequestRepository.findMany(),
        StoreRepository.findMany(),
        CollectorRepository.findMany(),
        PlanRepository.findMany(),
        WasteTypeMasterRepository.findMany()
      ])
      setCollections(collectionsData)
      setRequests(requestsData)
      setStores(storesData)
      setCollectors(collectorsData)
      setPlans(plansData)
      setWasteTypes(wasteTypesData)
      setFilteredCollections(collectionsData)
    } catch (error) {
      console.error('データ取得エラー:', error)
      message.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // フィルタリング処理
  useEffect(() => {
    let filtered = [...collections]

    // 日付範囲フィルタ
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [start, end] = filters.dateRange
      filtered = filtered.filter(collection => {
        const collectionDate = dayjs(collection.actual_pickup_date)
        return collectionDate.isAfter(start) && collectionDate.isBefore(end)
      })
    }

    // 店舗フィルタ
    if (filters.storeId) {
      filtered = filtered.filter(collection => collection.store_id === filters.storeId)
    }

    // 収集業者フィルタ
    if (filters.collectorId) {
      filtered = filtered.filter(collection => collection.collector_id === filters.collectorId)
    }

    // 廃棄物種別フィルタ
    if (filters.wasteTypeId) {
      filtered = filtered.filter(collection => collection.waste_type_id === filters.wasteTypeId)
    }

    // ステータスフィルタ
    if (filters.status) {
      filtered = filtered.filter(collection => collection.status === filters.status)
    }

    setFilteredCollections(filtered)
  }, [collections, filters])

  // 店舗名取得
  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId)
    return store?.name || '不明な店舗'
  }

  // 収集業者名取得
  const getCollectorName = (collectorId: string) => {
    const collector = collectors.find(c => c.id === collectorId)
    return collector?.name || collector?.company_name || '不明な業者'
  }

  // 廃棄物種別名取得
  const getWasteTypeName = (wasteTypeId: string) => {
    const wasteType = wasteTypes.find(w => w.id === wasteTypeId)
    return wasteType?.description || '不明な種別'
  }

  // ステータス表示
  const getStatusTag = (status: string) => {
    const statusConfig = {
      'PENDING': { color: 'orange', text: '待機中' },
      'COLLECTED': { color: 'green', text: '回収済み' },
      'VERIFIED': { color: 'blue', text: '確認済み' },
      'REJECTED': { color: 'red', text: '却下' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    return <Tag color={config.color}>{config.text}</Tag>
  }

  // 列定義
  const columns = [
    {
      title: '回収ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {id.slice(-8)}
        </Text>
      )
    },
    {
      title: '店舗名',
      dataIndex: 'store_id',
      key: 'store_id',
      render: (storeId: string) => getStoreName(storeId)
    },
    {
      title: '収集業者',
      dataIndex: 'collector_id',
      key: 'collector_id',
      render: (collectorId: string) => getCollectorName(collectorId)
    },
    {
      title: '廃棄物種別',
      dataIndex: 'waste_type_id',
      key: 'waste_type_id',
      render: (wasteTypeId: string) => getWasteTypeName(wasteTypeId)
    },
    {
      title: '回収量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: Collection) => (
        <Text strong>{quantity} {record.unit}</Text>
      )
    },
    {
      title: '回収日時',
      dataIndex: 'collected_at',
      key: 'collected_at',
      render: (date: string) => dayjs(date).format('YYYY/MM/DD HH:mm')
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_, record: Collection) => (
        <Space size="small">
          <Tooltip title="詳細">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleView(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ]

  // 詳細表示処理
  const handleView = (record: Collection) => {
    Modal.info({
      title: '回収実績詳細',
      width: 600,
      content: (
        <div>
          <p><strong>回収ID:</strong> {record.id}</p>
          <p><strong>店舗:</strong> {getStoreName(record.store_id)}</p>
          <p><strong>収集業者:</strong> {getCollectorName(record.collector_id)}</p>
          <p><strong>廃棄物種別:</strong> {getWasteTypeName(record.waste_type_id)}</p>
          <p><strong>回収量:</strong> {record.quantity} {record.unit}</p>
          <p><strong>回収日時:</strong> {dayjs(record.actual_pickup_date).format('YYYY/MM/DD HH:mm')}</p>
          <p><strong>ステータス:</strong> {record.status}</p>
          <p><strong>備考:</strong> {record.notes || '-'}</p>
        </div>
      )
    })
  }

  // CSVエクスポート処理
  const handleExportCSV = () => {
    try {
      const csvData = filteredCollections.map(collection => ({
        '回収ID': collection.id,
        '店舗名': getStoreName(collection.store_id),
        '収集業者': getCollectorName(collection.collector_id),
        '廃棄物種別': getWasteTypeName(collection.waste_type_id),
        '回収量': collection.quantity,
        '単位': collection.unit,
        '回収日時': dayjs(collection.actual_pickup_date).format('YYYY/MM/DD HH:mm'),
        'ステータス': collection.status,
        '備考': collection.notes || ''
      }))

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `回収実績_${dayjs().format('YYYYMMDD')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      message.success('CSVファイルをダウンロードしました')
    } catch (error) {
      console.error('エクスポートエラー:', error)
      message.error('エクスポートに失敗しました')
    }
  }

  // 統計情報
  const stats = {
    total: filteredCollections.length,
    totalQuantity: filteredCollections.reduce((sum, c) => sum + c.quantity, 0),
    pending: filteredCollections.filter(c => c.status === 'SCHEDULED').length,
    collected: filteredCollections.filter(c => c.status === 'COMPLETED').length,
    verified: filteredCollections.filter(c => c.status === 'VERIFIED').length
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <BarChartOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  回収実績データ
                </Title>
                <Text type="secondary">
                  廃棄物回収の実績データとレポート
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchData}
                loading={loading}
              >
                更新
              </Button>
              <Button 
                type="primary" 
                icon={<DownloadOutlined />}
                onClick={handleExportCSV}
              >
                CSV出力
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* フィルター */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Text strong>期間:</Text>
            <RangePicker
              style={{ width: '100%', marginTop: '4px' }}
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            />
          </Col>
          <Col span={4}>
            <Text strong>店舗:</Text>
            <Select
              style={{ width: '100%', marginTop: '4px' }}
              placeholder="全店舗"
              value={filters.storeId}
              onChange={(value) => setFilters({ ...filters, storeId: value })}
              allowClear
            >
              {stores.map(store => (
                <Option key={store.id} value={store.id}>
                  {store.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Text strong>収集業者:</Text>
            <Select
              style={{ width: '100%', marginTop: '4px' }}
              placeholder="全業者"
              value={filters.collectorId}
              onChange={(value) => setFilters({ ...filters, collectorId: value })}
              allowClear
            >
              {collectors.map(collector => (
                <Option key={collector.id} value={collector.id}>
                  {collector.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Text strong>廃棄物種別:</Text>
            <Select
              style={{ width: '100%', marginTop: '4px' }}
              placeholder="全種別"
              value={filters.wasteTypeId}
              onChange={(value) => setFilters({ ...filters, wasteTypeId: value })}
              allowClear
            >
              {wasteTypes.map(wasteType => (
                <Option key={wasteType.id} value={wasteType.id}>
                  {wasteType.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Text strong>ステータス:</Text>
            <Select
              style={{ width: '100%', marginTop: '4px' }}
              placeholder="全ステータス"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              allowClear
            >
              <Option value="PENDING">待機中</Option>
              <Option value="COLLECTED">回収済み</Option>
              <Option value="VERIFIED">確認済み</Option>
              <Option value="REJECTED">却下</Option>
            </Select>
          </Col>
          <Col span={2}>
            <Button 
              icon={<FilterOutlined />}
              onClick={() => setFilters({
                dateRange: null,
                storeId: '',
                collectorId: '',
                wasteTypeId: '',
                status: ''
              })}
            >
              クリア
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 統計情報 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="総回収件数"
              value={stats.total}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="総回収量"
              value={stats.totalQuantity}
              suffix="kg"
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="回収済み"
              value={stats.collected}
              valueStyle={{ color: '#52c41a' }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="確認済み"
              value={stats.verified}
              valueStyle={{ color: '#1890ff' }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* メインコンテンツ */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCollections}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `全 ${total} 件`
          }}
        />
      </Card>
    </div>
  )
}

export default CollectionReport




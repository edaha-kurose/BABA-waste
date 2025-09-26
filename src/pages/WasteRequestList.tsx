import React, { useState, useEffect } from 'react'
import { 
  Card, Tabs, Table, Button, Space, Tag, Modal, 
  Form, Input, Select, DatePicker, message, 
  Typography, Row, Col, Statistic, Alert,
  Tooltip, Popconfirm, Upload, Steps
} from 'antd'
import { 
  FileTextOutlined, CalendarOutlined, 
  PlusOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, ReloadOutlined,
  UploadOutlined, DownloadOutlined, FileExcelOutlined,
  UserAddOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { UserRepository } from '@/modules/users/repository'
import { PlanRepository } from '@/modules/plans/repository'
import { StoreCollectorAssignmentRepository } from '@/modules/store-collector-assignments/repository'
import { RequestCsvImporter, RequestImportResult } from '@/utils/request-csv-importer'
import { ExcelToRequestConverter } from '@/utils/excel-to-request-converter'
import { FlexibleExcelConverter } from '@/utils/flexible-excel-converter'
import { ImportHistoryManager } from '@/utils/import-history-manager'
import { ManagedStoreRepository } from '@/modules/managed-stores/repository'
import CollectorAssignmentService from '@/utils/collector-assignment-service'
import ExcelColumnMapping, { ColumnMapping } from '@/components/ExcelColumnMapping'
import type { CollectionRequest, Store, User, Plan } from '@contracts/v0/schema'
import * as XLSX from 'xlsx'

const { Title, Text } = Typography
const { TabPane } = Tabs
const { Option } = Select
const { Step } = Steps

// ============================================================================
// 廃棄依頼一覧画面
// ============================================================================

const WasteRequestList: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('requests')
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [collectors, setCollectors] = useState<User[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRequest, setEditingRequest] = useState<CollectionRequest | null>(null)
  const [form] = Form.useForm()
  
  // CSV取り込み関連
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<RequestImportResult | null>(null)
  const [isImportModalVisible, setIsImportModalVisible] = useState(false)
  const [importStep, setImportStep] = useState(0)
  
  // Excel取り込み関連
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelImportResult, setExcelImportResult] = useState<any>(null)
  const [excelImportStep, setExcelImportStep] = useState(0)
  const [excelImportLoading, setExcelImportLoading] = useState(false)
  const [isExcelModalVisible, setIsExcelModalVisible] = useState(false)
  const [pickupDate, setPickupDate] = useState(dayjs().add(1, 'day'))
  const [importWarnings, setImportWarnings] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<any[]>([])
  const [showWarnings, setShowWarnings] = useState(false)
  const [excelConfig, setExcelConfig] = useState({
    mainItemColumns: 'E,F,G,H,I,J,K',
    otherItemColumn: 'L',
    dataStartRow: 3
  })
  const [managedStores, setManagedStores] = useState<any[]>([])
  const [excelData, setExcelData] = useState<any[][]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null)
  const [showColumnMapping, setShowColumnMapping] = useState(false)
  // 取り込み準備データ（警告確認→続行のため保持）
  const [preparedRequests, setPreparedRequests] = useState<any[] | null>(null)
  const [preparedExcelData, setPreparedExcelData] = useState<any[][] | null>(null)
  const [preparedConfig, setPreparedConfig] = useState<any | null>(null)

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      const [requestsData, storesData, usersData, plansData, managedStoresData] = await Promise.all([
        CollectionRequestRepository.findMany(),
        StoreRepository.findMany(),
        UserRepository.findMany(),
        PlanRepository.findMany(),
        ManagedStoreRepository.findMany()
      ])
      
      // 収集業者のみをフィルタリング
      const collectorsData = usersData.filter(user => user.role === 'COLLECTOR')
      setRequests(requestsData)
      setStores(storesData)
      setCollectors(collectorsData)
      setPlans(plansData)
      setManagedStores(managedStoresData)
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

  // CSV取り込み機能
  const requestCsvImporter = new RequestCsvImporter(
    CollectionRequestRepository,
    StoreRepository,
    UserRepository
  )

  // 収集業者自動割り当て機能
  const assignmentService = new CollectorAssignmentService(
    CollectionRequestRepository,
    StoreCollectorAssignmentRepository,
    StoreRepository,
    UserRepository
  )

  // CSVファイルアップロード処理
  const handleCsvUpload = (file: File) => {
    setCsvFile(file)
    setImportStep(1)
    return false // アップロードを停止
  }

  // CSV取り込み実行
  const handleImportCsv = async () => {
    if (!csvFile) return

    try {
      setLoading(true)
      const csvRows = await requestCsvImporter.parseCsvFile(csvFile)
      const result = await requestCsvImporter.importRequests(csvRows)
      
      setImportResult(result)
      setImportStep(2)
      
      if (result.success) {
        message.success(result.message)
        fetchData()
      } else {
        message.error(result.message)
      }
    } catch (error) {
      console.error('CSV取り込みエラー:', error)
      message.error('CSV取り込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // CSVテンプレートダウンロード
  const handleDownloadTemplate = () => {
    const template = requestCsvImporter.generateTemplate()
    const url = URL.createObjectURL(template)
    const link = document.createElement('a')
    link.href = url
    link.download = `廃棄依頼テンプレート_${dayjs().format('YYYYMMDD')}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 収集業者自動割り当て
  const handleAutoAssignCollectors = async () => {
    try {
      setLoading(true)
      const result = await assignmentService.assignCollectorsToUnassignedRequests()
      
      if (result.success) {
        message.success(result.message)
        fetchData()
      } else {
        message.warning(result.message)
        if ((result as any)?.errors && (result as any).errors.length > 0) {
          console.error('割り当てエラー:', (result as any).errors)
        }
        fetchData()
      }
    } catch (error) {
      console.error('自動割り当てエラー:', error)
      message.error('収集業者の自動割り当てに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // Excelファイルアップロード処理
  // Excelファイルの解析（列マッピング用）
  const parseExcelFile = async (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result as ArrayBuffer
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
          resolve(jsonData)
        } catch (error) {
          reject(new Error(`Excelファイルの解析に失敗しました: ${error}`))
        }
      }

      reader.onerror = () => {
        reject(new Error('ファイルの読み込み中にエラーが発生しました'))
      }

      reader.readAsArrayBuffer(file)
    })
  }

  const handleExcelUpload = async (file: File) => {
    try {
      setExcelImportLoading(true)
      setExcelFile(file)
      
      // Excelファイルを解析
      const data = await parseExcelFile(file)
      setExcelData(data)
      
      // 列マッピング画面を表示
      setShowColumnMapping(true)
      setExcelImportStep(1)
      
    } catch (error) {
      console.error('Excelファイル解析エラー:', error)
      message.error(`ファイルの解析に失敗しました: ${error}`)
    } finally {
      setExcelImportLoading(false)
    }
    return false // アップロードを停止
  }

  // 列マッピング完了時の処理
  const handleColumnMappingComplete = (mapping: ColumnMapping) => {
    setColumnMapping(mapping)
    setShowColumnMapping(false)
    setExcelImportStep(2)
    
    // 設定を更新
    setExcelConfig({
      mainItemColumns: mapping.mainItemColumns.join(','),
      otherItemColumn: mapping.otherItemColumn,
      dataStartRow: mapping.dataStartRow
    })
  }

  // Excel取り込み実行
  const handleImportExcel = async () => {
    if (!excelFile || !columnMapping) return

    try {
      setExcelImportLoading(true)
      
      // 列マッピングから設定を生成
      const config = {
        mainItemColumns: columnMapping.mainItemColumns,
        otherItemColumn: columnMapping.otherItemColumn,
        dataStartRow: columnMapping.dataStartRow,
        storeCodeColumn: columnMapping.storeCodeColumn,
        storeNameColumn: columnMapping.storeNameColumn,
        areaColumn: columnMapping.areaColumn
      }
      
      const converter = new FlexibleExcelConverter(config)
      converter.setManagedStores(managedStores)
      const historyManager = new ImportHistoryManager()

      // 廃棄依頼データに変換
      const requestRows = converter.convertToRequestData(excelData, pickupDate.format('YYYY-MM-DD'))
      console.log('変換された廃棄依頼データ:', requestRows)

      // 重複チェックと警告生成
      const existingRequests = await CollectionRequestRepository.findMany()
      const { duplicates, warnings } = historyManager.checkForDuplicates(
        requestRows,
        existingRequests.map(r => ({
          store_code: r.store_id,
          collector_name: r.collector_id,
          item_name: r.main_items?.[0]?.item_name || r.other_items?.[0]?.item_name || '',
          planned_pickup_date: r.requested_pickup_date
        })),
        ['store_code', 'collector_name', 'item_name', 'planned_pickup_date']
      )

      // 管理店舗マスターにない店舗の警告
      const unmanagedStoreWarnings = requestRows
        .filter(row => !managedStores.some(s => s.store_code === row.store_code))
        .map(row => ({
          type: 'missing_data',
          message: `管理店舗マスターにない店舗: ${row.store_code} - ${row.store_name}`,
          field: 'store_code'
        }))

      // 警告とエラーを設定
      const allWarnings = [...warnings, ...unmanagedStoreWarnings]
      setImportWarnings(allWarnings)
      setImportErrors([])

      // 警告がある場合は確認画面を表示
      if (allWarnings.length > 0) {
        // 続行用に準備データを保持
        setPreparedRequests(requestRows)
        setPreparedExcelData(excelData)
        setPreparedConfig(config)
        setShowWarnings(true)
        setExcelImportStep(1.5) // 警告確認ステップ
        return
      }

      // 警告がない場合は直接取り込み実行
      await executeImport(requestRows, excelData, converter)

    } catch (error) {
      console.error('Excel取り込みエラー:', error)
      message.error('Excel取り込みに失敗しました')
    } finally {
      setExcelImportLoading(false)
    }
  }

  // 取り込み実行
  const executeImport = async (requestRows: any[], excelData: any, converter: any) => {
    try {
      // CSV取り込み処理を使用してデータを登録
      const result = await requestCsvImporter.importRequests(requestRows, 'default-org')

      // サマリーを生成
      const summary = converter.generateSummary(excelData, requestRows)

      setExcelImportResult({
        ...result,
        summary,
        convertedRequests: requestRows
      })
      setExcelImportStep(2)

      if (result.success) {
        message.success(`Excel取り込みが完了しました。${summary.totalRequests}件の依頼を作成しました。`)
        fetchData()
      } else {
        message.error(result.message)
      }
    } catch (error) {
      console.error('取り込み実行エラー:', error)
      message.error('取り込み実行に失敗しました')
    }
  }

  // 店舗名取得
  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId)
    return store?.name || '不明な店舗'
  }

  // 収集業者名取得
  const getCollectorName = (collectorId: string) => {
    const collector = collectors.find(c => c.id === collectorId)
    return collector?.name || collector?.company_name || '未割り当て'
  }

  // ステータス表示
  const getStatusTag = (status: string) => {
    const statusConfig = {
      'PENDING': { color: 'orange', text: '承認待ち', icon: <ClockCircleOutlined /> },
      'CONFIRMED': { color: 'blue', text: '確定', icon: <CheckCircleOutlined /> },
      'IN_PROGRESS': { color: 'processing', text: '作業中', icon: <ClockCircleOutlined /> },
      'COMPLETED': { color: 'green', text: '完了', icon: <CheckCircleOutlined /> },
      'CANCELLED': { color: 'red', text: 'キャンセル', icon: <ExclamationCircleOutlined /> }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  // 依頼管理タブの列定義
  const requestColumns = [
    {
      title: '依頼ID',
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
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '依頼日',
      dataIndex: 'requested_at',
      key: 'requested_at',
      render: (date: string) => dayjs(date).format('YYYY/MM/DD')
    },
    {
      title: '回収日時（希望）',
      dataIndex: 'requested_pickup_date',
      key: 'requested_pickup_date',
      render: (date: string) => date ? dayjs(date).format('YYYY/MM/DD HH:mm') : '-'
    },
    {
      title: '確定回収日時',
      dataIndex: 'confirmed_pickup_date',
      key: 'confirmed_pickup_date',
      render: (_: any, record: any) => {
        if (record.confirmed_pickup_date && record.confirmed_pickup_time) {
          return `${dayjs(record.confirmed_pickup_date).format('YYYY/MM/DD')} ${record.confirmed_pickup_time}`
        }
        return '-'
      }
    },
    {
      title: '承認',
      key: 'approve',
      width: 140,
      render: (_: any, record: any) => {
        if (record.status !== 'PENDING' || !record.requested_pickup_date) return <span>-</span>
        return (
          <Space>
            <Button type="primary" onClick={async()=>{
              try {
                const dt = dayjs(record.requested_pickup_date)
                await CollectionRequestRepository.update(record.id, {
                  status: 'CONFIRMED',
                  confirmed_pickup_date: dt.format('YYYY-MM-DD'),
                  confirmed_pickup_time: dt.format('HH:mm'),
                } as any)
                message.success('回収日時を確定しました')
                fetchData()
              } catch (e) {
                console.error(e)
                message.error('確定に失敗しました')
              }
            }}>確定</Button>
          </Space>
        )
      }
    }
  ]

  // 日程調整管理タブの列定義
  const scheduleColumns = [
    {
      title: '依頼ID',
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
      title: '回収予定日時',
      dataIndex: 'requested_pickup_date',
      key: 'requested_pickup_date',
      render: (_: any, record: CollectionRequest) => (
        <Space>
          <span>{record.requested_pickup_date ? dayjs(record.requested_pickup_date).format('YYYY/MM/DD HH:mm') : '-'}</span>
          {record.status === 'PENDING' && record.requested_pickup_date && (
            <Button size="small" type="primary" onClick={() => handleConfirmSchedule(record)}>日程確定</Button>
          )}
          {record.status === 'CONFIRMED' && (
            <Button size="small" danger onClick={() => handleCancelConfirm(record)}>確定キャンセル</Button>
          )}
          <Button size="small" onClick={() => handleEdit(record)}>回収指定</Button>
        </Space>
      )
    },
    {
      title: '確定回収日',
      dataIndex: 'confirmed_pickup_date',
      key: 'confirmed_pickup_date',
      render: (date: string) => date ? dayjs(date).format('YYYY/MM/DD') : '-'
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    // 操作列は廃止（上の回収予定日時列にボタン配置）
  ]

  // 編集処理
  const handleEdit = (request: CollectionRequest) => {
    setEditingRequest(request)
    form.setFieldsValue({
      ...request,
      requested_pickup_date: request.requested_pickup_date ? dayjs(request.requested_pickup_date) : null,
      confirmed_pickup_date: request.confirmed_pickup_date ? dayjs(request.confirmed_pickup_date) : null
    })
    setIsModalVisible(true)
  }

  // 削除処理
  const handleDelete = async (id: string) => {
    try {
      await CollectionRequestRepository.delete(id)
      message.success('依頼を削除しました')
      fetchData()
    } catch (error) {
      console.error('削除エラー:', error)
      message.error('削除に失敗しました')
    }
  }

  // 日程確定処理
  const handleConfirmSchedule = async (request: CollectionRequest) => {
    try {
      await CollectionRequestRepository.update(request.id, {
        ...request,
        status: 'CONFIRMED',
        confirmed_pickup_date: request.requested_pickup_date || new Date().toISOString()
      })
      message.success('日程を確定しました')
      fetchData()
    } catch (error) {
      console.error('日程確定エラー:', error)
      message.error('日程確定に失敗しました')
    }
  }

  // 確定キャンセル（確定値のリセット＋承認待ちへ戻す）
  const handleCancelConfirm = async (request: CollectionRequest) => {
    try {
      await CollectionRequestRepository.update(request.id, {
        status: 'PENDING',
        confirmed_pickup_date: undefined as any,
        confirmed_pickup_time: undefined as any,
      } as any)
      message.success('確定をキャンセルしました')
      fetchData()
    } catch (error) {
      console.error('確定キャンセルエラー:', error)
      message.error('確定キャンセルに失敗しました')
    }
  }

  // モーダル保存処理
  const handleModalSave = async () => {
    try {
      const values = await form.validateFields()
      const requestData = {
        ...values,
        requested_pickup_date: values.requested_pickup_date?.toISOString(),
        confirmed_pickup_date: values.confirmed_pickup_date?.toISOString()
      }

      if (editingRequest) {
        await CollectionRequestRepository.update(editingRequest.id, requestData)
        message.success('依頼を更新しました')
      } else {
        await CollectionRequestRepository.create(requestData)
        message.success('依頼を作成しました')
      }

      setIsModalVisible(false)
      setEditingRequest(null)
      form.resetFields()
      fetchData()
    } catch (error) {
      console.error('保存エラー:', error)
      message.error('保存に失敗しました')
    }
  }

  // 統計情報
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    confirmed: requests.filter(r => r.status === 'CONFIRMED').length,
    collected: requests.filter(r => r.status === 'COMPLETED').length
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <FileTextOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  廃棄依頼一覧
                </Title>
                <Text type="secondary">
                  廃棄物回収依頼の管理と日程調整
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button type="primary" onClick={async()=>{
                try {
                  const targets = requests.filter(r=> r.status==='PENDING' && r.requested_pickup_date)
                  for (const r of targets) {
                    const dt = dayjs(r.requested_pickup_date)
                    await CollectionRequestRepository.update(r.id, {
                      status: 'CONFIRMED',
                      confirmed_pickup_date: dt.format('YYYY-MM-DD'),
                      confirmed_pickup_time: dt.format('HH:mm'),
                    } as any)
                  }
                  message.success(`日程を一括確定しました（${targets.length} 件）`)
                  fetchData()
                } catch(e) {
                  console.error(e)
                  message.error('一括確定に失敗しました')
                }
              }}>
                一括日程確定
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchData}
                loading={loading}
              >
                更新
              </Button>
              {/*
              <Button 
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
              >
                テンプレート
              </Button>
              <Button 
                icon={<UploadOutlined />}
                onClick={() => {
                  setIsImportModalVisible(true)
                  setImportStep(0)
                }}
              >
                CSV取り込み
              </Button>
              */}
        <Button
          icon={<FileExcelOutlined />}
          onClick={() => {
            setExcelFile(null)
            setExcelImportResult(null)
            setExcelImportStep(0)
            setShowColumnMapping(false)
            setIsExcelModalVisible(true)
          }}
        >
          エクセル取込
        </Button>
              <Button 
                icon={<UserAddOutlined />}
                onClick={handleAutoAssignCollectors}
                loading={loading}
              >
                業者自動割当
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingRequest(null)
                  form.resetFields()
                  setIsModalVisible(true)
                }}
              >
                新規依頼
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 統計情報 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="総依頼数"
              value={stats.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待機中"
              value={stats.pending}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="確認済み"
              value={stats.confirmed}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="回収済み"
              value={stats.collected}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* メインコンテンツ */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
        >
          <TabPane 
            tab={
              <span>
                <FileTextOutlined />
                依頼管理
              </span>
            } 
            key="requests"
          >
            <Table
              columns={requestColumns}
              dataSource={requests}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `全 ${total} 件`
              }}
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <CalendarOutlined />
                日程調整管理
              </span>
            } 
            key="schedule"
          >
            <Alert
              message="日程調整管理"
              description="収集業者との回収日程の調整を行います。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Table
              columns={scheduleColumns}
              dataSource={requests.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED')}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `全 ${total} 件`
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* CSV取り込みモーダル */}
      <Modal
        title="CSV取り込み"
        open={isImportModalVisible}
        onCancel={() => {
          setIsImportModalVisible(false)
          setCsvFile(null)
          setImportResult(null)
          setImportStep(0)
        }}
        footer={null}
        width={800}
      >
        <Steps current={importStep} style={{ marginBottom: '24px' }}>
          <Step title="ファイル選択" />
          <Step title="取り込み実行" />
          <Step title="完了" />
        </Steps>

        {importStep === 0 && (
          <div>
            <Alert
              message="CSVファイルを選択してください"
              description="廃棄依頼データのCSVファイルをアップロードして取り込みを行います。収集業者名は任意で、未指定の場合は店舗に割り当てられた業者が自動選択されます。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Upload.Dragger
              accept=".xlsx,.xls,.csv"
              beforeUpload={handleCsvUpload}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <FileExcelOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">CSVファイルをドラッグ&ドロップまたはクリックして選択</p>
              <p className="ant-upload-hint">
                対応形式: .xlsx, .xls, .csv
              </p>
            </Upload.Dragger>
          </div>
        )}

        {importStep === 1 && csvFile && (
          <div>
            <Alert
              message="取り込みを実行しますか？"
              description={`選択されたファイル: ${csvFile.name}\n\nこの操作により廃棄依頼が一括作成されます。`}
              type="warning"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setImportStep(0)}>
                  戻る
                </Button>
                <Button type="primary" onClick={handleImportCsv} loading={loading}>
                  取り込み実行
                </Button>
              </Space>
            </div>
          </div>
        )}

        {importStep === 2 && importResult && (
          <div>
            <Alert
              message={importResult.success ? '取り込み完了' : '取り込みエラー'}
              description={importResult.message}
              type={importResult.success ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={8}>
                <Statistic title="総件数" value={importResult.stats.total} />
              </Col>
              <Col span={8}>
                <Statistic title="作成" value={importResult.stats.created} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={8}>
                <Statistic title="エラー" value={importResult.stats.errors} valueStyle={{ color: '#ff4d4f' }} />
              </Col>
            </Row>

            {(importResult?.errors?.length ?? 0) > 0 && (
              <Alert
                message="エラー詳細"
                description={
                  <div>
                    {(importResult?.errors ?? []).map((error, index) => (
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

            {(importResult?.createdRequests?.length ?? 0) > 0 && (
              <Alert
                message="作成された依頼"
                description={
                  <div>
                    {(importResult?.createdRequests ?? []).map((request, index) => (
                      <div key={index} style={{ marginBottom: '4px' }}>
                        <Text code>{request.store_code}</Text> - {request.collector_name}: {request.item_name} ({request.planned_quantity}{request.unit})
                      </div>
                    ))}
                  </div>
                }
                type="success"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            <div style={{ textAlign: 'right' }}>
              <Button type="primary" onClick={() => {
                setIsImportModalVisible(false)
                setCsvFile(null)
                setImportResult(null)
                setImportStep(0)
              }}>
                閉じる
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 編集モーダル */}
      <Modal
        title={editingRequest ? '依頼編集' : '新規依頼'}
        open={isModalVisible}
        onOk={handleModalSave}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingRequest(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="store_id"
            label="店舗"
            rules={[{ required: true, message: '店舗を選択してください' }]}
          >
            <Select placeholder="店舗を選択">
              {stores.map(store => (
                <Option key={store.id} value={store.id}>
                  {store.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="collector_id"
            label="収集業者"
            rules={[{ required: true, message: '収集業者を選択してください' }]}
          >
            <Select placeholder="収集業者を選択">
              {collectors.map(collector => (
                <Option key={collector.id} value={collector.id}>
                  {collector.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="ステータス"
            rules={[{ required: true, message: 'ステータスを選択してください' }]}
          >
            <Select placeholder="ステータスを選択">
              <Option value="PENDING">待機中</Option>
              <Option value="CONFIRMED">確認済み</Option>
              <Option value="COLLECTED">回収済み</Option>
              <Option value="CANCELLED">キャンセル</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="requested_pickup_date"
            label="希望回収日"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="confirmed_pickup_date"
            label="確定回収日"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備考"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

        {/* エクセル取込モーダル */}
        <Modal
          title="エクセル取込"
          open={isExcelModalVisible}
          onCancel={() => {
            setIsExcelModalVisible(false)
            setExcelImportStep(0)
            setExcelFile(null)
            setExcelImportResult(null)
            setShowColumnMapping(false)
            setColumnMapping(null)
          }}
          footer={null}
          width={1200}
        >
           <Steps current={excelImportStep} style={{ marginBottom: 24 }}>
             <Step title="ファイル選択" />
             <Step title="列マッピング" />
             <Step title="取り込み実行" />
             {excelImportStep === 1.5 && <Step title="警告確認" />}
             <Step title="完了" />
           </Steps>

        {/* 列マッピング画面 */}
        {showColumnMapping && (
          <ExcelColumnMapping
            excelData={excelData}
            onMappingComplete={handleColumnMappingComplete}
            onCancel={() => {
              setShowColumnMapping(false)
              setExcelImportStep(0)
            }}
          />
        )}

        {isExcelModalVisible && excelImportStep === 0 && (
          <div>
            <Card title="ファイル選択" size="small">
              <Upload.Dragger
                accept=".xlsx,.xls"
                beforeUpload={handleExcelUpload}
                showUploadList={false}
                disabled={excelImportLoading}
              >
                <p className="ant-upload-drag-icon">
                  <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text">
                  Excelファイルをドラッグ&ドロップまたはクリックして選択
                </p>
                <p className="ant-upload-hint">
                  対応形式: .xlsx, .xls
                </p>
              </Upload.Dragger>
            </Card>
          </div>
        )}

        {isExcelModalVisible && excelImportStep === 2 && (
          <div>
            <Alert
              message="取り込み準備完了"
              description={`ファイル: ${excelFile?.name} を処理します。`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Button
              type="primary"
              onClick={handleImportExcel}
              loading={excelImportLoading}
              block
            >
              取り込み実行
            </Button>
          </div>
        )}

        {isExcelModalVisible && excelImportStep === 1.5 && (
             <div>
               <Alert
                 message="取り込み前の確認"
                 description="以下の注意事項を確認してください。"
                 type="warning"
                 style={{ marginBottom: 16 }}
               />
               
               {importWarnings.length > 0 && (
                 <div style={{ marginBottom: 16 }}>
                   <Text strong>検出された警告・注意事項:</Text>
                   {importWarnings.map((warning, index) => (
                     <Alert
                       key={index}
                       message={warning.message}
                       type="warning"
                       showIcon
                       style={{ marginTop: 8 }}
                       description={
                         <Space>
                           <Tag color="orange">{warning.type}</Tag>
                           {warning.field && <Text type="secondary">フィールド: {warning.field}</Text>}
                           {warning.record_index && <Text type="secondary">行: {warning.record_index}</Text>}
                         </Space>
                       }
                     />
                   ))}
                 </div>
               )}

               <Space>
                 <Button
                   type="primary"
                   onClick={async () => {
                     try {
                       setExcelImportStep(1)
                       const cfg = preparedConfig || (columnMapping ? {
                         mainItemColumns: columnMapping.mainItemColumns,
                         otherItemColumn: columnMapping.otherItemColumn,
                         dataStartRow: columnMapping.dataStartRow,
                         storeCodeColumn: columnMapping.storeCodeColumn,
                         storeNameColumn: columnMapping.storeNameColumn,
                         areaColumn: columnMapping.areaColumn
                       } : null)
                       const conv = new FlexibleExcelConverter(cfg || { mainItemColumns: [], otherItemColumn: '', dataStartRow: 3 })
                       conv.setManagedStores(managedStores)
                       await executeImport(
                         preparedRequests || [],
                         preparedExcelData || excelData,
                         conv
                       )
                     } catch (e) {
                       console.error(e)
                       message.error('取り込みの続行に失敗しました')
                     }
                   }}
                   loading={excelImportLoading}
                 >
                   取り込みを続行
                 </Button>
                 <Button
                   onClick={() => {
                     setExcelImportStep(0)
                     setExcelFile(null)
                     setImportWarnings([])
                     setShowWarnings(false)
                   }}
                 >
                   キャンセル
                 </Button>
               </Space>
             </div>
           )}

        {isExcelModalVisible && excelImportStep === 2 && excelImportResult && (
          <div>
            <Alert
              message="取り込み完了"
              description="Excelファイルの取り込みが完了しました。"
              type="success"
              style={{ marginBottom: 16 }}
            />
            
               {excelImportResult?.summary && (
                 <div style={{ marginBottom: 16 }}>
                   <Text strong>取り込み結果:</Text>
                   <Row gutter={16} style={{ marginTop: 8 }}>
                     <Col span={6}>
                       <Statistic title="総依頼数" value={excelImportResult?.summary?.totalRequests ?? 0} />
                     </Col>
                     <Col span={6}>
                       <Statistic title="店舗数" value={excelImportResult?.summary?.storeCount ?? 0} />
                     </Col>
                     <Col span={6}>
                       <Statistic title="物品種別数" value={excelImportResult?.summary?.itemTypes?.length ?? 0} />
                     </Col>
                     <Col span={6}>
                       <Statistic title="総数量" value={excelImportResult?.summary?.totalQuantity ?? 0} />
                     </Col>
                   </Row>
                   
                   {excelImportResult?.summary?.sheetSummary && (
                     <div style={{ marginTop: 16 }}>
                       <Text strong>シート別データ数:</Text>
                       <Row gutter={16} style={{ marginTop: 8 }}>
                         <Col span={8}>
                           <Statistic 
                             title="リスト（店舗物品）" 
                             value={excelImportResult?.summary?.sheetSummary?.storeItems ?? 0}
                             valueStyle={{ color: '#1890ff' }}
                           />
                         </Col>
                         <Col span={8}>
                           <Statistic 
                             title="ハンカチ什器" 
                             value={excelImportResult?.summary?.sheetSummary?.handkerchief ?? 0}
                             valueStyle={{ color: '#52c41a' }}
                           />
                         </Col>
                         <Col span={8}>
                           <Statistic 
                             title="野菜什器" 
                             value={excelImportResult?.summary?.sheetSummary?.vegetable ?? 0}
                             valueStyle={{ color: '#faad14' }}
                           />
                         </Col>
                       </Row>
                     </div>
                   )}
                 </div>
               )}
            
            <Button
              type="primary"
              onClick={() => {
                setExcelImportStep(0)
                setExcelFile(null)
                setExcelImportResult(null)
              }}
              block
            >
              閉じる
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default WasteRequestList

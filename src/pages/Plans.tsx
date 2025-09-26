// ============================================================================
// 予定管理ページ
// 作成日: 2025-09-16
// 目的: 予定の一覧表示、作成、編集、削除
// ============================================================================

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  Tag,
  Upload,
  Progress,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CalendarOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  SendOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'

const { Title } = Typography
const { Option } = Select

// エクセルファイル解析のインポート
import { parseExcelToPlans, generateExcelTemplate } from '@/utils/excel-parser'
import { TestDataManager } from '@/utils/test-data-manager'
import { parseStoreItemsExcelToPlans, generateStoreItemsTemplate } from '@/utils/store-items-parser'

// Repository層のインポート
import { organizationRepository } from '@/modules/organizations/repository'
import dayjs from 'dayjs'
import { StoreRepository } from '@/modules/stores/repository'
import { ItemMapRepository } from '@/modules/item-maps/repository'
import { PlanRepository } from '@/modules/plans/repository'
import { CollectorRepository } from '@/modules/collectors/repository'
import { StoreCollectorAssignmentRepository } from '@/modules/store-collector-assignments/repository'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { CollectionRepository } from '@/modules/collections/repository'

// 自動依頼生成のインポート
import { generateCollectionRequestsFromPlans } from '@/utils/auto-request-generator'

// 重複チェックのインポート
import { 
  checkMultiplePlansDuplicate, 
  formatDuplicateMessage, 
  generateDuplicateSummary,
  type DuplicateCheckConfig 
} from '@/utils/duplicate-checker'

interface PlanFormData {
  store_id: string
  planned_pickup_date: string
  item_name: string
  planned_quantity: number
  unit: 'T' | 'KG' | 'M3' | 'L' | 'PCS'
  area_or_city?: string
  notes?: string
}

const Plans: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [itemMaps, setItemMaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [form] = Form.useForm()
  
  // エクセルアップロード関連の状態
  const [isExcelModalVisible, setIsExcelModalVisible] = useState(false)
  const [excelUploading, setExcelUploading] = useState(false)
  const [excelProgress, setExcelProgress] = useState(0)
  const [excelResult, setExcelResult] = useState<any>(null)
  
  // 店舗物品管理アップロード関連の状態
  const [isStoreItemsModalVisible, setIsStoreItemsModalVisible] = useState(false)
  const [storeItemsUploading, setStoreItemsUploading] = useState(false)
  const [storeItemsProgress, setStoreItemsProgress] = useState(0)
  const [storeItemsResult, setStoreItemsResult] = useState<any>(null)
  const [pickupDate, setPickupDate] = useState<string>('')
  const [registerStores, setRegisterStores] = useState<boolean>(true)
  
  // 自動依頼生成関連の状態
  const [isGeneratingRequests, setIsGeneratingRequests] = useState(false)
  
  // データクリア関連の状態
  const [isClearingData, setIsClearingData] = useState(false)
  const [clearDataModalVisible, setClearDataModalVisible] = useState(false)
  
  // 重複チェック関連の状態
  const [duplicateCheckConfig, setDuplicateCheckConfig] = useState<DuplicateCheckConfig>({
    checkSameMonth: true,
    checkSameStore: true,
    checkSameItem: true,
    checkSameQuantity: false,
    toleranceDays: 0,
  })
  const [duplicateCheckResults, setDuplicateCheckResults] = useState<any[]>([])
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false)
  
  // テストデータ生成関連の状態
  const [isGeneratingTestData, setIsGeneratingTestData] = useState(false)
  const [testDataManager] = useState(() => new TestDataManager())

  // 初期データのセットアップ
  const setupInitialData = async () => {
    try {
      // 店舗データが空の場合、初期データを作成
      const existingStores = await StoreRepository.findMany()
      if (existingStores.length === 0) {
        await StoreRepository.create({
          org_id: 'demo-org-id',
          store_code: '001',
          name: '本店',
          address: '東京都渋谷区',
          area: '渋谷区',
          emitter_no: 'E001',
        })
        await StoreRepository.create({
          org_id: 'demo-org-id',
          store_code: '002',
          name: '支店A',
          address: '東京都新宿区',
          area: '新宿区',
          emitter_no: 'E002',
        })
      }

      // 品目マップデータが空の場合、初期データを作成
      const existingItemMaps = await ItemMapRepository.findMany()
      if (existingItemMaps.length === 0) {
        await ItemMapRepository.create({
          org_id: 'demo-org-id',
          item_label: '混載物',
          jwnet_code: 'MIX001',
        })
        await ItemMapRepository.create({
          org_id: 'demo-org-id',
          item_label: '蛍光灯',
          jwnet_code: 'FLU002',
        })
      }
    } catch (err) {
      console.warn('Failed to setup initial data:', err)
    }
  }

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 初期データのセットアップ
      await setupInitialData()
      
      // Repository層からデータを取得
      const [storesData, itemMapsData, plansData] = await Promise.all([
        StoreRepository.findMany(),
        ItemMapRepository.findMany(),
        PlanRepository.findMany()
      ])
      
      setStores(storesData)
      setItemMaps(itemMapsData)
      setPlans(plansData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError(`データの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 予定作成・更新
  const handleSubmit = async (values: PlanFormData) => {
    try {
      const planData = {
        org_id: 'demo-org-id',
        store_id: values.store_id,
        planned_pickup_date: values.planned_pickup_date,
        item_name: values.item_name,
        planned_quantity: values.planned_quantity,
        unit: values.unit,
        area_or_city: values.area_or_city || '',
        notes: values.notes || '',
        status: 'DRAFT' as const,
      }

      if (editingPlan) {
        await PlanRepository.update(editingPlan.id, planData)
        message.success('予定を更新しました')
      } else {
        await PlanRepository.create(planData)
        message.success('予定を作成しました')
      }
      
      setModalVisible(false)
      setEditingPlan(null)
      form.resetFields()
      fetchData()
    } catch (err) {
      console.error('Failed to save plan:', err)
      message.error('予定の保存に失敗しました')
    }
  }

  // 予定削除
  const handleDelete = async (id: string) => {
    try {
      await PlanRepository.delete(id)
      message.success('予定を削除しました')
      fetchData()
    } catch (err) {
      console.error('Failed to delete plan:', err)
      message.error('予定の削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (plan: any) => {
    setEditingPlan(plan)
    form.setFieldsValue(plan)
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingPlan(null)
    form.resetFields()
    setModalVisible(true)
  }

  // モーダルキャンセル
  const handleCancel = () => {
    setModalVisible(false)
    setEditingPlan(null)
    form.resetFields()
  }

  // CSV取り込み
  const handleCsvUpload = async (file: File) => {
    try {
      // モック実装
      message.success('CSVファイルをアップロードしました')
      return false // アップロードを防ぐ
    } catch (err) {
      console.error('Failed to upload CSV:', err)
      message.error('CSVファイルのアップロードに失敗しました')
      return false
    }
  }

  // エクセルファイルアップロード
  const handleExcelUpload = async (file: File) => {
    try {
      setExcelUploading(true)
      setExcelProgress(0)
      setExcelResult(null)

      // プログレスをシミュレート
      const progressInterval = setInterval(() => {
        setExcelProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // エクセルファイルを解析
      const result = await parseExcelToPlans(file)
      
      clearInterval(progressInterval)
      setExcelProgress(100)

      if (result.success) {
        setExcelResult(result)
        message.success(`${result.data.length}件のデータを読み込みました`)
        
        // エラーがある場合は警告を表示
        if (result.errors.length > 0) {
          message.warning(`${result.errors.length}件のエラーがあります`)
        }
        
        // 警告がある場合は情報を表示
        if (result.warnings.length > 0) {
          message.info(`${result.warnings.length}件の警告があります`)
        }
      } else {
        message.error('エクセルファイルの解析に失敗しました')
        setExcelResult(result)
      }
    } catch (err) {
      console.error('Failed to upload Excel:', err)
      message.error('エクセルファイルのアップロードに失敗しました')
    } finally {
      setExcelUploading(false)
    }
  }

  // エクセルデータを保存
  const handleSaveExcelData = async () => {
    if (!excelResult || !excelResult.success) return

    try {
      setExcelUploading(true)
      
      // 重複チェックを実行
      const duplicateResults = checkMultiplePlansDuplicate(
        excelResult.data,
        plans,
        duplicateCheckConfig
      )
      
      // 重複があるかチェック
      const duplicatePlans = duplicateResults.filter(r => r.result.isDuplicate)
      
      if (duplicatePlans.length > 0) {
        setDuplicateCheckResults(duplicateResults)
        setShowDuplicateDetails(true)
        
        const summary = generateDuplicateSummary(duplicateResults)
        message.warning(
          `${summary.duplicatePlans}件の重複データが検出されました。詳細を確認してください。`
        )
        return
      }
      
      // Repository層を使用してデータを保存
      const savedPlans = []
      for (const planData of excelResult.data) {
        const savedPlan = await PlanRepository.create(planData)
        savedPlans.push(savedPlan)
      }
      
      // データを既存のplansに追加
      setPlans(prev => [...prev, ...savedPlans])
      
      message.success(`${savedPlans.length}件のデータを保存しました`)
      setIsExcelModalVisible(false)
      setExcelResult(null)
      setExcelProgress(0)
    } catch (err) {
      console.error('Failed to save Excel data:', err)
      message.error('データの保存に失敗しました')
    } finally {
      setExcelUploading(false)
    }
  }

  // エクセルテンプレートをダウンロード
  const handleDownloadTemplate = () => {
    generateExcelTemplate()
    message.success('テンプレートファイルをダウンロードしました')
  }

  // 店舗物品管理エクセルファイルアップロード
  const handleStoreItemsUpload = async (file: File) => {
    try {
      setStoreItemsUploading(true)
      setStoreItemsProgress(0)
      setStoreItemsResult(null)

      // プログレスをシミュレート
      const progressInterval = setInterval(() => {
        setStoreItemsProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // 店舗物品管理エクセルファイルを解析
      const result = await parseStoreItemsExcelToPlans(file, pickupDate)
      
      clearInterval(progressInterval)
      setStoreItemsProgress(100)

      if (result.success) {
        setStoreItemsResult(result)
        message.success(`${result.data.length}件のデータを読み込みました`)
        
        // 店舗情報の抽出結果を表示
        if (result.stores && result.stores.length > 0) {
          message.info(`${result.stores.length}件の店舗情報を抽出しました`)
        }
        
        // エラーがある場合は警告を表示
        if (result.errors.length > 0) {
          message.warning(`${result.errors.length}件のエラーがあります`)
        }
        
        // 警告がある場合は情報を表示
        if (result.warnings.length > 0) {
          message.info(`${result.warnings.length}件の警告があります`)
        }
      } else {
        message.error('店舗物品管理エクセルファイルの解析に失敗しました')
        setStoreItemsResult(result)
      }
    } catch (err) {
      console.error('Failed to upload Store Items Excel:', err)
      message.error('店舗物品管理エクセルファイルのアップロードに失敗しました')
    } finally {
      setStoreItemsUploading(false)
    }
  }

  // 店舗物品管理データを保存
  const handleSaveStoreItemsData = async () => {
    if (!storeItemsResult || !storeItemsResult.success) return

    try {
      setStoreItemsUploading(true)
      
      // 重複チェックを実行
      const duplicateResults = checkMultiplePlansDuplicate(
        storeItemsResult.data,
        plans,
        duplicateCheckConfig
      )
      
      // 重複があるかチェック
      const duplicatePlans = duplicateResults.filter(r => r.result.isDuplicate)
      
      if (duplicatePlans.length > 0) {
        setDuplicateCheckResults(duplicateResults)
        setShowDuplicateDetails(true)
        
        const summary = generateDuplicateSummary(duplicateResults)
        message.warning(
          `${summary.duplicatePlans}件の重複データが検出されました。詳細を確認してください。`
        )
        return
      }
      
      // Repository層を使用してデータを保存
      const savedPlans = []
      for (const planData of storeItemsResult.data) {
        const savedPlan = await PlanRepository.create(planData)
        savedPlans.push(savedPlan)
      }
      
      // 店舗情報をマスターテーブルに登録する場合
      if (registerStores && storeItemsResult.stores) {
        let registeredCount = 0
        for (const storeData of storeItemsResult.stores) {
          try {
            await StoreRepository.create(storeData)
            registeredCount++
          } catch (err) {
            console.warn('Store registration failed:', err)
            // 店舗登録失敗は警告のみ（重複等の可能性）
          }
        }
        
        if (registeredCount > 0) {
          message.success(`${registeredCount}件の店舗情報を登録しました`)
        }
      }
      
      // データを既存のplansに追加
      setPlans(prev => [...prev, ...savedPlans])
      
      message.success(`${savedPlans.length}件のデータを保存しました`)
      setIsStoreItemsModalVisible(false)
      setStoreItemsResult(null)
      setStoreItemsProgress(0)
    } catch (err) {
      console.error('Failed to save Store Items data:', err)
      message.error('データの保存に失敗しました')
    } finally {
      setStoreItemsUploading(false)
    }
  }

  // 店舗物品管理テンプレートをダウンロード
  const handleDownloadStoreItemsTemplate = () => {
    generateStoreItemsTemplate()
    message.success('店舗物品管理テンプレートファイルをダウンロードしました')
  }

  // 自動依頼生成
  const handleGenerateRequests = async () => {
    try {
      setIsGeneratingRequests(true)
      
      const result = await generateCollectionRequestsFromPlans(plans)
      
      if (result.success) {
        message.success(`${result.generated}件の廃棄依頼を生成しました`)
        
        if (result.warnings.length > 0) {
          message.warning(`${result.warnings.length}件の警告があります`)
          console.warn('Auto request generation warnings:', result.warnings)
        }
      } else {
        message.error('自動依頼生成に失敗しました')
        console.error('Auto request generation errors:', result.errors)
      }
    } catch (err) {
      console.error('Failed to generate requests:', err)
      message.error('自動依頼生成に失敗しました')
    } finally {
      setIsGeneratingRequests(false)
    }
  }

  // データクリア確認モーダルを開く
  const handleClearDataClick = () => {
    setClearDataModalVisible(true)
  }

  // データクリア実行
  const handleClearData = async () => {
    try {
      setIsClearingData(true)
      
      // すべての予定データを削除
      const allPlans = await PlanRepository.findMany()
      for (const plan of allPlans) {
        await PlanRepository.delete(plan.id)
      }
      
      // 店舗データも削除（テスト用）
      const allStores = await StoreRepository.findMany()
      for (const store of allStores) {
        await StoreRepository.delete(store.id)
      }
      
      // 収集業者データも削除（テスト用）
      const allCollectors = await CollectorRepository.findMany()
      for (const collector of allCollectors) {
        await CollectorRepository.delete(collector.id)
      }
      
      // 店舗-収集業者割り当てデータも削除（テスト用）
      const allAssignments = await StoreCollectorAssignmentRepository.findMany()
      for (const assignment of allAssignments) {
        await StoreCollectorAssignmentRepository.delete(assignment.id)
      }
      
      // 廃棄依頼データも削除（テスト用）
      const allRequests = await CollectionRequestRepository.findMany()
      for (const request of allRequests) {
        await CollectionRequestRepository.delete(request.id)
      }
      
      // 収集実績データも削除（テスト用）
      const allCollections = await CollectionRepository.findMany()
      for (const collection of allCollections) {
        await CollectionRepository.delete(collection.id)
      }
      
      // データを再読み込み
      await fetchData()
      
      message.success('すべてのテストデータを削除しました')
      setClearDataModalVisible(false)
    } catch (err) {
      console.error('Failed to clear data:', err)
      message.error('データの削除に失敗しました')
    } finally {
      setIsClearingData(false)
    }
  }

  // データクリアキャンセル
  const handleClearDataCancel = () => {
    setClearDataModalVisible(false)
  }

  // 重複チェック詳細を閉じる
  const handleCloseDuplicateDetails = () => {
    setShowDuplicateDetails(false)
    setDuplicateCheckResults([])
  }

  // 重複を無視して保存
  const handleSaveIgnoringDuplicates = async () => {
    try {
      setExcelUploading(true)
      
      // 重複していないデータのみを保存
      const validResults = duplicateCheckResults.filter(r => !r.result.isDuplicate)
      const validPlans = validResults.map(r => r.plan)
      
      // Repository層を使用してデータを保存
      const savedPlans = []
      for (const planData of validPlans) {
        const savedPlan = await PlanRepository.create(planData)
        savedPlans.push(savedPlan)
      }
      
      // データを既存のplansに追加
      setPlans(prev => [...prev, ...savedPlans])
      
      const summary = generateDuplicateSummary(duplicateCheckResults)
      message.success(
        `${savedPlans.length}件のデータを保存しました（${summary.duplicatePlans}件の重複データはスキップされました）`
      )
      
      setShowDuplicateDetails(false)
      setDuplicateCheckResults([])
      setIsExcelModalVisible(false)
      setExcelResult(null)
      setExcelProgress(0)
    } catch (err) {
      console.error('Failed to save data:', err)
      message.error('データの保存に失敗しました')
    } finally {
      setExcelUploading(false)
    }
  }

  // テストデータ生成
  const handleGenerateTestData = async () => {
    try {
      setIsGeneratingTestData(true)
      await testDataManager.generateDemoScenario()
      message.success('デモ用テストデータの生成が完了しました')
      await fetchData()
    } catch (error) {
      console.error('テストデータ生成に失敗しました:', error)
      message.error('テストデータ生成に失敗しました')
    } finally {
      setIsGeneratingTestData(false)
    }
  }

  // テーブル列定義
  const columns = [
    {
      title: '店舗',
      dataIndex: 'store_id',
      key: 'store_id',
      render: (storeId: string) => {
        const store = stores.find(s => s.id === storeId)
        return store ? store.name : storeId
      },
    },
    {
      title: '予定日',
      dataIndex: 'planned_pickup_date',
      key: 'planned_pickup_date',
    },
    {
      title: '品目',
      dataIndex: 'item_name',
      key: 'item_name',
    },
    {
      title: '数量',
      dataIndex: 'planned_quantity',
      key: 'planned_quantity',
      render: (qty: number, record: any) => `${qty} ${record.unit}`,
    },
    {
      title: 'エリア',
      dataIndex: 'area_or_city',
      key: 'area_or_city',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'DRAFT' ? 'blue' : 'green'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '作成日',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="この予定を削除しますか？"
            description="削除した予定は復元できません。"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="center" style={{ height: '400px' }}>
        <Spin size="large" />
        <span className="ml-2">データを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="エラー"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchData}>
            再試行
          </Button>
        }
      />
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダーセクション */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Title level={2} className="!mb-1 !text-gray-900">
                予定管理
              </Title>
              <p className="text-gray-600 text-sm">
                廃棄物回収の予定を管理します
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchData}
                className="flex items-center"
              >
                更新
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleCreate}
                className="flex items-center"
              >
                新規作成
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-6">
        {/* アクションボタンセクション */}
        <div className="mb-6">
          <Card className="shadow-sm">
            <div className="p-4">
              <div className="flex flex-wrap gap-3">
                {/* 取り込みボタングループ */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-gray-700 self-center mr-2">取り込み:</span>
                  <Upload
                    accept=".csv"
                    beforeUpload={handleCsvUpload}
                    showUploadList={false}
                  >
                    <Button icon={<UploadOutlined />} size="small">
                      CSV
                    </Button>
                  </Upload>
                  <Button 
                    icon={<FileExcelOutlined />}
                    onClick={() => setIsExcelModalVisible(true)}
                    size="small"
                  >
                    エクセル
                  </Button>
                  <Button 
                    icon={<FileExcelOutlined />}
                    onClick={() => setIsStoreItemsModalVisible(true)}
                    size="small"
                    className="bg-green-500 hover:bg-green-600 border-green-500 hover:border-green-600 text-white"
                  >
                    店舗物品管理
                  </Button>
                </div>

                {/* テンプレートボタングループ */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm font-medium text-gray-700 self-center mr-2">テンプレート:</span>
                  <Button 
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadTemplate}
                    size="small"
                  >
                    エクセル
                  </Button>
                  <Button 
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadStoreItemsTemplate}
                    size="small"
                    className="bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600 text-white"
                  >
                    店舗物品管理
                  </Button>
                </div>

                {/* その他ボタングループ */}
                <div className="flex flex-wrap gap-2">
                  <Button 
                    icon={<DatabaseOutlined />} 
                    onClick={handleGenerateTestData}
                    loading={isGeneratingTestData}
                    size="small"
                    className="bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-white"
                  >
                    デモデータ生成
                  </Button>
                  <Button 
                    icon={<SendOutlined />} 
                    onClick={handleGenerateRequests}
                    loading={isGeneratingRequests}
                    size="small"
                    className="bg-purple-500 hover:bg-purple-600 border-purple-500 hover:border-purple-600 text-white"
                  >
                    自動依頼生成
                  </Button>
                  <Button 
                    icon={<DownloadOutlined />}
                    size="small"
                  >
                    CSV出力
                  </Button>
                  <Button 
                    icon={<ClearOutlined />}
                    onClick={handleClearDataClick}
                    danger
                    size="small"
                  >
                    テストデータクリア
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 統計カード */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="総予定数"
                value={plans.length}
                prefix={<CalendarOutlined className="text-blue-500" />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="今月の予定"
                value={plans.filter(p => p.planned_pickup_date && p.planned_pickup_date.startsWith('2025-09')).length}
                prefix={<CalendarOutlined className="text-green-500" />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="今週の予定"
                value={plans.filter(p => {
                  const date = new Date(p.planned_pickup_date)
                  const now = new Date()
                  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
                  const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6))
                  return date >= weekStart && date <= weekEnd
                }).length}
                prefix={<CalendarOutlined className="text-orange-500" />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="完了済み"
                value={plans.filter(p => p.status === 'COMPLETED').length}
                prefix={<CalendarOutlined className="text-purple-500" />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 予定一覧テーブル */}
        <Card className="shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900 mb-0">予定一覧</h3>
          </div>
          <Table
            columns={columns}
            dataSource={plans}
            rowKey="id"
            className="custom-table"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} / ${total}件`,
              className: "px-4 py-2"
            }}
            rowClassName={(record, index) => 
              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            }
          />
        </Card>
      </div>

      {/* 予定作成・編集モーダル */}
      <Modal
        title={editingPlan ? '予定編集' : '新規予定作成'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="store_id"
                label="店舗"
                rules={[
                  { required: true, message: '店舗を選択してください' },
                ]}
              >
                <Select placeholder="店舗を選択してください">
                  {stores.map(store => (
                    <Option key={store.id} value={store.id}>
                      {store.name} ({store.store_code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="planned_pickup_date"
                label="予定日"
                rules={[
                  { required: true, message: '予定日を選択してください' },
                ]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="item_name"
                label="品目"
                rules={[
                  { required: true, message: '品目を入力してください' },
                ]}
              >
                <Input placeholder="品目名を入力してください" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="planned_quantity"
                label="数量"
                rules={[
                  { required: true, message: '数量を入力してください' },
                  { type: 'number', min: 0, message: '数量は0以上で入力してください' },
                ]}
              >
                <InputNumber
                  placeholder="数量"
                  min={0}
                  step={0.1}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="unit"
                label="単位"
                rules={[
                  { required: true, message: '単位を選択してください' },
                ]}
              >
                <Select placeholder="単位">
                  <Option value="T">T（トン）</Option>
                  <Option value="KG">KG（キログラム）</Option>
                  <Option value="M3">M3（立方メートル）</Option>
                  <Option value="L">L（リットル）</Option>
                  <Option value="PCS">PCS（個）</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="area_or_city"
                label="エリア"
              >
                <Input placeholder="エリア名を入力してください" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="notes"
                label="備考"
              >
                <Input placeholder="備考を入力してください" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                {editingPlan ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* エクセルアップロードモーダル */}
      <Modal
        title="エクセルファイル取り込み"
        open={isExcelModalVisible}
        onCancel={() => {
          setIsExcelModalVisible(false)
          setExcelResult(null)
          setExcelProgress(0)
        }}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setIsExcelModalVisible(false)}>
            キャンセル
          </Button>,
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
          >
            テンプレートダウンロード
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={excelUploading}
            disabled={!excelResult || !excelResult.success}
            onClick={handleSaveExcelData}
          >
            データを保存
          </Button>,
        ]}
      >
        <div className="space-y-4">
          {/* ファイルアップロードエリア */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload
              accept=".xlsx,.xls"
              beforeUpload={handleExcelUpload}
              showUploadList={false}
              disabled={excelUploading}
            >
              <div className="space-y-2">
                <FileExcelOutlined className="text-4xl text-blue-500" />
                <div className="text-lg font-medium">
                  {excelUploading ? '処理中...' : 'エクセルファイルを選択'}
                </div>
                <div className="text-sm text-gray-500">
                  .xlsx または .xls ファイルをアップロードしてください
                </div>
              </div>
            </Upload>
          </div>

          {/* プログレスバー */}
          {excelUploading && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">ファイルを解析中...</div>
              <Progress percent={excelProgress} status="active" />
            </div>
          )}

          {/* 結果表示 */}
          {excelResult && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium mb-2">解析結果</div>
                <div className="space-y-1 text-sm">
                  <div>読み込み件数: {excelResult.data.length}件</div>
                  {excelResult.errors.length > 0 && (
                    <div className="text-red-600">
                      エラー: {excelResult.errors.length}件
                    </div>
                  )}
                  {excelResult.warnings.length > 0 && (
                    <div className="text-yellow-600">
                      警告: {excelResult.warnings.length}件
                    </div>
                  )}
                </div>
              </div>

              {/* エラー詳細 */}
              {excelResult.errors.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="font-medium text-red-800 mb-2">エラー詳細</div>
                  <div className="space-y-1 text-sm text-red-700 max-h-32 overflow-y-auto">
                    {excelResult.errors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* 警告詳細 */}
              {excelResult.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="font-medium text-yellow-800 mb-2">警告詳細</div>
                  <div className="space-y-1 text-sm text-yellow-700 max-h-32 overflow-y-auto">
                    {excelResult.warnings.map((warning, index) => (
                      <div key={index}>• {warning}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* プレビューテーブル */}
              {excelResult.success && excelResult.data.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium">データプレビュー（最初の5件）</div>
                  <Table
                    dataSource={excelResult.data.slice(0, 5)}
                    columns={[
                      { title: '店舗名', dataIndex: 'item_name', key: 'item_name' },
                      { title: '数量', dataIndex: 'planned_quantity', key: 'planned_quantity' },
                      { title: '単位', dataIndex: 'unit', key: 'unit' },
                      { title: '回収日', dataIndex: 'planned_pickup_date', key: 'planned_pickup_date' },
                    ]}
                    pagination={false}
                    size="small"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* 店舗物品管理アップロードモーダル */}
      <Modal
        title="店舗物品管理エクセルファイル取り込み"
        open={isStoreItemsModalVisible}
        onCancel={() => {
          setIsStoreItemsModalVisible(false)
          setStoreItemsResult(null)
          setStoreItemsProgress(0)
        }}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setIsStoreItemsModalVisible(false)}>
            キャンセル
          </Button>,
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={handleDownloadStoreItemsTemplate}
          >
            テンプレートダウンロード
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={storeItemsUploading}
            disabled={!storeItemsResult || !storeItemsResult.success}
            onClick={handleSaveStoreItemsData}
          >
            データを保存
          </Button>,
        ]}
      >
        <div className="space-y-4">
          {/* 回収日設定 */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="font-medium mb-2">回収日設定</div>
            <DatePicker
              value={pickupDate ? new Date(pickupDate) : null}
              onChange={(date) => setPickupDate(date ? dayjs(date).format('YYYY-MM-DD') : '')}
              placeholder="回収日を選択してください"
              style={{ width: '100%' }}
            />
            <div className="text-sm text-gray-600 mt-1">
              未設定の場合は今日の日付が使用されます
            </div>
          </div>

          {/* 拠点情報登録設定 */}
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="font-medium mb-2">拠点情報登録設定</div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="registerStores"
                checked={registerStores}
                onChange={(e) => setRegisterStores(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="registerStores" className="text-sm">
                店舗情報をマスターテーブルに自動登録する
              </label>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              チェックすると、エクセルデータから抽出した店舗情報（店舗番号、エリアコード、店舗名、エリア名）が自動的に拠点マスターテーブルに登録されます
            </div>
          </div>

          {/* ファイルアップロードエリア */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload
              accept=".xlsx,.xls"
              beforeUpload={handleStoreItemsUpload}
              showUploadList={false}
              disabled={storeItemsUploading}
            >
              <div className="space-y-2">
                <FileExcelOutlined className="text-4xl text-green-500" />
                <div className="text-lg font-medium">
                  {storeItemsUploading ? '処理中...' : '店舗物品管理エクセルファイルを選択'}
                </div>
                <div className="text-sm text-gray-500">
                  .xlsx または .xls ファイルをアップロードしてください
                </div>
                <div className="text-xs text-gray-400">
                  対応形式: 店舗番号、店舗名、舗名、混載物、蛍光灯、テスター等の列を含むファイル
                </div>
              </div>
            </Upload>
          </div>

          {/* プログレスバー */}
          {storeItemsUploading && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">ファイルを解析中...</div>
              <Progress percent={storeItemsProgress} status="active" />
            </div>
          )}

          {/* 結果表示 */}
          {storeItemsResult && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium mb-2">解析結果</div>
                <div className="space-y-1 text-sm">
                  <div>読み込み件数: {storeItemsResult.data.length}件</div>
                  {storeItemsResult.errors.length > 0 && (
                    <div className="text-red-600">
                      エラー: {storeItemsResult.errors.length}件
                    </div>
                  )}
                  {storeItemsResult.warnings.length > 0 && (
                    <div className="text-yellow-600">
                      警告: {storeItemsResult.warnings.length}件
                    </div>
                  )}
                </div>
              </div>

              {/* エラー詳細 */}
              {storeItemsResult.errors.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="font-medium text-red-800 mb-2">エラー詳細</div>
                  <div className="space-y-1 text-sm text-red-700 max-h-32 overflow-y-auto">
                    {storeItemsResult.errors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* 警告詳細 */}
              {storeItemsResult.warnings.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="font-medium text-yellow-800 mb-2">警告詳細</div>
                  <div className="space-y-1 text-sm text-yellow-700 max-h-32 overflow-y-auto">
                    {storeItemsResult.warnings.map((warning, index) => (
                      <div key={index}>• {warning}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* 店舗情報プレビュー */}
              {storeItemsResult.stores && storeItemsResult.stores.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium">店舗情報プレビュー（抽出された拠点情報）</div>
                  <Table
                    dataSource={storeItemsResult.stores.slice(0, 10)}
                    columns={[
                      { title: '店舗番号', dataIndex: 'storeNumber', key: 'storeNumber' },
                      { title: 'エリアコード', dataIndex: 'areaCode', key: 'areaCode' },
                      { title: '店舗名', dataIndex: 'storeName', key: 'storeName' },
                      { title: 'エリア名', dataIndex: 'areaName', key: 'areaName' },
                    ]}
                    pagination={false}
                    size="small"
                  />
                </div>
              )}

              {/* プレビューテーブル */}
              {storeItemsResult.success && storeItemsResult.data.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium">予約データプレビュー（最初の10件）</div>
                  <Table
                    dataSource={storeItemsResult.data.slice(0, 10)}
                    columns={[
                      { title: '品目名', dataIndex: 'item_name', key: 'item_name' },
                      { title: '数量', dataIndex: 'planned_quantity', key: 'planned_quantity' },
                      { title: '単位', dataIndex: 'unit', key: 'unit' },
                      { title: '回収日', dataIndex: 'planned_pickup_date', key: 'planned_pickup_date' },
                      { title: '備考', dataIndex: 'notes', key: 'notes' },
                    ]}
                    pagination={false}
                    size="small"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* データクリア確認モーダル */}
      <Modal
        title={
          <div className="flex items-center space-x-2">
            <ExclamationCircleOutlined className="text-red-500" />
            <span>テストデータクリア確認</span>
          </div>
        }
        open={clearDataModalVisible}
        onOk={handleClearData}
        onCancel={handleClearDataCancel}
        okText="削除実行"
        cancelText="キャンセル"
        okButtonProps={{ 
          danger: true, 
          loading: isClearingData 
        }}
        cancelButtonProps={{ disabled: isClearingData }}
        width={500}
      >
        <div className="space-y-4">
          <Alert
            message="警告"
            description="この操作は取り消すことができません"
            type="warning"
            showIcon
          />
          
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="font-medium text-red-800 mb-2">削除されるデータ</div>
            <div className="space-y-1 text-sm text-red-700">
              <div>• すべての予定データ</div>
              <div>• すべての店舗データ</div>
              <div>• すべての収集業者データ</div>
              <div>• すべての店舗-収集業者割り当てデータ</div>
              <div>• すべての廃棄依頼データ</div>
              <div>• すべての収集実績データ</div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            テスト段階でのみ使用してください。本番環境では使用しないでください。
          </div>
        </div>
      </Modal>

      {/* 重複チェック詳細モーダル */}
      <Modal
        title="重複チェック結果"
        open={showDuplicateDetails}
        onCancel={handleCloseDuplicateDetails}
        width={800}
        footer={[
          <Button key="cancel" onClick={handleCloseDuplicateDetails}>
            キャンセル
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            onClick={handleSaveIgnoringDuplicates}
            loading={excelUploading}
          >
            重複をスキップして保存
          </Button>,
        ]}
      >
        <div className="space-y-4">
          {duplicateCheckResults.length > 0 && (
            <>
              <Alert
                message="重複データが検出されました"
                description="以下のデータは既存のデータと重複しています。重複をスキップして保存するか、データを修正してください。"
                type="warning"
                showIcon
              />
              
              <div className="max-h-96 overflow-y-auto">
                <Table
                  dataSource={duplicateCheckResults.map((result, index) => ({
                    key: index,
                    index: index + 1,
                    ...result.plan,
                    isDuplicate: result.result.isDuplicate,
                    duplicateReasons: result.result.duplicateReasons.join('・'),
                    duplicateCount: result.result.duplicatePlans.length,
                  }))}
                  columns={[
                    {
                      title: 'No',
                      dataIndex: 'index',
                      key: 'index',
                      width: 60,
                    },
                    {
                      title: '店舗',
                      dataIndex: 'store_id',
                      key: 'store_id',
                      render: (storeId: string) => {
                        const store = stores.find(s => s.id === storeId)
                        return store ? store.name : storeId
                      },
                    },
                    {
                      title: '予定日',
                      dataIndex: 'planned_pickup_date',
                      key: 'planned_pickup_date',
                      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
                    },
                    {
                      title: '品目',
                      dataIndex: 'item_name',
                      key: 'item_name',
                    },
                    {
                      title: '数量',
                      dataIndex: 'planned_quantity',
                      key: 'planned_quantity',
                      render: (qty: number, record: any) => `${qty} ${record.unit}`,
                    },
                    {
                      title: '重複理由',
                      dataIndex: 'duplicateReasons',
                      key: 'duplicateReasons',
                      render: (reasons: string, record: any) => (
                        <div>
                          <Tag color={record.isDuplicate ? 'red' : 'green'}>
                            {record.isDuplicate ? '重複' : 'OK'}
                          </Tag>
                          {record.isDuplicate && (
                            <div className="text-xs text-gray-500 mt-1">
                              {reasons} ({record.duplicateCount}件)
                            </div>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium mb-2">重複チェック設定</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={duplicateCheckConfig.checkSameMonth}
                      onChange={(e) => setDuplicateCheckConfig(prev => ({
                        ...prev,
                        checkSameMonth: e.target.checked
                      }))}
                    />
                    <span>同じ月</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={duplicateCheckConfig.checkSameStore}
                      onChange={(e) => setDuplicateCheckConfig(prev => ({
                        ...prev,
                        checkSameStore: e.target.checked
                      }))}
                    />
                    <span>同じ店舗</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={duplicateCheckConfig.checkSameItem}
                      onChange={(e) => setDuplicateCheckConfig(prev => ({
                        ...prev,
                        checkSameItem: e.target.checked
                      }))}
                    />
                    <span>同じ品目</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default Plans

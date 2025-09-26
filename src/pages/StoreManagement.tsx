import React, { useState, useEffect } from 'react'
import { 
  Card, Table, Button, Space, Tag, Modal, 
  Form, Input, DatePicker, message, Upload, 
  Typography, Row, Col, Statistic, Alert,
  Tooltip, Popconfirm, Steps, Divider,
  Switch, Select, Progress, Badge
} from 'antd'
import { 
  ShopOutlined, UploadOutlined, DownloadOutlined, 
  PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, FileExcelOutlined, 
  CheckCircleOutlined, ExclamationCircleOutlined,
  ClockCircleOutlined, EyeOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { StoreRepository } from '@/modules/stores/repository'
import { StoreCsvImporter, StoreImportResult, StorePreviewData } from '@/utils/store-csv-importer'
import StoreImportPreview from '@/components/StoreImportPreview'
import type { Store } from '@contracts/v0/schema'

const { Title, Text } = Typography
const { Option } = Select
const { Step } = Steps

// ============================================================================
// 店舗管理画面
// ============================================================================

const StoreManagement: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [form] = Form.useForm()
  
  // CSV取り込み関連
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<StoreImportResult | null>(null)
  const [previewData, setPreviewData] = useState<StorePreviewData | null>(null)
  const [importStep, setImportStep] = useState(0)
  const [importOptions, setImportOptions] = useState({
    updateExisting: true,
    deleteMissing: false,
    openingDate: '',
    closingDate: ''
  })

  const storeCsvImporter = new StoreCsvImporter(StoreRepository)

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      const storesData = await StoreRepository.findMany()
      setStores(storesData)
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

  // ステータス表示
  const getStatusTag = (store: Store) => {
    const now = dayjs()
    const openingDate = store.opening_date ? dayjs(store.opening_date) : null
    const closingDate = store.closing_date ? dayjs(store.closing_date) : null

    if (!store.is_active) {
      return <Tag color="red">非アクティブ</Tag>
    }

    if (openingDate && openingDate.isAfter(now)) {
      return <Tag color="orange">開店予定</Tag>
    }

    if (closingDate && closingDate.isBefore(now)) {
      return <Tag color="red">閉店済み</Tag>
    }

    if (closingDate && closingDate.isAfter(now)) {
      return <Tag color="blue">閉店予定</Tag>
    }

    return <Tag color="green">営業中</Tag>
  }

  // 列定義
  const columns = [
    {
      title: '店舗番号',
      dataIndex: 'store_code',
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
      dataIndex: 'area_manager_code',
      key: 'area_manager_code',
      width: 120,
      render: (code: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {code || '-'}
        </Text>
      )
    },
    {
      title: '店舗名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: '舗名',
      dataIndex: 'area_name',
      key: 'area_name',
      render: (areaName: string) => areaName || '-'
    },
    {
      title: '開店予定日',
      dataIndex: 'opening_date',
      key: 'opening_date',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY/MM/DD') : '-'
    },
    {
      title: '閉店予定日',
      dataIndex: 'closing_date',
      key: 'closing_date',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY/MM/DD') : '-'
    },
    {
      title: 'ステータス',
      key: 'status',
      width: 120,
      render: (_, record: Store) => getStatusTag(record)
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: Store) => (
        <Space size="small">
          <Tooltip title="編集">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="この店舗を削除しますか？"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Tooltip title="削除">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  // 編集処理
  const handleEdit = (store: Store) => {
    setEditingStore(store)
    form.setFieldsValue({
      ...store,
      opening_date: store.opening_date ? dayjs(store.opening_date) : null,
      closing_date: store.closing_date ? dayjs(store.closing_date) : null
    })
    setIsModalVisible(true)
  }

  // 削除処理
  const handleDelete = async (id: string) => {
    try {
      await StoreRepository.delete(id)
      message.success('店舗を削除しました')
      fetchData()
    } catch (error) {
      console.error('削除エラー:', error)
      message.error('削除に失敗しました')
    }
  }

  // モーダル保存処理
  const handleModalSave = async () => {
    try {
      const values = await form.validateFields()
      const storeData = {
        ...values,
        opening_date: values.opening_date?.format('YYYY-MM-DD'),
        closing_date: values.closing_date?.format('YYYY-MM-DD')
      }

      if (editingStore) {
        await StoreRepository.update(editingStore.id, storeData)
        message.success('店舗を更新しました')
      } else {
        await StoreRepository.create(storeData)
        message.success('店舗を作成しました')
      }

      setIsModalVisible(false)
      setEditingStore(null)
      form.resetFields()
      fetchData()
    } catch (error) {
      console.error('保存エラー:', error)
      message.error('保存に失敗しました')
    }
  }

  // CSVファイルアップロード処理
  const handleCsvUpload = (file: File) => {
    setCsvFile(file)
    setImportStep(1)
    return false // アップロードを停止
  }

  // CSVプレビュー生成
  const handleGeneratePreview = async () => {
    if (!csvFile) return

    try {
      setLoading(true)
      const csvRows = await storeCsvImporter.parseCsvFile(csvFile)
      const preview = await storeCsvImporter.generatePreview(csvRows, importOptions)
      
      setPreviewData(preview)
      setImportStep(2)
    } catch (error) {
      console.error('プレビュー生成エラー:', error)
      message.error('プレビューの生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // CSV取り込み実行
  const handleImportCsv = async () => {
    if (!csvFile || !previewData) return

    try {
      setLoading(true)
      const csvRows = await storeCsvImporter.parseCsvFile(csvFile)
      const result = await storeCsvImporter.importStores(csvRows, importOptions)
      
      setImportResult(result)
      setImportStep(3)
      
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
    const template = storeCsvImporter.generateTemplate()
    const url = URL.createObjectURL(template)
    const link = document.createElement('a')
    link.href = url
    link.download = `店舗データテンプレート_${dayjs().format('YYYYMMDD')}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 統計情報
  const stats = {
    total: stores.length,
    active: stores.filter(s => s.is_active).length,
    openingSoon: stores.filter(s => s.opening_date && dayjs(s.opening_date).isAfter(dayjs())).length,
    closingSoon: stores.filter(s => s.closing_date && dayjs(s.closing_date).isAfter(dayjs())).length
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <ShopOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  店舗管理
                </Title>
                <Text type="secondary">
                  店舗情報の管理とCSV取り込み
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
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
              >
                テンプレート
              </Button>
              <Button 
                type="primary" 
                icon={<UploadOutlined />}
                onClick={() => setImportStep(0)}
              >
                CSV取り込み
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingStore(null)
                  form.resetFields()
                  setIsModalVisible(true)
                }}
              >
                新規店舗
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
              title="総店舗数"
              value={stats.total}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="アクティブ"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="開店予定"
              value={stats.openingSoon}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="閉店予定"
              value={stats.closingSoon}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* CSV取り込みモーダル */}
      <Modal
        title="CSV取り込み"
        open={importStep > 0}
        onCancel={() => {
          setImportStep(0)
          setCsvFile(null)
          setImportResult(null)
        }}
        footer={null}
        width={800}
      >
        <Steps current={importStep} style={{ marginBottom: '24px' }}>
          <Step title="ファイル選択" />
          <Step title="オプション設定" />
          <Step title="プレビュー確認" />
          <Step title="完了" />
        </Steps>

        {importStep === 0 && (
          <div>
            <Alert
              message="CSVファイルを選択してください"
              description="店舗データのCSVファイルをアップロードして取り込みを行います。"
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
              message="取り込みオプションを設定してください"
              description="既存データの更新や削除の設定を行います。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Form layout="vertical">
              <Form.Item label="既存店舗の更新">
                <Switch
                  checked={importOptions.updateExisting}
                  onChange={(checked) => setImportOptions({ ...importOptions, updateExisting: checked })}
                />
                <Text type="secondary" style={{ marginLeft: '8px' }}>
                  既存の店舗情報を更新します
                </Text>
              </Form.Item>

              <Form.Item label="存在しない店舗の削除">
                <Switch
                  checked={importOptions.deleteMissing}
                  onChange={(checked) => setImportOptions({ ...importOptions, deleteMissing: checked })}
                />
                <Text type="secondary" style={{ marginLeft: '8px' }}>
                  CSVに存在しない店舗を削除します（注意：既存データが失われる可能性があります）
                </Text>
              </Form.Item>

              <Form.Item label="新規店舗の開店予定日">
                <DatePicker
                  style={{ width: '100%' }}
                  value={importOptions.openingDate ? dayjs(importOptions.openingDate) : null}
                  onChange={(date) => setImportOptions({ 
                    ...importOptions, 
                    openingDate: date ? date.format('YYYY-MM-DD') : '' 
                  })}
                />
              </Form.Item>

              <Form.Item label="削除店舗の閉店予定日">
                <DatePicker
                  style={{ width: '100%' }}
                  value={importOptions.closingDate ? dayjs(importOptions.closingDate) : null}
                  onChange={(date) => setImportOptions({ 
                    ...importOptions, 
                    closingDate: date ? date.format('YYYY-MM-DD') : '' 
                  })}
                />
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <Space>
                <Button onClick={() => setImportStep(0)}>
                  戻る
                </Button>
                <Button type="primary" onClick={handleGeneratePreview} loading={loading}>
                  プレビュー生成
                </Button>
              </Space>
            </div>
          </div>
        )}

        {importStep === 2 && previewData && (
          <div>
            <StoreImportPreview
              previewData={previewData}
              onConfirm={handleImportCsv}
              onCancel={() => {
                setImportStep(0)
                setCsvFile(null)
                setPreviewData(null)
              }}
              loading={loading}
            />
          </div>
        )}

        {importStep === 3 && importResult && (
          <div>
            <Alert
              message={importResult.success ? '取り込み完了' : '取り込みエラー'}
              description={importResult.message}
              type={importResult.success ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={6}>
                <Statistic title="総件数" value={importResult.stats.total} />
              </Col>
              <Col span={6}>
                <Statistic title="新規" value={importResult.stats.new} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={6}>
                <Statistic title="更新" value={importResult.stats.updated} valueStyle={{ color: '#1890ff' }} />
              </Col>
              <Col span={6}>
                <Statistic title="削除" value={importResult.stats.deleted} valueStyle={{ color: '#ff4d4f' }} />
              </Col>
            </Row>

            {importResult.errors.length > 0 && (
              <Alert
                message="エラー詳細"
                description={
                  <div>
                    {importResult.errors.map((error, index) => (
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

            <div style={{ textAlign: 'right' }}>
              <Button type="primary" onClick={() => {
                setImportStep(0)
                setCsvFile(null)
                setImportResult(null)
                setPreviewData(null)
              }}>
                閉じる
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* メインコンテンツ */}
      <Card>
        <Table
          columns={columns}
          dataSource={stores}
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

      {/* 編集モーダル */}
      <Modal
        title={editingStore ? '店舗編集' : '新規店舗'}
        open={isModalVisible}
        onOk={handleModalSave}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingStore(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="store_code"
                label="店舗番号"
                rules={[
                  { required: true, message: '店舗番号を入力してください' },
                  { pattern: /^\d{5}$/, message: '店舗番号は5桁の数字である必要があります' }
                ]}
              >
                <Input placeholder="12345" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="area_manager_code"
                label="エリア長コード"
                rules={[
                  { required: true, message: 'エリア長コードを入力してください' },
                  { pattern: /^\d{8}$/, message: 'エリア長コードは8桁の数字である必要があります' }
                ]}
              >
                <Input placeholder="12345678" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="店舗名"
            rules={[{ required: true, message: '店舗名を入力してください' }]}
          >
            <Input placeholder="店舗名" />
          </Form.Item>

          <Form.Item
            name="area_name"
            label="舗名"
            rules={[{ required: true, message: '舗名を入力してください' }]}
          >
            <Input placeholder="東京都" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="opening_date"
                label="開店予定日"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="closing_date"
                label="閉店予定日"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            label="アクティブ"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="address"
            label="住所"
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default StoreManagement

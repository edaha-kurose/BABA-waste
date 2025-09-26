import React, { useState, useEffect } from 'react'
import { 
  Card, Table, Button, Space, Typography, Modal, Form, Input, 
  message, Tag, Upload, Alert, Row, Col, Statistic, Popconfirm,
  Tooltip, Divider
} from 'antd'
import { 
  ShopOutlined, PlusOutlined, EditOutlined, DeleteOutlined, 
  UploadOutlined, DownloadOutlined, ReloadOutlined, FileExcelOutlined
} from '@ant-design/icons'
import { StoreRepository } from '@/modules/stores/repository'
import { getOrgId } from '@/utils/data-backend'
import { resetDatabase } from '@/utils/dexie-db'
import type { Store, StoreCreate, StoreUpdate } from '@contracts/v0/schema'
import * as XLSX from 'xlsx'

const { Title, Text } = Typography

const ManagedStores: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isImportModalVisible, setIsImportModalVisible] = useState(false)
  const [form] = Form.useForm()

  // データベースリセット
  const handleResetDatabase = async () => {
    try {
      setLoading(true)
      await resetDatabase()
      message.success('データベースをリセットしました')
      await fetchStores()
    } catch (error) {
      console.error('データベースリセットエラー:', error)
      message.error('データベースのリセットに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // データ取得（管理店舗マスターのみ）
  const fetchStores = async () => {
    try {
      setLoading(true)
      const allStores = await StoreRepository.findMany()
      console.log('全店舗データ:', allStores)
      
      // is_managed=trueの店舗のみをフィルタリング
      const managedStores = allStores.filter(store => store.is_managed)
      console.log('管理店舗マスター:', managedStores)
      
      setStores(managedStores)
    } catch (error) {
      console.error('店舗取得エラー:', error)
      console.error('エラーの詳細:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      })
      message.error(`店舗データの取得に失敗しました: ${error?.message || '不明なエラー'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [])

  // 店舗作成・更新
  const handleSubmit = async (values: any) => {
    try {
      if (editingStore) {
        // 更新
        const updateData: StoreUpdate = {
          ...values,
          updated_by: 'user'
        }
        await StoreRepository.update(editingStore.id, updateData)
        message.success('店舗情報を更新しました')
      } else {
        // 作成
        const createData: StoreCreate = {
          ...values,
          org_id: getOrgId(),
          created_by: 'user',
          updated_by: 'user'
        }
        await StoreRepository.create(createData)
        message.success('店舗を登録しました')
      }
      
      setIsModalVisible(false)
      setEditingStore(null)
      form.resetFields()
      fetchStores()
    } catch (error) {
      console.error('店舗保存エラー:', error)
      message.error('店舗の保存に失敗しました')
    }
  }

  // 店舗削除
  const handleDelete = async (id: string) => {
    try {
      await StoreRepository.delete(id)
      message.success('店舗を削除しました')
      fetchStores()
    } catch (error) {
      console.error('店舗削除エラー:', error)
      message.error('店舗の削除に失敗しました')
    }
  }

  // 編集モーダルを開く
  const handleEdit = (store: Store) => {
    setEditingStore(store)
    form.setFieldsValue(store)
    setIsModalVisible(true)
  }

  // 新規作成モーダルを開く
  const handleCreate = () => {
    setEditingStore(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  // テンプレートダウンロード
  const downloadTemplate = () => {
    const templateData = [
      ['店舗番号', 'エリア長コード', '店舗名', '舗名', '電話番号', '郵便番号', '住所1', '住所2'],
      ['ST001', '12345678', 'サンプル店舗1', '東京都', '03-1234-5678', '100-0001', '東京都千代田区千代田', '1-1-1'],
      ['ST002', '87654321', 'サンプル店舗2', '大阪府', '06-1234-5678', '530-0001', '大阪府大阪市北区梅田', '2-2-2']
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '管理店舗マスター')
    
    XLSX.writeFile(workbook, '管理店舗マスター_テンプレート.xlsx')
  }

  // Excel取り込み
  const handleExcelUpload = async (file: File) => {
    try {
      const data = await new Promise<any[][]>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const workbook = XLSX.read(e.target?.result, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
            resolve(jsonData)
          } catch (error) {
            reject(error)
          }
        }
        reader.readAsBinaryString(file)
      })

      // ヘッダー行をスキップしてデータを処理
      const storesData: ManagedStoreCreate[] = []
      for (let i = 1; i < data.length; i++) {
        const row = data[i]
        if (row.length >= 4 && row[0] && row[1] && row[2] && row[3]) {
          storesData.push({
            org_id: 'default-org',
            store_code: String(row[0]).trim(),
            area_manager_code: String(row[1]).trim(),
            store_name: String(row[2]).trim(),
            area_name: String(row[3]).trim(),
            phone: row[4] ? String(row[4]).trim() : undefined,
            postal_code: row[5] ? String(row[5]).trim() : undefined,
            address1: row[6] ? String(row[6]).trim() : undefined,
            address2: row[7] ? String(row[7]).trim() : undefined,
            created_by: 'user',
            updated_by: 'user'
          })
        }
      }

      if (storesData.length > 0) {
        await ManagedStoreRepository.batchCreate(storesData.map(s=> ({ ...s, org_id: getOrgId() })))
        message.success(`${storesData.length}件の店舗を登録しました`)
        fetchStores()
        setIsImportModalVisible(false)
      } else {
        message.warning('有効なデータが見つかりませんでした')
      }
    } catch (error) {
      console.error('Excel取り込みエラー:', error)
      message.error('Excelファイルの取り込みに失敗しました')
    }
    return false // アップロードを停止
  }

  // テーブル列定義
  const columns = [
    {
      title: '店舗番号',
      dataIndex: 'store_code',
      key: 'store_code',
      width: 120,
      sorter: (a: Store, b: Store) => a.store_code.localeCompare(b.store_code),
    },
    {
      title: 'エリア長コード',
      dataIndex: 'area_manager_code',
      key: 'area_manager_code',
      width: 140,
    },
    {
      title: '店舗名',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '舗名',
      dataIndex: 'area_name',
      key: 'area_name',
      width: 120,
    },
    {
      title: '電話番号',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
    },
    {
      title: '郵便番号',
      dataIndex: 'postal_code',
      key: 'postal_code',
      width: 120,
    },
    {
      title: '住所',
      key: 'address',
      width: 300,
      render: (_, record: Store) => (
        <div>
          {record.address1 && <div>{record.address1}</div>}
          {record.address2 && <div>{record.address2}</div>}
        </div>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'アクティブ' : '非アクティブ'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: Store) => (
        <Space>
          <Tooltip title="編集">
            <Button
              type="link"
              size="small"
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
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          管理店舗マスター
        </Title>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadTemplate}
          >
            テンプレートダウンロード
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setIsImportModalVisible(true)}
          >
            Excel取り込み
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新規登録
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchStores}>
            更新
          </Button>
          <Button 
            danger
            onClick={handleResetDatabase}
            loading={loading}
          >
            データベースリセット
          </Button>
        </Space>
      </div>

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="総店舗数"
              value={stores.length}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="アクティブ店舗"
              value={stores.filter(s => s.is_active).length}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="エリア数"
              value={new Set(stores.map(s => s.area_name)).size}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="エリア長数"
              value={new Set(stores.map(s => s.area_manager_code)).size}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 店舗一覧テーブル */}
      <Card title="管理店舗一覧">
        <Table
          columns={columns}
          dataSource={stores}
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

      {/* 編集モーダル */}
      <Modal
        title={editingStore ? '店舗情報編集' : '新規店舗登録'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingStore(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="store_code"
                label="店舗番号"
                rules={[{ required: true, message: '店舗番号を入力してください' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="area_manager_code"
                label="エリア長コード"
                rules={[
                  { required: true, message: 'エリア長コードを入力してください' },
                  { len: 8, message: 'エリア長コードは8桁で入力してください' }
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="店舗名"
                rules={[{ required: true, message: '店舗名を入力してください' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="area_name"
                label="舗名"
                rules={[{ required: true, message: '舗名を入力してください' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
          <Form.Item
            name="phone"
            label="店舗電話番号"
          >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
          <Form.Item
            name="postal_code"
            label="店舗郵便番号"
          >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address1"
            label="店舗住所1"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="address2"
            label="店舗住所2"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="ステータス"
            valuePropName="checked"
            initialValue={true}
          >
            <input type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Excel取り込みモーダル */}
      <Modal
        title="Excel取り込み"
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={null}
        width={500}
      >
        <Alert
          message="取り込み手順"
          description="1. テンプレートをダウンロードしてデータを入力してください。2. ファイルをアップロードしてください。"
          type="info"
          style={{ marginBottom: 16 }}
        />
        
        <Upload.Dragger
          accept=".xlsx,.xls"
          beforeUpload={handleExcelUpload}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">Excelファイルをドラッグ&ドロップまたはクリックしてアップロード</p>
          <p className="ant-upload-hint">
            管理店舗マスターのExcelファイルをアップロードしてください
          </p>
        </Upload.Dragger>
      </Modal>
    </div>
  )
}

export default ManagedStores

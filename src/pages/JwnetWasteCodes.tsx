// ============================================================================
// JWNET廃棄物コード管理ページ
// 作成日: 2025-09-16
// 目的: JWNET廃棄物コードの管理と検索
// ============================================================================

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Row,
  Col,
  Tag,
  Typography,
  Divider,
  Statistic,
  Alert,
  Spin,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import { JwnetWasteCodeRepository } from '@/modules/jwnet-waste-codes/repository'
import type { JwnetWasteCode, JwnetWasteCodeCreate, JwnetWasteCodeUpdate } from '@contracts/v0/schema'

const { Title } = Typography
const { Option } = Select

const JwnetWasteCodes: React.FC = () => {
  const [wasteCodes, setWasteCodes] = useState<JwnetWasteCode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingWasteCode, setEditingWasteCode] = useState<JwnetWasteCode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let allWasteCodes = await JwnetWasteCodeRepository.findMany()
      
      // 検索フィルタリング
      if (searchQuery) {
        allWasteCodes = allWasteCodes.filter(wasteCode =>
          wasteCode.waste_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          wasteCode.waste_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          wasteCode.waste_category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      if (selectedCategory) {
        allWasteCodes = allWasteCodes.filter(wasteCode => wasteCode.waste_category === selectedCategory)
      }
      
      if (selectedType) {
        allWasteCodes = allWasteCodes.filter(wasteCode => wasteCode.waste_type === selectedType)
      }
      
      setWasteCodes(allWasteCodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [searchQuery, selectedCategory, selectedType])

  // 作成・編集
  const handleCreate = () => {
    setEditingWasteCode(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (wasteCode: JwnetWasteCode) => {
    setEditingWasteCode(wasteCode)
    form.setFieldsValue(wasteCode)
    setModalVisible(true)
  }

  const handleSubmit = async (values: JwnetWasteCodeCreate | JwnetWasteCodeUpdate) => {
    try {
      if (editingWasteCode) {
        await JwnetWasteCodeRepository.update(editingWasteCode.id, values)
        message.success('廃棄物コードを更新しました')
      } else {
        await JwnetWasteCodeRepository.create(values as JwnetWasteCodeCreate)
        message.success('廃棄物コードを作成しました')
      }
      
      setModalVisible(false)
      fetchData()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '操作に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await JwnetWasteCodeRepository.delete(id)
      message.success('廃棄物コードを削除しました')
      fetchData()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  const handleCancel = () => {
    setModalVisible(false)
    setEditingWasteCode(null)
    form.resetFields()
  }

  // 統計情報
  const totalCount = wasteCodes.length
  const activeCount = wasteCodes.filter(w => w.is_active).length
  const categoryCount = new Set(wasteCodes.map(w => w.waste_category)).size
  const typeCount = new Set(wasteCodes.map(w => w.waste_type)).size

  // カテゴリとタイプのオプション
  const categories = Array.from(new Set(wasteCodes.map(w => w.waste_category))).sort()
  const types = Array.from(new Set(wasteCodes.map(w => w.waste_type))).sort()

  const columns = [
    {
      title: '廃棄物コード',
      dataIndex: 'waste_code',
      key: 'waste_code',
      width: 120,
      sorter: (a: JwnetWasteCode, b: JwnetWasteCode) => a.waste_code.localeCompare(b.waste_code),
    },
    {
      title: '廃棄物名称',
      dataIndex: 'waste_name',
      key: 'waste_name',
      ellipsis: true,
    },
    {
      title: '廃棄物の種類',
      dataIndex: 'waste_category',
      key: 'waste_category',
      width: 200,
      ellipsis: true,
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      ),
    },
    {
      title: '分類',
      dataIndex: 'waste_type',
      key: 'waste_type',
      width: 120,
      render: (type: string) => {
        const color = type === '産業廃棄物' ? 'red' : 
                    type === '特別管理産業廃棄物' ? 'orange' : 
                    type === '一般廃棄物' ? 'green' : 'default'
        return <Tag color={color}>{type}</Tag>
      },
    },
    {
      title: '単位',
      dataIndex: 'unit_name',
      key: 'unit_name',
      width: 80,
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
      render: (_, record: JwnetWasteCode) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="この廃棄物コードを削除しますか？"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-6">
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
        </div>
      </div>
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
                JWNET廃棄物コード管理
              </Title>
              <p className="text-gray-600 text-sm">
                JWNET連携に必要な廃棄物コードを管理します
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
        {/* 統計カード */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="総廃棄物コード数"
                value={totalCount}
                prefix={<FileExcelOutlined className="text-blue-500" />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="アクティブ"
                value={activeCount}
                prefix={<FileExcelOutlined className="text-green-500" />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="廃棄物の種類"
                value={categoryCount}
                prefix={<FileExcelOutlined className="text-orange-500" />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <Statistic
                title="分類数"
                value={typeCount}
                prefix={<FileExcelOutlined className="text-purple-500" />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 検索・フィルター */}
        <Card className="shadow-sm mb-6">
          <div className="p-4">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Input
                  placeholder="廃棄物コード・名称で検索"
                  prefix={<SearchOutlined />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="廃棄物の種類で絞り込み"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {categories.map(category => (
                    <Option key={category} value={category}>{category}</Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  placeholder="分類で絞り込み"
                  value={selectedType}
                  onChange={setSelectedType}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {types.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    // CSV出力機能（将来実装）
                    message.info('CSV出力機能は準備中です')
                  }}
                  style={{ width: '100%' }}
                >
                  CSV出力
                </Button>
              </Col>
            </Row>
          </div>
        </Card>

        {/* 廃棄物コード一覧テーブル */}
        <Card className="shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900 mb-0">廃棄物コード一覧</h3>
          </div>
          <Table
            columns={columns}
            dataSource={wasteCodes}
            rowKey="id"
            className="custom-table"
            loading={loading}
            pagination={{
              pageSize: 20,
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

      {/* 作成・編集モーダル */}
      <Modal
        title={editingWasteCode ? '廃棄物コード編集' : '廃棄物コード作成'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="waste_code"
                label="廃棄物コード"
                rules={[
                  { required: true, message: '廃棄物コードを入力してください' },
                  { min: 1, max: 50, message: '1-50文字で入力してください' },
                ]}
              >
                <Input placeholder="例: 1500000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit_code"
                label="単位コード"
                rules={[
                  { required: true, message: '単位コードを入力してください' },
                ]}
              >
                <Input placeholder="例: 2" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="waste_name"
            label="廃棄物名称"
            rules={[
              { required: true, message: '廃棄物名称を入力してください' },
            ]}
          >
            <Input placeholder="廃棄物名称を入力してください" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="waste_category"
                label="廃棄物の種類"
                rules={[
                  { required: true, message: '廃棄物の種類を入力してください' },
                ]}
              >
                <Input placeholder="廃棄物の種類を入力してください" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="waste_type"
                label="廃棄物の分類"
                rules={[
                  { required: true, message: '廃棄物の分類を選択してください' },
                ]}
              >
                <Select placeholder="廃棄物の分類を選択してください">
                  <Option value="産業廃棄物">産業廃棄物</Option>
                  <Option value="特別管理産業廃棄物">特別管理産業廃棄物</Option>
                  <Option value="一般廃棄物">一般廃棄物</Option>
                  <Option value="その他">その他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="unit_name"
                label="単位名称"
                rules={[
                  { required: true, message: '単位名称を入力してください' },
                ]}
              >
                <Input placeholder="例: ｍ³" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="ステータス"
                rules={[
                  { required: true, message: 'ステータスを選択してください' },
                ]}
              >
                <Select placeholder="ステータスを選択してください">
                  <Option value={true}>アクティブ</Option>
                  <Option value={false}>非アクティブ</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                {editingWasteCode ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default JwnetWasteCodes
